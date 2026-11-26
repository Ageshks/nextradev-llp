import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BriefcaseBusiness, CalendarDays, ClipboardList, Clock3, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { useAuthListener } from '../../context/AuthContext';
import { listAttendance, listCheckoutRequests, listEmployees, listLeaves, listTasks, subscribeWorkforce, type WorkforceRow } from '../../utils/workforceApi';
import './AdminWorkspace.css';

const dateToday = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const nav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Employees & attendance', to: '/admin/employees', icon: Users },
  { label: 'Task management', to: '/admin/tasks', icon: ClipboardList },
  { label: 'Website content', to: '/admin/internships', icon: BriefcaseBusiness },
];

export default function AdminWorkspace() {
  const { signOut, user } = useAuthListener();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<WorkforceRow[]>([]);
  const [attendance, setAttendance] = useState<WorkforceRow[]>([]);
  const [tasks, setTasks] = useState<WorkforceRow[]>([]);
  const [leaves, setLeaves] = useState<WorkforceRow[]>([]);
  const [checkoutRequests, setCheckoutRequests] = useState<WorkforceRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([listEmployees(), listAttendance(dateToday()), listTasks(), listLeaves(), listCheckoutRequests()]);
    const issues: string[] = [];
    const setters = [setEmployees, setAttendance, setTasks, setLeaves, setCheckoutRequests];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') setters[index](result.value);
      else issues.push(result.reason instanceof Error ? result.reason.message : 'Some dashboard data could not be loaded.');
    });
    setError(issues.join(' ')); setLoading(false);
  }, []);

  useEffect(() => { void refresh(); return subscribeWorkforce(() => { void refresh(); }); }, [refresh]);

  const checkedIn = attendance.filter(record => record.checkIn && !record.checkOut).length;
  const activeTasks = tasks.filter(task => task.status !== 'completed').length;
  const todayAttendance: WorkforceRow[] = attendance.map(record => ({ ...record, employee: employees.find(person => person.uid === record.employeeId) }));
  const leavePending = leaves.filter(leave => leave.status === 'pending');
  const adminName = user?.displayName || user?.email?.split('@')[0] || 'Administrator';
  const logout = async () => { await signOut(); navigate('/login'); };

  return <div className="workspace-shell">
    <aside className={`workspace-sidebar ${menuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark">N</div><div><strong>NEXTRADEV</strong><span>Company workspace</span></div><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-switch"><span className="workspace-icon"><BriefcaseBusiness size={17}/></span><span><b>Nextradev Technologies</b><small>Operations</small></span></div>
      <nav className="sidebar-nav" aria-label="Admin navigation"><div className="nav-group"><p className="nav-group-title">WORKSPACE</p>{nav.map(item => { const Icon=item.icon; return <Link key={item.to} to={item.to} onClick={()=>setMenuOpen(false)} className={`sidebar-link ${item.to==='/admin'?'active':''}`}><Icon size={18}/><span>{item.label}</span></Link>; })}</div></nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><span className="avatar avatar-blue avatar-md">{adminName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span><span><b>{adminName}</b><small>Firebase account</small></span><button aria-label="Sign out" onClick={logout}><LogOut size={16}/></button></div></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu/></button><div className="breadcrumbs"><span>Workspace</span><Activity size={14}/><b>Dashboard</b></div><div className="topbar-actions"><span className="profile-button"><span>{adminName}</span></span></div></header>
      <main className="workspace-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/>{new Intl.DateTimeFormat('en-IN',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date()).toUpperCase()}</div><h1>Company operations</h1><p>Live employee, attendance, leave, and task activity.</p></div></div>
        {error&&<p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <div className="kpi-grid">
          {[[Users,'Active employees',employees.filter(person=>person.active).length,'icon-blue'],[Clock3,'Checked in today',checkedIn,'icon-violet'],[ClipboardList,'Open tasks',activeTasks,'icon-amber'],[CalendarDays,'Leave awaiting review',leavePending.length,'icon-mint']].map(([Icon,label,value,tone]:any)=><article className="kpi-card" key={label}><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={17}/></span></div><div className="kpi-value">{loading?'—':value}</div></article>)}
        </div>
        <div className="dashboard-grid">
          <section className="panel"><div className="panel-heading"><div><h2>Today’s attendance</h2><p>Live check-in status · {dateToday()}</p></div><Link className="text-link" to="/admin/employees">View attendance <span>→</span></Link></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Employee</th><th>Check in</th><th>Check out</th><th>Status</th></tr></thead><tbody>{todayAttendance.map(record=><tr key={record.id}><td><b>{record.employee?.name||record.employee?.email||record.employeeId}</b><small>{record.employee?.department||''}</small></td><td>{record.checkIn?new Date(record.checkIn).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td><td>{record.checkOut?new Date(record.checkOut).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):record.checkIn?'On shift':'—'}</td><td><span className="status-pill status-blue capitalize">{String(record.status||'present').replace('-',' ')}</span></td></tr>)}</tbody></table></div>{!loading&&!todayAttendance.length&&<p className="employee-empty">No attendance has been recorded today.</p>}</section>
          <section className="panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Pending employee actions</p></div></div>
            <div className="quick-actions"><Link to="/admin/employees"><span className="quick-icon quick-amber"><MapPinIcon/></span><span><b>Checkout approvals</b><small>{checkoutRequests.length} pending</small></span><span>→</span></Link><Link to="/admin/employees"><span className="quick-icon quick-violet"><CalendarDays size={18}/></span><span><b>Leave requests</b><small>{leavePending.length} awaiting review</small></span><span>→</span></Link><Link to="/admin/tasks"><span className="quick-icon quick-blue"><ClipboardList size={18}/></span><span><b>Task reports</b><small>{tasks.filter(task=>task.status==='completed'&&task.report).length} submitted</small></span><span>→</span></Link></div>
          </section>
        </div>
        <section className="panel mt-4"><div className="panel-heading"><div><h2>Recently updated tasks</h2><p>Updates from the live workforce database</p></div><Link className="text-link" to="/admin/tasks">All tasks →</Link></div>{tasks.slice(0,6).map(task=><div key={task.id} className="employee-request-row"><div><strong>{task.title}</strong><p>{employees.find(person=>person.uid===task.employeeId)?.name||task.employeeId} · Updated {new Date(task.updatedAt||task.createdAt).toLocaleString()}</p></div><span className="status-pill status-blue capitalize">{String(task.status||'pending').replace('-',' ')}</span></div>)}{!loading&&!tasks.length&&<p className="employee-empty">No tasks have been assigned.</p>}</section>
        <footer className="workspace-footer"><span>© {new Date().getFullYear()} Nextradev Technologies LLP</span><span>Live company records</span></footer>
      </main>
    </div>
    {menuOpen&&<button className="sidebar-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"/>}
  </div>;
}

function MapPinIcon(){return <span className="text-base" aria-hidden="true">⌖</span>}
