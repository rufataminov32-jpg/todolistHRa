const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'tf-secret-change-in-prod';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Middleware ──
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Token yaroqsiz' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Faqat admin' });
  next();
}

function parseTask(t) {
  return {
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    subtasks: JSON.parse(t.subtasks || '[]'),
    comments: JSON.parse(t.comments || '[]'),
  };
}

// ── Auth ──
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Login va parol kiritish majburiy' });
  const u = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  const token = jwt.sign(
    { id: u.id, login: u.login, name: u.name, role: u.role },
    SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { id: u.id, login: u.login, name: u.name, role: u.role } });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id,login,name,role,created_at FROM users WHERE id=?').get(req.user.id);
  res.json(u);
});

// ── Tasks ──
app.get('/api/tasks', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all().map(parseTask));
});

app.post('/api/tasks', auth, (req, res) => {
  const {
    title, description = '', status = 'todo', priority = 'medium',
    category = '', assigned_to = null, due_date = null, end_date = null,
    recurring_type = null, recurring_interval = 1,
    tags = [], subtasks = [], comments = []
  } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Sarlavha majburiy' });

  const r = db.prepare(`
    INSERT INTO tasks
      (title,description,status,priority,category,assigned_to,due_date,end_date,
       recurring_type,recurring_interval,tags,subtasks,comments,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(title.trim(), description, status, priority, category, assigned_to,
         due_date, end_date, recurring_type, recurring_interval,
         JSON.stringify(tags), JSON.stringify(subtasks), JSON.stringify(comments), req.user.id);

  res.status(201).json(parseTask(db.prepare('SELECT * FROM tasks WHERE id=?').get(r.lastInsertRowid)));
});

app.put('/api/tasks/:id', auth, (req, res) => {
  if (!db.prepare('SELECT id FROM tasks WHERE id=?').get(req.params.id))
    return res.status(404).json({ error: 'Vazifa topilmadi' });

  const scalar = ['title','description','status','priority','category','assigned_to','due_date','end_date','recurring_type','recurring_interval'];
  const json   = ['tags','subtasks','comments'];
  const sets = {}, vals = [];

  scalar.forEach(f => { if (req.body[f] !== undefined) { sets[f] = '?'; vals.push(req.body[f]); } });
  json.forEach(f   => { if (req.body[f] !== undefined) { sets[f] = '?'; vals.push(JSON.stringify(req.body[f])); } });
  sets['updated_at'] = '?'; vals.push(new Date().toISOString());

  const clause = Object.keys(sets).map(k => `${k}=?`).join(',');
  db.prepare(`UPDATE tasks SET ${clause} WHERE id=?`).run(...vals, req.params.id);
  res.json(parseTask(db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id)));
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  const r = db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Vazifa topilmadi' });
  res.json({ ok: true });
});

// ── Users (admin) ──
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id,login,name,role,created_at FROM users ORDER BY id').all());
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { login, password, name, role = 'viewer' } = req.body || {};
  if (!login || !password || !name) return res.status(400).json({ error: 'Login, parol va ism kerak' });
  try {
    const r = db.prepare('INSERT INTO users (login,password_hash,name,role) VALUES (?,?,?,?)')
      .run(login, bcrypt.hashSync(password, 10), name, role);
    res.status(201).json(db.prepare('SELECT id,login,name,role,created_at FROM users WHERE id=?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Bu login band' });
    throw e;
  }
});

app.put('/api/users/:id/password', auth, adminOnly, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Yangi parol kerak' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
  const r = db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json({ ok: true });
});

// ── Config ──
app.get('/api/config', auth, (req, res) => {
  const cfg = {};
  db.prepare('SELECT key,value FROM config').all().forEach(r => { cfg[r.key] = JSON.parse(r.value); });
  res.json(cfg);
});

app.put('/api/config', auth, adminOnly, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO config (key,value) VALUES (?,?)');
  db.transaction(entries => entries.forEach(([k, v]) => upsert.run(k, JSON.stringify(v))))(Object.entries(req.body));
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ TaskFlow: http://localhost:${PORT}`));
