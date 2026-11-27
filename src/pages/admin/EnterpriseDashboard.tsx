import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Building2, CheckCircle2, Clock3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEnterpriseDashboard, type DashboardData } from '../../utils/enterpriseApi';
import { listAttendance, listLeaves, listTasks, subscribeWorkforce } from '../../utils/workforceApi';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateToday = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export default function EnterpriseDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]), [tasks, setTasks] = useState<any[]>([]), [leaves, setLeaves] = useState<any[]>([]);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([getEnterpriseDashboard(), listAttendance(dateToday()), listTasks(), listLeaves()]);
    const issues: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') { issues.push(result.reason instanceof Error ? result.reason.message : 'Dashboard data could not be loaded.'); return; }
      if (index === 0) setData(result.value as DashboardData);
      if (index === 1) setAttendance(result.value as any[]);
      if (index === 2) setTasks(result.value as any[]);
      if (index === 3) setLeaves(result.value as any[]);
    });
    setError(issues.join(' ')); setLoading(false);
  }, []);
  useEffect(() => { void refresh(); return subscribeWorkforce(() => void refresh()); }, [refresh]);

  const checkedIn = attendance.filter(row => row.checkIn && !row.checkOut).length;
  const pendingLeaves = leaves.filter(row => row.status === 'pending').length;
  const pendingTaskCount = tasks.filter(row => row.status !== 'completed').length;
  const kpi = data?.kpis;
  const cards = [
    { label: 'Total revenue', value: kpi?.totalRevenue == null ? 'Restricted' : currency.format(kpi.totalRevenue), change: null, icon: DollarSign, tone: 'icon-blue' },
    { label: 'Revenue this month', value: kpi?.monthlyRevenue == null ? 'Restricted' : currency.format(kpi.monthlyRevenue), change: kpi?.revenueChange, icon: TrendingUp, tone: 'icon-mint' },
    { label: 'Expenses this month', value: kpi?.monthlyExpenses == null ? 'Restricted' : currency.format(kpi.monthlyExpenses), change: kpi?.expensesChange, icon: Activity, tone: 'icon-amber' },
    { label: 'Net profit this month', value: kpi?.netProfit == null ? 'Restricted' : currency.format(kpi.netProfit), change: null, icon: DollarSign, tone: 'icon-violet' },
    { label: 'Active projects', value: kpi?.activeProjects ?? '—', change: null, icon: BriefcaseBusiness, tone: 'icon-blue' },
    { label: 'Completed projects', value: kpi?.completedProjects ?? '—', change: null, icon: CheckCircle2, tone: 'icon-mint' },
    { label: 'Active employees', value: kpi?.totalEmployees ?? '—', change: null, icon: Users, tone: 'icon-violet' },
    { label: 'Active clients', value: kpi?.activeClients ?? '—', change: null, icon: Building2, tone: 'icon-amber' },
  ];
  const maxValue = Math.max(1, ...(data?.monthly || []).flatMap(row => [row.revenue || 0, row.expenses || 0]));
  return <div className="workspace-content">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/>{new Intl.DateTimeFormat('en-IN', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(new Date()).toUpperCase()}</div><h1>Company overview</h1><p>Live business performance, delivery, and team activity.</p></div><div className="heading-controls"><Link className="primary-action" to="/admin/projects">View projects <span>→</span></Link></div></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    <section className="kpi-grid enterprise-kpis">{cards.map(({label,value,change,icon:Icon,tone})=><article className="kpi-card" key={label}><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={17}/></span></div><div className="kpi-value">{loading?'—':value}</div>{typeof change==='number'&&<div className="kpi-bottom"><span className={`trend ${change>=0?'trend-up':'trend-down'}`}>{change>=0?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {Math.abs(change)}%</span><span className="compare-label">vs previous month</span></div>}</article>)}</section>
    <div className="dashboard-grid enterprise-dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Revenue and expenses</h2><p>Six month view · values from recorded invoices and expenses</p></div></div><div className="enterprise-chart-legend"><span><i className="legend-blue"/>Revenue</span><span><i className="legend-cyan"/>Expenses</span></div><div className="enterprise-bar-chart" role="img" aria-label="Monthly revenue and expense comparison">{(data?.monthly || []).map(month=><div className="enterprise-chart-month" key={month.month}><div className="enterprise-bars"><span title={month.revenue == null ? 'Restricted' : `Revenue ${currency.format(month.revenue)}`} style={{height:`${Math.max(2,(month.revenue||0)/maxValue*100)}%`}}/><span title={month.expenses == null ? 'Restricted' : `Expenses ${currency.format(month.expenses)}`} style={{height:`${Math.max(2,(month.expenses||0)/maxValue*100)}%`}}/></div><small>{new Date(`${month.month}-01T00:00:00`).toLocaleDateString('en-IN',{month:'short'})}</small></div>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Team availability</h2><p>Today · {dateToday()}</p></div><Link className="text-link" to="/admin/employees">Open team →</Link></div><div className="availability-stat"><span className="quick-icon quick-mint"><Users size={18}/></span><div><b>{kpi?.checkedInEmployees ?? checkedIn}</b><small>checked in</small></div><span className="availability-divider"/><div><b>{kpi?.totalEmployees ?? '—'}</b><small>active employees</small></div></div><div className="quick-actions"><Link to="/admin/employees"><span className="quick-icon quick-violet"><Clock3 size={18}/></span><span><b>Leave approvals</b><small>{pendingLeaves} waiting for review</small></span><span>→</span></Link><Link to="/admin/tasks"><span className="quick-icon quick-blue"><Activity size={18}/></span><span><b>Open tasks</b><small>{pendingTaskCount} tasks in progress</small></span><span>→</span></Link><Link to="/admin/projects"><span className="quick-icon quick-amber"><BriefcaseBusiness size={18}/></span><span><b>Delayed projects</b><small>{kpi?.delayedProjects ?? 0} past deadline</small></span><span>→</span></Link></div></section>
    </div>
    <div className="dashboard-grid enterprise-dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Project delivery</h2><p>Current projects and progress</p></div><Link className="text-link" to="/admin/projects">All projects →</Link></div>{(data?.projects || []).map(project=><div className="enterprise-project-row" key={project.id}><div className="enterprise-project-heading"><b>{project.name}</b><span className={`status-pill ${project.status==='completed'?'status-emerald':'status-blue'}`}>{String(project.status).replaceAll('_',' ')}</span></div><small>{project.deadline ? `Due ${project.deadline}` : 'No deadline'} · {project.progress}% complete</small><div className="progress-track"><i className="bg-blue-500" style={{width:`${project.progress}%`}}/></div></div>)}{!loading&&!data?.projects.length&&<p className="employee-empty">No projects have been added.</p>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Updates from business operations</p></div></div>{(data?.activity || []).map(item=><div className="activity-item" key={item.id}><span className="quick-icon quick-blue"><Activity size={15}/></span><div><p><b>{item.title}</b> · {item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}{!loading&&!data?.activity.length&&<p className="employee-empty">Activity will appear here as records are added.</p>}</section>
    </div>
  </div>;
}
