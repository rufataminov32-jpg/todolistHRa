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

// ── Auth ──
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Login va parol kiritish majburiy' });
  const u = db.getUserByLogin(login);
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  const token = jwt.sign(
    { id: u.id, login: u.login, name: u.name, role: u.role },
    SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { id: u.id, login: u.login, name: u.name, role: u.role } });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.getUser(req.user.id);
  if (!u) return res.status(404).json({ error: 'Topilmadi' });
  const { password_hash, ...safe } = u;
  res.json(safe);
});

// ── Tasks ──
app.get('/api/tasks', auth, (req, res) => res.json(db.getTasks()));

app.post('/api/tasks', auth, (req, res) => {
  const { title, description='', status='todo', priority='medium', category='',
          assigned_to=null, due_date=null, end_date=null,
          recurring_type=null, recurring_interval=1,
          tags=[], subtasks=[], comments=[] } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Sarlavha majburiy' });
  const task = db.addTask({
    title: title.trim(), description, status, priority, category,
    assigned_to, due_date, end_date, recurring_type, recurring_interval,
    tags, subtasks, comments, created_by: req.user.id
  });
  res.status(201).json(task);
});

app.put('/api/tasks/:id', auth, (req, res) => {
  if (!db.getTask(req.params.id)) return res.status(404).json({ error: 'Vazifa topilmadi' });
  const allowed = ['title','description','status','priority','category','assigned_to',
                   'due_date','end_date','recurring_type','recurring_interval','tags','subtasks','comments'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const updated = db.updateTask(req.params.id, updates);
  res.json(updated);
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  if (!db.deleteTask(req.params.id)) return res.status(404).json({ error: 'Vazifa topilmadi' });
  res.json({ ok: true });
});

// ── Users ──
app.get('/api/users', auth, adminOnly, (req, res) => res.json(db.getUsers()));

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { login, password, name, role='viewer' } = req.body || {};
  if (!login || !password || !name) return res.status(400).json({ error: 'Login, parol va ism kerak' });
  const existing = db.getUserByLogin(login);
  if (existing) return res.status(409).json({ error: 'Bu login band' });
  const user = db.addUser({ login, password_hash: bcrypt.hashSync(password, 10), name, role });
  res.status(201).json(user);
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
  if (!db.deleteUser(req.params.id)) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json({ ok: true });
});

// ── Config ──
app.get('/api/config', auth, (req, res) => res.json(db.getConfig()));

app.put('/api/config', auth, adminOnly, (req, res) => {
  res.json(db.updateConfig(req.body));
});

// SPA fallback
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ TaskFlow: http://localhost:${PORT}`));
