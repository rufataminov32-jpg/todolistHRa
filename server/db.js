const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const FILE = path.join(__dirname, 'data.json');

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return null; }
}

function write(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function init() {
  if (read()) return;
  write({
    _uid: 2, _tid: 1,
    users: [{
      id: 1, login: 'admin',
      password_hash: bcrypt.hashSync('admin123', 10),
      name: 'Administrator', role: 'admin',
      created_at: new Date().toISOString()
    }],
    tasks: [],
    config: { categories: ['Shaxsiy', 'Ish', 'Oila', 'Uy'] }
  });
}

const db = {
  getUserByLogin: (login) => read().users.find(u => u.login === login),
  getUser:  (id)   => read().users.find(u => u.id == id),
  getUsers: ()     => read().users.map(({ password_hash, ...u }) => u),

  addUser: (user) => {
    const data = read();
    user.id = data._uid++;
    user.created_at = new Date().toISOString();
    data.users.push(user);
    write(data);
    const { password_hash, ...safe } = user;
    return safe;
  },
  deleteUser: (id) => {
    const data = read();
    const i = data.users.findIndex(u => u.id == id);
    if (i === -1) return false;
    data.users.splice(i, 1);
    write(data);
    return true;
  },

  getTasks: () => read().tasks,
  getTask:  (id) => read().tasks.find(t => t.id == id),

  addTask: (task) => {
    const data = read();
    task.id = data._tid++;
    task.created_at = task.updated_at = new Date().toISOString();
    data.tasks.unshift(task);
    write(data);
    return task;
  },
  updateTask: (id, updates) => {
    const data = read();
    const i = data.tasks.findIndex(t => t.id == id);
    if (i === -1) return null;
    data.tasks[i] = { ...data.tasks[i], ...updates, updated_at: new Date().toISOString() };
    write(data);
    return data.tasks[i];
  },
  deleteTask: (id) => {
    const data = read();
    const i = data.tasks.findIndex(t => t.id == id);
    if (i === -1) return false;
    data.tasks.splice(i, 1);
    write(data);
    return true;
  },

  getConfig: () => read().config,
  updateConfig: (updates) => {
    const data = read();
    Object.assign(data.config, updates);
    write(data);
    return data.config;
  }
};

init();
module.exports = db;
