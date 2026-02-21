import { useState, useEffect, useCallback } from 'react';
import { Calendar, DollarCircle, User, CheckCircle, Star, Refresh } from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const ICONS = {
  appointment: Calendar,
  invoice: DollarCircle,
  customer: User,
  payment: CheckCircle,
  review: Star,
};
const TYPE_LABELS = {
  appointment: 'Appointment',
  invoice: 'Invoice',
  customer: 'New Customer',
  payment: 'Payment',
  review: 'Review',
};
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SuperAdminActivity = () => {
  const [activities, setActivities] = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType,   setFilterType]   = useState('all');
  const [filterTenant, setFilterTenant] = useState('all');

  const load = useCallback(async (silent) => {
    const token = localStorage.getItem('superAdminToken');
    const h = { Authorization: 'Bearer ' + token };
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [acRes, tRes] = await Promise.all([
        fetch(API_BASE_URL + '/super-admin/platform-activity?limit=100', { headers: h }),
        fetch(API_BASE_URL + '/super-admin/tenants', { headers: h }),
      ]);
      if (acRes.ok) setActivities((await acRes.json()).activities || []);
      if (tRes.ok)  setTenants((await tRes.json()).tenants || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activities.filter(ev => {
    if (filterType   !== 'all' && ev.type !== filterType) return false;
    if (filterTenant !== 'all' && String(ev.tenant_id) !== filterTenant) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, ev) => {
    const day = new Date(ev.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(ev);
    return acc;
  }, {});

  if (loading) return (
    <div className="sa-loading-page">
      <div className="loading-spinner large"/>
      <p>Loading activity...</p>
    </div>
  );

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>Live Activity</h1>
          <p>All platform events across every tenant — last 30 days</p>
        </div>
        <div className="sa-header-actions">
          <button className="sa-secondary-btn" onClick={() => load(true)} disabled={refreshing}>
            <Refresh size={16} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="sa-filters">
        <select className="sa-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Event Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="sa-filter-select" value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
          <option value="all">All Tenants</option>
          {tenants.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--sa-text3)' }}>{filtered.length} events</span>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="sa-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--sa-text3)', fontSize: 15 }}>No activity found for selected filters</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, evs]) => (
          <div key={day} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--sa-text3)',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              paddingBottom: 10, borderBottom: '1px solid var(--sa-border)', marginBottom: 4,
            }}>
              {day}
            </div>
            <div className="sa-card" style={{ padding: '4px 16px' }}>
              <div className="sa-activity-feed">
                {evs.map((ev, i) => {
                  const Icon = ICONS[ev.type] || CheckCircle;
                  return (
                    <div key={i} className="sa-activity-item">
                      <div className={'sa-activity-icon ' + ev.type}><Icon size={16}/></div>
                      <div className="sa-activity-body">
                        <div className="sa-activity-desc">{ev.description}</div>
                        <div className="sa-activity-meta">
                          <span className="sa-plan-badge" style={{ background:'rgba(99,102,241,0.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.3)',fontSize:10,padding:'2px 7px',marginRight:4 }}>
                            {TYPE_LABELS[ev.type] || ev.type}
                          </span>
                          <span className="sa-activity-tenant">{ev.tenant_name}</span>
                          <span className="sa-activity-time">{timeAgo(ev.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SuperAdminActivity;
