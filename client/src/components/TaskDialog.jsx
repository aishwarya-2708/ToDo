import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function TaskDialog({ task, onClose, onSave, busy }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    setForm(task ? { title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate || '' } : { title: '', description: '', priority: 'medium', dueDate: '' });
  }, [task]);
  const set = (key) => (event) => setForm((v) => ({ ...v, [key]: event.target.value }));
  async function submit(event) { event.preventDefault(); setError(''); try { await onSave({ ...form, dueDate: form.dueDate || null }); } catch (err) { setError(err.message); } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-heading"><div><div className="eyebrow">TASK DETAILS</div><h2 id="dialog-title">{task ? 'Edit task' : 'Make a new plan'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <form onSubmit={submit} className="dialog-form">
        <label className="field"><span>Task name</span><input autoFocus value={form.title} onChange={set('title')} placeholder="What needs to get done?" required maxLength={160} /></label>
        <label className="field"><span>Description <small>Optional</small></span><textarea value={form.description} onChange={set('description')} placeholder="Add a few details…" rows={3} maxLength={2000} /></label>
        <div className="form-row"><label className="field"><span>Priority</span><select value={form.priority} onChange={set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="field"><span>Due date <small>Optional</small></span><input type="date" value={form.dueDate} onChange={set('dueDate')} /></label></div>
        {error && <div role="alert" className="form-error">{error}</div>}
        <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button></div>
      </form>
    </section>
  </div>;
}
