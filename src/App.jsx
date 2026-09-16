import { useState, useMemo } from 'react'
import './App.css'

const PRIORITIES = ['high', 'medium', 'low', 'none']
const PRIORITY_LABELS = { high: 'Yuqori', medium: 'O\'rta', low: 'Past', none: 'Oddiy' }
const TABS = ['Barchasi', 'Bugun', 'Tugagan']

const CATEGORIES = ['Shaxsiy', 'Ish', 'Oila', 'Uy']

const seed = [
  { id: 1, title: 'Loyiha taqdimotini tayyorlash', priority: 'high', category: 'Ish', done: false, date: today(), note: '' },
  { id: 2, title: 'Dorilarni olish', priority: 'medium', category: 'Shaxsiy', done: false, date: today(), note: '' },
  { id: 3, title: 'Sport zali — cardio 30 daqiqa', priority: 'low', category: 'Shaxsiy', done: true, date: today(), note: '' },
  { id: 4, title: 'Hisobot yuborish', priority: 'high', category: 'Ish', done: false, date: tomorrow(), note: '' },
  { id: 5, title: 'Oilaga qo\'ng\'iroq', priority: 'none', category: 'Oila', done: false, date: today(), note: '' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const t = new Date(today() + 'T00:00:00')
  const diff = Math.round((d - t) / 86400000)
  if (diff === 0) return { label: 'Bugun', cls: 'due-soon' }
  if (diff === 1) return { label: 'Ertaga', cls: '' }
  if (diff === -1) return { label: 'Kecha', cls: 'overdue' }
  if (diff < 0) return { label: `${Math.abs(diff)} kun o'tdi`, cls: 'overdue' }
  return { label: `${diff} kun qoldi`, cls: '' }
}

function nextId(tasks) {
  return tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1
}

export default function App() {
  const [tasks, setTasks] = useState(seed)
  const [tab, setTab] = useState('Barchasi')
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('none')
  const [newDate, setNewDate] = useState(today())
  const [newCategory, setNewCategory] = useState('Shaxsiy')

  const visibleTasks = useMemo(() => {
    const t = today()
    if (tab === 'Bugun') return tasks.filter(x => x.date === t && !x.done)
    if (tab === 'Tugagan') return tasks.filter(x => x.done)
    return tasks
  }, [tasks, tab])

  const todayCount = tasks.filter(x => x.date === today() && !x.done).length
  const doneCount = tasks.filter(x => x.done).length
  const overdueCount = tasks.filter(x => !x.done && x.date < today()).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  function toggleDone(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function addTask() {
    if (!newTitle.trim()) return
    setTasks(prev => [
      ...prev,
      { id: nextId(prev), title: newTitle.trim(), priority: newPriority, category: newCategory, done: false, date: newDate, note: '' }
    ])
    setNewTitle('')
    setNewPriority('none')
    setNewDate(today())
    setNewCategory('Shaxsiy')
    setAdding(false)
  }

  const grouped = PRIORITIES.map(p => ({
    priority: p,
    tasks: visibleTasks.filter(t => t.priority === p)
  })).filter(g => g.tasks.length > 0)

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <h1>Mening vazifalarim</h1>
          <p>{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="header-avatar">R</div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat-card today">
          <div className="label">Bugun</div>
          <div className="value">{todayCount}</div>
        </div>
        <div className="stat-card done">
          <div className="label">Bajarildi</div>
          <div className="value">{doneCount}</div>
        </div>
        <div className="stat-card overdue">
          <div className="label">Kechikdi</div>
          <div className="value">{overdueCount}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-top">
          <span>Umumiy progress</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Task Groups */}
      {grouped.length === 0 && (
        <div className="empty">Hech qanday vazifa yo'q ✓</div>
      )}

      {grouped.map(({ priority, tasks: ptasks }) => (
        <div className="section" key={priority}>
          <div className="section-header">
            <div className="section-label">
              <span className={`priority-dot ${priority}`} />
              {PRIORITY_LABELS[priority]}
            </div>
            <span className="section-count">{ptasks.length}</span>
          </div>
          {ptasks.map(task => {
            const dateInfo = formatDate(task.date)
            return (
              <div key={task.id} className={`task-card${task.done ? ' completed' : ''}`}>
                <button className={`check-btn${task.done ? ' checked' : ''}`} onClick={() => toggleDone(task.id)}>
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="task-body">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    {task.category && (
                      <span className="meta-chip">📁 {task.category}</span>
                    )}
                    {dateInfo && (
                      <span className={`meta-chip ${dateInfo.cls}`}>
                        📅 {dateInfo.label}
                      </span>
                    )}
                  </div>
                </div>
                <button className="task-delete" onClick={() => deleteTask(task.id)}>×</button>
              </div>
            )
          })}
        </div>
      ))}

      {/* FAB */}
      {!adding && (
        <button className="fab" onClick={() => setAdding(true)}>+</button>
      )}

      {/* Add panel */}
      <div className={`add-panel${adding ? '' : ' hidden'}`}>
        <div className="add-input-row">
          <span style={{ color: 'var(--text2)', fontSize: 18 }}>○</span>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Yangi vazifa qo'shing..."
          />
        </div>
        <div className="add-options">
          {/* Priority */}
          {['high', 'medium', 'low'].map(p => (
            <button
              key={p}
              className={`opt-btn ${p}${newPriority === p ? ' selected' : ''}`}
              onClick={() => setNewPriority(newPriority === p ? 'none' : p)}
            >
              {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {PRIORITY_LABELS[p]}
            </button>
          ))}

          {/* Date */}
          <label className="opt-btn" style={{ cursor: 'pointer' }}>
            📅
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ width: 0, opacity: 0, position: 'absolute' }}
            />
            {newDate === today() ? 'Bugun' : newDate === tomorrow() ? 'Ertaga' : newDate}
          </label>

          {/* Category */}
          <select
            className="opt-btn"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={{ background: 'var(--surface2)', appearance: 'none' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button className="submit-btn" onClick={addTask}>Qo'sh</button>
        </div>
      </div>

      {adding && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setAdding(false)}
        />
      )}
    </div>
  )
}
