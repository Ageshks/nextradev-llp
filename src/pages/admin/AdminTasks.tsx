import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';
import { assignTask, listEmployees, listTasks, subscribeWorkforce, type WorkforceRow } from '../../utils/workforceApi';

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800';

export default function AdminTasks() {
  const [employees, setEmployees] = useState<WorkforceRow[]>([]);
  const [tasks, setTasks] = useState<WorkforceRow[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [staff, assigned] = await Promise.all([listEmployees(), listTasks()]);
      setEmployees(staff.filter(person => person.active)); setTasks(assigned); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workforce data could not be loaded.'); }
  }, []);

  useEffect(() => { void refresh(); const unsubscribe = subscribeWorkforce(() => { void refresh(); }); return unsubscribe; }, [refresh]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await assignTask({ employeeId, title: title.trim(), description: description.trim(), dueDate });
      setTitle(''); setDescription(''); setDueDate(''); setMessage('Task assigned.'); await refresh();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not assign task.'); }
    finally { setSaving(false); }
  };

  return <div className="workspace-content employee-operations">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/> TEAM DELIVERY</div><h1>Task management</h1><p>Assign work and review completion reports from your team.</p></div></div>
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <form onSubmit={submit} className="panel h-fit space-y-3"><div className="panel-heading"><div><h2>Assign a task</h2><p>Choose an employee and set the expected outcome.</p></div><ClipboardList size={18}/></div>
        <label className="block text-sm">Employee<select required className={`${field} mt-1`} value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">Choose employee</option>{employees.map(employee => <option key={employee.uid} value={employee.uid}>{employee.name} · {employee.email}</option>)}</select></label>
        <label className="block text-sm">Task title<input required maxLength={180} className={`${field} mt-1`} value={title} onChange={event => setTitle(event.target.value)}/></label>
        <label className="block text-sm">Description and expected outcome<textarea required maxLength={5000} rows={4} className={`${field} mt-1`} value={description} onChange={event => setDescription(event.target.value)}/></label>
        <label className="block text-sm">Due date<input className={`${field} mt-1`} type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/></label>
        <button disabled={saving || !employees.length} className="primary-action disabled:opacity-50">{saving ? 'Assigning…' : 'Assign task'}</button>
        {!employees.length && !error && <p className="text-xs text-slate-500">Add an active employee before assigning tasks.</p>}{message&&<p role="status" className="text-sm">{message}</p>}
      </form>
      <section className="space-y-3"><div className="panel-heading"><div><h2>Assigned tasks</h2><p>{tasks.length} task{tasks.length===1?'':'s'} · updates appear live.</p></div></div>
        {tasks.map(task => <article key={task.id} className="panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{task.title}</h3><p className="mt-1 text-sm text-slate-500">{employees.find(employee=>employee.uid===task.employeeId)?.name||task.employeeId}{task.dueDate&&` · Due ${task.dueDate}`}</p></div><span className="status-pill status-blue capitalize">{String(task.status||'pending').replace('-',' ')}</span></div><p className="mt-3 text-sm">{task.description}</p>{task.startedAt&&<p className="mt-2 text-xs text-slate-500">Started {new Date(task.startedAt).toLocaleString()}</p>}{task.report&&<div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong><CheckCircle2 size={15} className="mr-1 inline"/>Completion report</strong><p className="mt-1">{task.report}</p></div>}{!task.report&&task.status==='pending'&&<p className="mt-3 text-xs text-slate-500"><Circle size={13} className="mr-1 inline"/>Waiting for employee to start.</p>}</article>)}
        {!tasks.length&&!error&&<div className="panel text-sm text-slate-500">No tasks have been assigned.</div>}
      </section>
    </div>
  </div>;
}
