import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, Clock3, ListTodo, LogOut, MoreHorizontal, Plus, Search, SlidersHorizontal, Sparkles, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { api } from '../api.js';
import { TaskDialog } from './TaskDialog.jsx';

const labels = { all: 'All tasks', pending: 'To do', completed: 'Completed' };
const dateLabel = (date) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function Dashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ count: 0, page: 1, limit: 20, pageCount: 0 });
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [searchInput]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [taskResult, statsResult] = await Promise.all([api.tasks({ search, status, ...(priority ? { priority } : {}), sort, order, page, limit: 20 }), api.stats()]);
      setTasks(taskResult.data); setMeta(taskResult.meta); setStats(statsResult.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [search, status, priority, sort, order, page]);
  useEffect(() => { refresh(); }, [refresh]);

  async function saveTask(data) {
    setBusy(true);
    try { if (dialog) await api.updateTask(dialog.id, data); else await api.createTask(data); setDialog(undefined); await refresh(); }
    finally { setBusy(false); }
  }
  async function toggleTask(task) {
    setBusy(true); setError('');
    try { await api.updateTask(task.id, { completed: !task.completed }); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return;
    setBusy(true); setError('');
    try { await api.deleteTask(task.id); if (tasks.length === 1 && page > 1) setPage(page - 1); else await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setError('');
    try { await api.logout(); onLogout(); }
    catch (err) { setError(err.message); }
  }
  const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const overdue = (task) => !task.completed && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10);
  const doneRatio = stats?.total ? Math.round(stats.completed / stats.total * 100) : 0;

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-mark">T</span><span>taskmate</span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation"><button className="nav-item active"><ListTodo size={18} /><span>My tasks</span><span className="nav-count">{stats?.pending ?? '–'}</span></button><button className="nav-item" onClick={() => setStatus('completed')}><CheckCheck size={18} /><span>Completed</span></button></nav>
      <div className="sidebar-note"><div className="note-icon"><Sparkles size={17} /></div><div><strong>Keep your momentum</strong><p>Little by little, a little becomes a lot.</p></div></div>
      <div className="sidebar-profile"><div className="profile-avatar">{initials}</div><div className="profile-copy"><strong>{user.name}</strong><span>Personal workspace</span></div><button className="icon-button profile-menu" aria-label="Account menu" onClick={() => setMenuOpen((v) => !v)}><MoreHorizontal size={20} /></button>{menuOpen && <div className="account-menu"><button onClick={logout}><LogOut size={16} /> Sign out</button></div>}</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand brand"><span className="brand-mark">T</span><span>taskmate</span></div><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>My tasks</strong></div><div className="topbar-date"><span className="date-dot" />{today}</div><button className="mobile-logout icon-button" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> YOUR PERSONAL OVERVIEW</div><h1>{greeting()}, {user.name.split(' ')[0]}<span className="wave">✳</span></h1><p>Here’s what’s on your plate today.</p></div><button className="button button-primary create-button" onClick={() => setDialog(null)}><Plus size={18} /> New task</button></section>
        <section className="stats-grid" aria-label="Task statistics">
          <StatCard title="Total tasks" value={stats?.total} icon={<ListTodo size={18} />} tone="blue" foot="Across your workspace" />
          <StatCard title="To do" value={stats?.pending} icon={<Circle size={18} />} tone="amber" foot="Ready when you are" />
          <StatCard title="Completed" value={stats?.completed} icon={<CircleCheck size={18} />} tone="green" foot={stats?.total ? `${doneRatio}% of all tasks` : 'Your wins live here'} />
          <StatCard title="Overdue" value={stats?.overdue} icon={<Clock3 size={18} />} tone="rose" foot="A gentle nudge to revisit" />
        </section>
        <section className="tasks-panel">
          <div className="panel-heading"><div><div className="section-title-line"><h2>Your tasks</h2><span className="result-count">{meta.count}</span></div><p>A thoughtful list for a more focused day.</p></div><div className="progress-mini"><div className="progress-ring"><span>{doneRatio}%</span></div><div><span>Progress</span><strong>{stats?.completed ?? 0} of {stats?.total ?? 0} done</strong></div></div></div>
          <div className="toolbar"><div className="task-tabs" role="tablist" aria-label="Filter tasks">{Object.entries(labels).map(([key, text]) => <button key={key} role="tab" aria-selected={status === key} className={status === key ? 'tab active' : 'tab'} onClick={() => { setStatus(key); setPage(1); }}>{text}{key === 'pending' && stats ? <span className="tab-number">{stats.pending}</span> : null}</button>)}</div><div className="toolbar-controls"><label className="search-box"><Search size={16} /><input aria-label="Search tasks" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tasks" />{searchInput && <button aria-label="Clear search" onClick={() => setSearchInput('')}><X size={14} /></button>}</label><label className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Filter by priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}><option value="">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><ChevronDown size={14} /></label><label className="select-wrap sort-select"><select aria-label="Sort tasks" value={`${sort}:${order}`} onChange={(e) => { const [s, o] = e.target.value.split(':'); setSort(s); setOrder(o); setPage(1); }}><option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="dueDate:asc">Due date soonest</option><option value="dueDate:desc">Due date latest</option><option value="priority:desc">Priority high to low</option><option value="priority:asc">Priority low to high</option><option value="title:asc">Name A–Z</option><option value="title:desc">Name Z–A</option></select><ChevronDown size={14} /></label></div></div>
          {error && <div role="alert" className="inline-error">{error}<button onClick={refresh}>Try again</button></div>}
          {loading ? <div className="loading-list"><span className="spinner" />Loading your tasks…</div> : tasks.length ? <div className="task-list">{tasks.map((task) => <TaskRow key={task.id} task={task} isOverdue={overdue(task)} onToggle={toggleTask} onEdit={() => setDialog(task)} onDelete={() => deleteTask(task)} busy={busy} />)}</div> : <EmptyState searching={!!search || !!priority} status={status} onCreate={() => setDialog(null)} onClear={() => { setSearchInput(''); setSearch(''); setPriority(''); setStatus('all'); }} />}
          {meta.pageCount > 1 && <div className="pagination"><span>Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.count)} of {meta.count}</span><div><button className="icon-button page-button" disabled={page <= 1} onClick={() => setPage((v) => v - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {meta.page} of {meta.pageCount}</span><button className="icon-button page-button" disabled={page >= meta.pageCount} onClick={() => setPage((v) => v + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div>}
        </section>
        <footer className="dashboard-footer"><span><Target size={15} /> One thing at a time.</span><span>Made for your momentum <span className="footer-star">✳</span></span></footer>
      </div>
    </main>
    {dialog !== undefined && <TaskDialog task={dialog} onClose={() => setDialog(undefined)} onSave={saveTask} busy={busy} />}
  </div>;
}

function StatCard({ title, value, icon, tone, foot }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value ?? <span className="skeleton-value" />}</div><div className="stat-foot"><span className="stat-foot-mark"><TrendingUp size={12} /></span>{foot}</div></article>;
}

function TaskRow({ task, isOverdue, onToggle, onEdit, onDelete, busy }) {
  const [open, setOpen] = useState(false);
  return <article className={`task-row ${task.completed ? 'is-completed' : ''}`}>
    <button className={`task-check ${task.completed ? 'checked' : ''}`} onClick={() => onToggle(task)} disabled={busy} aria-label={task.completed ? `Mark ${task.title} as to do` : `Complete ${task.title}`}>{task.completed && <Check size={14} />}</button>
    <div className="task-main"><button className="task-title" onClick={onEdit}>{task.title}</button>{task.description && <p className="task-description">{task.description}</p>}<div className="task-meta"><span className={`priority-tag ${task.priority}`}><i />{task.priority}</span>{task.dueDate && <span className={`due-tag ${isOverdue ? 'overdue' : ''}`}><Clock3 size={13} />{isOverdue ? 'Overdue · ' : 'Due '}{dateLabel(task.dueDate)}</span>}</div></div>
    <div className="task-actions"><button className="icon-button edit-action" onClick={onEdit}>Edit</button><div className="row-menu-wrap"><button className="icon-button row-menu-button" onClick={() => setOpen((v) => !v)} aria-label={`More options for ${task.title}`}><MoreHorizontal size={19} /></button>{open && <div className="row-menu"><button onClick={() => { setOpen(false); onEdit(); }}>Edit task</button><button className="delete-option" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={14} /> Delete</button></div>}</div></div>
  </article>;
}

function EmptyState({ searching, status, onCreate, onClear }) {
  return <div className="empty-state"><div className="empty-art"><span><Check size={24} /></span><i /><i /><i /></div><h3>{searching ? 'No tasks found' : status === 'completed' ? 'Your wins are waiting' : status === 'pending' ? 'You’re all caught up' : 'A fresh start feels good'}</h3><p>{searching ? 'Try another search or adjust your filters.' : status === 'completed' ? 'Completed tasks will show up here.' : status === 'pending' ? 'There’s nothing left on your list for now.' : 'Add your first task and give your day a little direction.'}</p>{searching ? <button className="button button-quiet" onClick={onClear}>Clear filters</button> : status === 'all' && <button className="button button-primary" onClick={onCreate}><Plus size={16} /> Add a task</button>}</div>;
}
