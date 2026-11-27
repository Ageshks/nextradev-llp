import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BriefcaseBusiness, Building2, ChevronDown, ClipboardList, DollarSign, LayoutDashboard, LogOut, Menu, Moon, Search, Users, X, Bell, Target, PanelLeftClose, PanelLeftOpen, ListChecks } from 'lucide-react';
import { useAuthListener } from '../context/AuthContext';
import { listEnterpriseNotifications, markEnterpriseNotificationRead, type EnterpriseRow } from '../utils/enterpriseApi';
import { getEmployeeProfile, subscribeWorkforce } from '../utils/workforceApi';
import '../pages/admin/AdminWorkspace.css';

const navigation = [
  { group: 'OVERVIEW', items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard }] },
  { group: 'ORGANIZATION', items: [{ label: 'Employees & attendance', to: '/admin/employees', icon: Users }, { label: 'Departments', to: '/admin/departments', icon: Building2 }, { label: 'Payroll', to: '/admin/payroll', icon: DollarSign }, { label: 'Task management', to: '/admin/tasks', icon: ClipboardList }] },
  { group: 'BUSINESS', items: [{ label: 'Projects', to: '/admin/projects', icon: BriefcaseBusiness }, { label: 'Clients', to: '/admin/clients', icon: Building2 }, { label: 'Leads & enquiries', to: '/admin/leads', icon: Target }, { label: 'Proposals', to: '/admin/proposals', icon: ClipboardList }, { label: 'Contracts', to: '/admin/contracts', icon: BriefcaseBusiness }] },
  { group: 'OPERATIONS', items: [{ label: 'Support tickets', to: '/admin/support', icon: Activity }] },
  { group: 'FINANCE', items: [{ label: 'Finance', to: '/admin/finance', icon: DollarSign }] },
  { group: 'ADMINISTRATION', items: [{ label: 'Activity logs', to: '/admin/activity', icon: ListChecks }, { label: 'Website content', to: '/admin/internships', icon: Activity }] },
];

export default function AdminShell() {
  const { signOut, user } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<EnterpriseRow[]>([]);
  const [role, setRole] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [dark, setDark] = useState(false);
  const page = navigation.flatMap(group => group.items).find(item => item.to === location.pathname)?.label || 'Workspace';
  useEffect(() => { const load = () => listEnterpriseNotifications().then(setNotifications).catch(() => setNotifications([])); void load(); getEmployeeProfile().then(profile => setRole(String(profile.role || '').toLowerCase())).catch(() => setRole('employee')); return subscribeWorkforce(load); }, []);
  const logout = async () => { await signOut(); navigate('/login'); };
  const unread = notifications.filter(item => !item.readAt).length;
  const roleAccess: Record<string, string[]> = {
    admin: ['Dashboard','Employees & attendance','Departments','Payroll','Task management','Projects','Clients','Leads & enquiries','Proposals','Contracts','Support tickets','Finance','Activity logs','Website content'],
    super_admin: ['Dashboard','Employees & attendance','Departments','Payroll','Task management','Projects','Clients','Leads & enquiries','Proposals','Contracts','Support tickets','Finance','Activity logs','Website content'],
    'super admin': ['Dashboard','Employees & attendance','Departments','Payroll','Task management','Projects','Clients','Leads & enquiries','Proposals','Contracts','Support tickets','Finance','Activity logs','Website content'],
    hr: ['Dashboard','Employees & attendance','Departments','Payroll','Task management','Website content'], hr_manager: ['Dashboard','Employees & attendance','Departments','Payroll','Task management','Website content'],
    project_manager: ['Dashboard','Task management','Projects','Clients','Support tickets'], team_leader: ['Dashboard','Task management','Projects'],
    sales_executive: ['Dashboard','Clients','Leads & enquiries','Proposals','Contracts','Support tickets'], finance_manager: ['Dashboard','Finance','Payroll','Contracts'],
  };
  const allowedItems = new Set(roleAccess[role] || ['Dashboard']);
  const markRead = async (item: EnterpriseRow) => { try { await markEnterpriseNotificationRead(item.id); setNotifications(rows => rows.map(row => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)); } catch { /* retain current state when the request fails */ } };
  return <div className={`workspace-shell ${dark ? 'theme-dark' : ''}`}>
    <aside className={`workspace-sidebar ${collapsed ? 'is-collapsed' : ''} ${menuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark">N</div><div><strong>NEXTRADEV</strong><span>Company workspace</span></div><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-switch"><span className="workspace-icon"><BriefcaseBusiness size={17}/></span><span><b>Nextradev Technologies</b><small>Enterprise operations</small></span><ChevronDown size={14}/></div>
      <nav className="sidebar-nav" aria-label="Company workspace navigation">{navigation.map(group => { const visible = group.items.filter(item => allowedItems.has(item.label)); if (!visible.length) return null; return <div className="nav-group" key={group.group}><p className="nav-group-title">{group.group}</p>{visible.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={item.to === '/admin'} title={item.label} onClick={() => setMenuOpen(false)} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{item.label}</span></NavLink>; })}</div>; })}</nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><span className="avatar avatar-blue avatar-md">{(user?.displayName || user?.email || 'AD').slice(0, 2).toUpperCase()}</span><span><b>{user?.displayName || user?.email?.split('@')[0] || 'Administrator'}</b><small>{user?.email}</small></span><button aria-label="Sign out" onClick={logout}><LogOut size={16}/></button></div></div>
      <button className="collapse-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={13}/> : <PanelLeftClose size={13}/>}</button>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu/></button><div className="breadcrumbs"><span>Workspace</span><Activity size={14}/><b>{page}</b></div><div className="topbar-actions"><label className="global-search"><Search size={15}/><input aria-label="Search dashboard" placeholder="Search workspace" onKeyDown={event => { if (event.key === 'Enter') { const query = event.currentTarget.value.toLowerCase(); const match = navigation.flatMap(group => group.items).find(item => item.label.toLowerCase().includes(query)); if (match) navigate(match.to); } }}/><kbd>↵</kbd></label><button className="top-icon" aria-label="Toggle dark theme" onClick={() => setDark(value => !value)}><Moon size={17}/></button><button className="top-icon" aria-label={`${unread} notifications`} onClick={() => setShowNotifications(value => !value)}><Bell size={17}/>{unread > 0 && <i/>}</button><span className="topbar-divider"/><span className="profile-button"><span>{user?.displayName || user?.email?.split('@')[0] || 'Admin'}</span></span></div></header>
      {showNotifications && <aside className="notification-popover"><div className="panel-heading"><div><h2>Notifications</h2><p>{unread} unread updates</p></div><button aria-label="Close notifications" onClick={() => setShowNotifications(false)}><X size={16}/></button></div>{notifications.slice(0, 8).map(item => <button key={item.id} className={`notification-item ${item.readAt ? '' : 'unread'}`} onClick={() => void markRead(item)}><b>{item.title}</b><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}{!notifications.length && <p className="empty-notifications">No notifications yet.</p>}</aside>}
      <main className="workspace-route-content"><Outlet/></main>
      <footer className="workspace-footer"><span>© {new Date().getFullYear()} Nextradev Technologies LLP</span><span>Secure company workspace</span></footer>
    </div>
    {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/>}
  </div>;
}
