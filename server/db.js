const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'taskflow.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'viewer' CHECK(role IN ('admin','viewer')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT '',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT,
    end_date TEXT,
    recurring_type TEXT,
    recurring_interval INTEGER DEFAULT 1,
    tags TEXT DEFAULT '[]',
    subtasks TEXT DEFAULT '[]',
    comments TEXT DEFAULT '[]',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const { c } = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (c === 0) {
  db.prepare('INSERT INTO users (login,password_hash,name,role) VALUES (?,?,?,?)')
    .run('admin', bcrypt.hashSync('admin123', 10), 'Administrator', 'admin');
}

if (!db.prepare("SELECT value FROM config WHERE key='categories'").get()) {
  db.prepare("INSERT INTO config (key,value) VALUES ('categories',?)")
    .run(JSON.stringify(['Shaxsiy', 'Ish', 'Oila', 'Uy']));
}

module.exports = db;
