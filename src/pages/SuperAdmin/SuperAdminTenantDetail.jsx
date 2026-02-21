import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, DollarCircle, Star, Calendar, Key, Pause, Play, Phone, Mail, Globe } from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const fmtAed = (n) => 'AED ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
const PLAN_COLORS = { trial:'#f59e0b', starter:'#3b82f6', professional:'#8b5cf6', enterprise:'#d97706' };

const HealthRing = ({ score }) => {
  score = score || 0;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="sa-health-ring" style={{ background: 'conic-gradient(' + color + ' calc(' + score + '% * 1%), #232d42 0%)' }}>
      <div className="sa-health-inner">
        <span className="sa-health-score-num">{score}</span>
        <span className="sa-health-label">health</span>
      </div>
    </div>
  );
};

const SuperAdminTenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type) => {
    setToast({ msg, type: type || 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    fetch(API_BASE_URL + '/super-admin/tenants/' + id + '/details', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => navigate('/super-admin/tenants'));
  }, [id]);

  const handleImpersonate = async () => {
    const token = localStorage.getItem('superAdminToken');
    const res = await fetch(API_BASE_URL + '/super-admin/tenants/' + id + '/impersonate', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }
    });
    const d = await res.json();
    if (d.token) {
      localStorage.setItem('crm_token', d.token);
      if (d.user) localStorage.setItem('crm_user', JSON.stringify(d.user));
      window.open('/beauty-dashboard', '_blank');
    } else {
      showToast(d.error || 'Impersonate failed', 'error');
    }
  };

  const handleToggle = async () => {
    const token = localStorage.getItem('superAdminToken');
    const res = await fetch(API_BASE_URL + '/super-admin/tenants/' + id + '/toggle-status', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }
    });
    const d = await res.json();
    if (d.success) {
      setData(prev => ({ ...prev, tenant: { ...prev.tenant, is_active: !prev.tenant.is_active } }));
      showToast('Tenant ' + d.status);
    }
  };

  if (loading) return <div className="sa-loading-page"><div className="loading-spinner large"/><p>Loading tenant...</p></div>;
  if (!data) return null;

  const { tenant, kpis, staff, recent_appointments, top_services, monthly_revenue } = data;
  const pc = PLAN_COLORS[tenant.plan] || '#6366f1';
  const maxSvc = Math.max(...(top_services || []).map(s => s.booking_count), 1);
  const maxRev = Math.max(...(monthly_revenue || []).map(r => r.revenue), 1);

  return (
    <div>
      {toast && <div className={'sa-toast ' + toast.type}>{toast.msg}</div>}

      <div className="sa-breadcrumb">
        <Link to="/super-admin/tenants">Tenants</Link>
        <span>&rsaquo;</span>
        <span>{tenant.name}</span>
      </div>

      <div className="sa-detail-hero">
        <div className="sa-detail-avatar" style={{ background: 'linear-gradient(135deg,' + pc + ',' + pc + '88)' }}>
          {tenant.name && tenant.name.charAt(0).toUpperCase()}
        </div>
        <div className="sa-detail-info">
          <div className="sa-detail-name">{tenant.name}</div>
          <div className="sa-detail-meta">
            <span className="sa-plan-badge" style={{ background: pc+'22', color: pc, border: '1px solid '+pc+'44' }}>
              {tenant.plan || 'trial'}
            </span>
            <span className={'sa-status-badge ' + (tenant.is_active ? 'success' : 'danger')}>
              {tenant.is_active ? 'Active' : 'Suspended'}
            </span>
            {tenant.email && <span><Mail size={13}/> {tenant.email}</span>}
            {tenant.phone && <span><Phone size={13}/> {tenant.phone}</span>}
            {tenant.city  && <span><Globe size={13}/> {tenant.city}{tenant.country ? ', '+tenant.country : ''}</span>}
          </div>
        </div>
        <HealthRing score={kpis && kpis.health_score} />
        <div className="sa-detail-actions">
          <button className="sa-primary-btn" onClick={handleImpersonate}><Key size={16}/> Login as Admin</button>
          <button className="sa-secondary-btn" onClick={handleToggle}>
            {tenant.is_active ? <><Pause size={16}/> Suspend</> : <><Play size={16}/> Activate</>}
          </button>
        </div>
      </div>

      <div className="sa-stats-grid four-col" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Customers',  value: fmt(kpis && kpis.total_customers),       icon: User,         color: 'info'    },
          { label: 'Appts Today',      value: fmt(kpis && kpis.appointments_today),    icon: Calendar,     color: 'primary' },
          { label: 'Revenue (Month)',  value: fmtAed(kpis && kpis.revenue_this_month), icon: DollarCircle, color: 'warning' },
          { label: 'Avg Rating',       value: kpis && kpis.avg_rating ? Number(kpis.avg_rating).toFixed(1)+' ★' : '—', icon: Star, color: 'gold' },
        ].map(s => (
          <div className="sa-stat-card" key={s.label}>
            <div className={'sa-stat-icon '+s.color}><s.icon size={20}/></div>
            <div className="sa-stat-content"><h3>{s.value}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="sa-detail-grid-3">
        <div className="sa-card" style={{ marginBottom: 0 }}>
          <div className="sa-card-header"><h2>Staff ({(staff||[]).length})</h2></div>
          <div className="sa-staff-list">
            {(staff||[]).slice(0,8).map(s => (
              <div key={s.id} className="sa-staff-item">
                <div className="sa-staff-av">{s.full_name && s.full_name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="sa-staff-name">{s.full_name}</div>
                  <div className="sa-staff-role-label">{s.role && s.role.replace('_',' ')}</div>
                </div>
                {s.last_login && <div className="sa-staff-login">{new Date(s.last_login).toLocaleDateString()}</div>}
              </div>
            ))}
            {!(staff||[]).length && <p style={{ color:'var(--sa-text3)',textAlign:'center',padding:16,fontSize:13 }}>No staff</p>}
          </div>
        </div>

        <div className="sa-card" style={{ marginBottom: 0 }}>
          <div className="sa-card-header"><h2>Recent Appointments</h2></div>
          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead><tr><th>Customer</th><th>Service</th><th>Status</th></tr></thead>
              <tbody>
                {(recent_appointments||[]).slice(0,8).map(a => (
                  <tr key={a.id}>
                    <td style={{ color:'var(--sa-text)' }}>{a.customer_name||'—'}</td>
                    <td>{a.service_name||'—'}</td>
                    <td>
                      <span className={'sa-status-badge '+(a.status==='completed'?'success':a.status==='cancelled'?'danger':a.status==='in_progress'?'warning':'secondary')}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!(recent_appointments||[]).length && (
                  <tr><td colSpan={3} style={{textAlign:'center',color:'var(--sa-text3)'}}>No appointments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sa-card" style={{ marginBottom: 0 }}>
          <div className="sa-card-header"><h2>Top Services</h2></div>
          <div className="sa-top-list">
            {(top_services||[]).slice(0,8).map((s,i) => (
              <div key={i} className="sa-top-item">
                <div className="sa-top-rank">{i+1}</div>
                <div className="sa-top-label">{s.service_name}</div>
                <div className="sa-top-bar-wrap">
                  <div className="sa-top-bar-fill" style={{ width:((s.booking_count/maxSvc)*100)+'%' }}/>
                </div>
                <div className="sa-top-value">{s.booking_count}</div>
              </div>
            ))}
            {!(top_services||[]).length && (
              <p style={{ color:'var(--sa-text3)',textAlign:'center',padding:16,fontSize:13 }}>No service data</p>
            )}
          </div>
        </div>
      </div>

      {(monthly_revenue||[]).length > 0 && (
        <div className="sa-card" style={{ marginTop: 24 }}>
          <div className="sa-card-header"><h2>Monthly Revenue (AED)</h2></div>
          <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:100,padding:'8px 0' }}>
            {monthly_revenue.map((r,i) => (
              <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6 }}>
                <span style={{ fontSize:10,color:'var(--sa-text3)' }}>
                  {Number(r.revenue||0).toLocaleString('en-US',{maximumFractionDigits:0})}
                </span>
                <div style={{
                  width:'100%',
                  height: Math.max(4,(r.revenue/maxRev)*72)+'px',
                  background: i===monthly_revenue.length-1?'var(--sa-primary)':'rgba(99,102,241,0.35)',
                  borderRadius:4,
                  transition:'height 0.5s'
                }}/>
                <span style={{ fontSize:9,color:'var(--sa-text3)',transform:'rotate(-40deg)' }}>
                  {r.month && r.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTenantDetail;
