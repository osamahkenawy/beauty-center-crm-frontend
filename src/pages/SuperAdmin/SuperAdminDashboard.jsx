import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building, User, DollarCircle, StatsReport, Calendar, Star,
  CheckCircle, ArrowUpRight, Refresh
} from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const ACTIVITY_ICONS = {
  appointment: Calendar,
  invoice: DollarCircle,
  customer: User,
  payment: CheckCircle,
  review: Star,
};
const PLAN_COLORS = { trial:'#f59e0b', starter:'#3b82f6', professional:'#8b5cf6', enterprise:'#d97706' };

const fmt    = (n) => Number(n || 0).toLocaleString('en-US');
const fmtAed = (n) => 'AED ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

const HealthRing = ({ score }) => {
  score = score || 0;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div
      className="sa-health-ring"
      style={{ background: 'conic-gradient(' + color + ' calc(' + score + '% * 1%), #232d42 0%)' }}
    >
      <div className="sa-health-inner">
        <span className="sa-health-score-num">{score}</span>
        <span className="sa-health-label">health</span>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const [overview,   setOverview]   = useState(null);
  const [activity,   setActivity]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent) => {
    const token = localStorage.getItem('superAdminToken');
    const headers = { Authorization: 'Bearer ' + token };
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [ovRes, acRes] = await Promise.all([
        fetch(API_BASE_URL + '/super-admin/platform-overview', { headers }),
        fetch(API_BASE_URL + '/super-admin/platform-activity?limit=12',  { headers }),
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (acRes.ok) setActivity((await acRes.json()).activities || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="sa-loading-page">
        <div className="loading-spinner large" />
        <p>Loading platform data...</p>
      </div>
    );
  }

  const ov  = overview || {};
  const kpi = ov.kpis  || {};
  const growth     = ov.tenant_growth || [];
  const topTenants = ov.top_tenants   || [];
  const maxBar     = Math.max(...growth.map(g => g.count), 1);

  const statCards = [
    { label: 'Total Tenants',   value: fmt(kpi.total_tenants),              icon: Building,    color: 'primary' },
    { label: 'Active Tenants',  value: fmt(kpi.active_tenants),             icon: CheckCircle, color: 'success' },
    { label: 'MRR',             value: fmtAed(kpi.monthly_recurring_revenue), icon: ArrowUpRight,color: 'gold'    },
    { label: 'This Month',      value: fmtAed(kpi.this_month_revenue),      icon: DollarCircle,color: 'warning' },
    { label: 'Total Customers', value: fmt(kpi.total_customers),            icon: User,        color: 'info'    },
    { label: 'Appts Today',     value: fmt(kpi.appointments_today),         icon: Calendar,    color: 'purple'  },
  ];

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header">
        <div>
          <h1>Platform Dashboard</h1>
          <p>Real-time overview of all tenants and activity</p>
        </div>
        <div className="sa-header-actions">
          <Link to="/super-admin/tenants" className="sa-primary-btn">
            <Building size={16} /> New Tenant
          </Link>
          <button className="sa-secondary-btn" onClick={() => load(true)} disabled={refreshing}>
            <Refresh size={16} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="sa-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
        {statCards.map((s) => (
          <div className="sa-stat-card" key={s.label}>
            <div className={'sa-stat-icon ' + s.color}><s.icon size={22} /></div>
            <div className="sa-stat-content">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="sa-dashboard-grid">
        {/* LEFT: Tenant Health Cards */}
        <div>
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Tenant Health</h2>
              <Link to="/super-admin/tenants" className="sa-link">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            {topTenants.length === 0 ? (
              <p style={{ color: 'var(--sa-text3)', textAlign: 'center', padding: 32, fontSize: 14 }}>
                No tenants yet. <Link to="/super-admin/tenants" style={{ color: 'var(--sa-primary2)' }}>Create one</Link>
              </p>
            ) : (
              <div className="sa-tenant-cards">
                {topTenants.map((t) => {
                  const pc = PLAN_COLORS[t.plan] || '#6366f1';
                  return (
                    <Link key={t.id} to={'/super-admin/tenants/' + t.id} className="sa-tenant-card">
                      <div className="sa-tenant-card-header">
                        <div
                          className="sa-tenant-card-avatar"
                          style={{ background: 'linear-gradient(135deg,' + pc + ',' + pc + '88)' }}
                        >
                          {t.name && t.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="sa-tenant-card-name">{t.name}</div>
                          <span
                            className="sa-plan-badge"
                            style={{ background: pc+'22', color: pc, border: '1px solid '+pc+'44', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}
                          >
                            {t.plan || 'trial'}
                          </span>
                        </div>
                        <HealthRing score={t.health_score || 0} />
                      </div>
                      <div className="sa-tenant-card-stats">
                        <div className="sa-tenant-card-stat">
                          <div className="sa-tenant-card-stat-val">{fmt(t.total_customers)}</div>
                          <div className="sa-tenant-card-stat-key">Customers</div>
                        </div>
                        <div className="sa-tenant-card-stat">
                          <div className="sa-tenant-card-stat-val">{fmt(t.appointments_today)}</div>
                          <div className="sa-tenant-card-stat-key">Today</div>
                        </div>
                        <div className="sa-tenant-card-stat">
                          <div className="sa-tenant-card-stat-val">
                            {t.avg_rating ? Number(t.avg_rating).toFixed(1) : '—'}
                          </div>
                          <div className="sa-tenant-card-stat-key">Rating</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tenant Growth Chart */}
          {growth.length > 0 && (
            <div className="sa-card">
              <div className="sa-card-header"><h2>Tenant Growth (12 months)</h2></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {growth.map((g, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: '100%',
                        height: Math.max(4, (g.count / maxBar) * 64) + 'px',
                        background: i === growth.length - 1 ? 'var(--sa-primary)' : 'rgba(99,102,241,0.3)',
                        borderRadius: 3,
                        transition: 'height 0.5s',
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--sa-text3)', transform: 'rotate(-45deg)' }}>
                      {g.month && g.month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Activity Feed */}
        <div>
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Live Activity</h2>
              <Link to="/super-admin/activity" className="sa-link">Full feed <ArrowUpRight size={14} /></Link>
            </div>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--sa-text3)', textAlign: 'center', padding: 32, fontSize: 14 }}>No activity yet</p>
            ) : (
              <div className="sa-activity-feed">
                {activity.map((ev, i) => {
                  const IconComp = ACTIVITY_ICONS[ev.type] || CheckCircle;
                  return (
                    <div key={i} className="sa-activity-item">
                      <div className={'sa-activity-icon ' + ev.type}><IconComp size={16} /></div>
                      <div className="sa-activity-body">
                        <div className="sa-activity-desc">{ev.description}</div>
                        <div className="sa-activity-meta">
                          <span className="sa-activity-tenant">{ev.tenant_name}</span>
                          <span className="sa-activity-time">{timeAgo(ev.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

