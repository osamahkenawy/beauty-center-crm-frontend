import { useState, useEffect } from 'react';
import { Crown, Plus, Edit3, Trash2, Users, UserPlus, Pause, Play, X, XCircle, Check, DollarSign } from 'lucide-react';
import api from '../lib/api';
import Swal from 'sweetalert2';
import useCurrency from '../hooks/useCurrency';
import { supportAlert } from '../utils/supportAlert';
import './Memberships.css';

const BILLING_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
const PERIOD_COLORS = { weekly: '#ff9800', monthly: '#6c5ce7', quarterly: '#00bcd4', yearly: '#2e7d32' };

export default function Memberships() {
  const { currency } = useCurrency();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [subData, setSubData] = useState({ customer_id: '', plan_id: '', auto_renew: true });
  const [planForm, setPlanForm] = useState({
    name: '', name_ar: '', description: '', price: '', currency: '',
    billing_period: 'monthly', sessions_included: 0, discount_percent: 0,
    features: [], color: '#6c5ce7', is_active: 1
  });
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, mRes, stRes, cRes] = await Promise.all([
        api.get('/memberships/plans'),
        api.get('/memberships/stats'),
        api.get('/memberships/members?limit=100'),
        api.get('/products?active=true'),
        api.get('/contacts'),
      ]);
      setPlans(pRes.data || []);
      setStats(sRes.data || {});
      setMembers(mRes.data || []);
      setServices(stRes.data || []);
      setCustomers(cRes.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', name_ar: '', description: '', price: '', currency: currency, billing_period: 'monthly', sessions_included: 0, discount_percent: 0, features: [], color: '#6c5ce7', is_active: 1 });
    setShowPlanModal(true);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name, name_ar: plan.name_ar || '', description: plan.description || '',
      price: plan.price, currency: plan.currency || currency, billing_period: plan.billing_period || 'monthly',
      sessions_included: plan.sessions_included || 0, discount_percent: plan.discount_percent || 0,
      features: plan.features || [], color: plan.color || '#6c5ce7', is_active: plan.is_active
    });
    setShowPlanModal(true);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanForm(p => ({ ...p, features: [...p.features, newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (idx) => {
    setPlanForm(p => ({ ...p, features: p.features.filter((_, i) => i !== idx) }));
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...planForm, price: parseFloat(planForm.price), sessions_included: parseInt(planForm.sessions_included), discount_percent: parseFloat(planForm.discount_percent) };
      if (editingPlan) await api.patch(`/memberships/plans/${editingPlan.id}`, payload);
      else await api.post('/memberships/plans', payload);
      Swal.fire({ icon: 'success', title: editingPlan ? 'Updated!' : 'Created!', timer: 1500, showConfirmButton: false });
      setShowPlanModal(false);
      fetchAll();
    } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
  };

  const handleDeletePlan = () => supportAlert();

  const openSubscribe = (plan = null) => {
    setSubData({ customer_id: '', plan_id: plan ? String(plan.id) : '', auto_renew: true });
    setShowSubModal(true);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/memberships/subscribe', { customer_id: parseInt(subData.customer_id), plan_id: parseInt(subData.plan_id), auto_renew: subData.auto_renew });
      Swal.fire({ icon: 'success', title: 'Subscribed!', timer: 1500, showConfirmButton: false });
      setShowSubModal(false);
      fetchAll();
    } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
  };

  const handlePauseMembership = async (mem) => {
    await api.post(`/memberships/pause/${mem.id}`);
    fetchAll();
  };

  const handleCancelMembership = async (mem) => {
    const { value: reason } = await Swal.fire({ title: 'Cancel Membership?', input: 'textarea', inputPlaceholder: 'Reason for cancellation...', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Cancel Membership' });
    if (reason !== undefined) {
      await api.post(`/memberships/cancel/${mem.id}`, { reason });
      fetchAll();
    }
  };

  if (loading) return <div className="mem-loading"><div className="mem-spinner" /></div>;

  return (
    <div className="mem-page">
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Crown size={26} /></div>
          <div>
            <h1 className="module-hero-title">Memberships</h1>
            <p className="module-hero-sub">Recurring plans for loyal clients</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline" onClick={() => openSubscribe()}><UserPlus size={16} /> Subscribe Client</button>
          <button className="module-btn module-btn-primary" onClick={openCreatePlan}><Plus size={18} /> New Plan</button>
        </div>
      </div>

      {/* Stats */}
      <div className="mem-stats">
        <div className="mem-stat-card"><Crown size={20} className="mem-stat-icon" /><span className="mem-stat-num">{stats.total_plans || 0}</span><span className="mem-stat-lbl">Plans</span></div>
        <div className="mem-stat-card"><Users size={20} className="mem-stat-icon" /><span className="mem-stat-num">{stats.active_members || 0}</span><span className="mem-stat-lbl">Active Members</span></div>
        <div className="mem-stat-card"><Pause size={20} className="mem-stat-icon" /><span className="mem-stat-num">{stats.paused_members || 0}</span><span className="mem-stat-lbl">Paused</span></div>
        <div className="mem-stat-card"><DollarSign size={20} className="mem-stat-icon" /><span className="mem-stat-num">{parseFloat(stats.monthly_revenue || 0).toLocaleString()}</span><span className="mem-stat-lbl">Monthly Revenue</span></div>
      </div>

      {/* Tabs */}
      <div className="mem-tabs">
        <button className={`mem-tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>Plans ({plans.length})</button>
        <button className={`mem-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Members ({members.length})</button>
      </div>

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div className="mem-plans-grid">
          {plans.length === 0 ? (
            <div className="mem-empty"><Crown size={48} strokeWidth={1} /><h3>No plans yet</h3><p>Create membership plans for your clients</p></div>
          ) : plans.map(plan => (
            <div key={plan.id} className="mem-plan-card" style={{ borderTopColor: plan.color || '#6c5ce7' }}>
              <div className="mem-plan-header">
                <span className="mem-plan-period" style={{ background: PERIOD_COLORS[plan.billing_period] || '#6c5ce7' }}>{BILLING_LABELS[plan.billing_period]}</span>
                {!plan.is_active && <span className="mem-plan-inactive">Inactive</span>}
              </div>
              <h3 className="mem-plan-name">{plan.name}</h3>
              <div className="mem-plan-price">
                <span className="mem-plan-amount" style={{ color: plan.color || '#6c5ce7' }}>{plan.currency} {parseFloat(plan.price).toLocaleString()}</span>
                <span className="mem-plan-per">/{plan.billing_period}</span>
              </div>
              {plan.description && <p className="mem-plan-desc">{plan.description}</p>}
              <div className="mem-plan-features">
                {plan.sessions_included > 0 && <div className="mem-feature"><Check size={14} /> {plan.sessions_included} sessions/period</div>}
                {plan.discount_percent > 0 && <div className="mem-feature"><Check size={14} /> {plan.discount_percent}% off services</div>}
                {(plan.features || []).map((f, i) => <div key={i} className="mem-feature"><Check size={14} /> {f}</div>)}
              </div>
              <div className="mem-plan-footer">
                <span className="mem-plan-members">{plan.active_members || 0} members</span>
                <div className="mem-plan-actions">
                  <button className="mem-icon-btn mem-sub-btn" onClick={() => openSubscribe(plan)} title="Subscribe"><UserPlus size={14} /></button>
                  <button className="mem-icon-btn" onClick={() => openEditPlan(plan)} title="Edit"><Edit3 size={14} /></button>
                  <button className="mem-icon-btn mem-del-btn" onClick={() => handleDeletePlan(plan)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="mem-members-list">
          {members.length === 0 ? (
            <div className="mem-empty"><Users size={48} strokeWidth={1} /><h3>No members yet</h3><p>Subscribe clients to a plan</p></div>
          ) : members.map(m => (
            <div key={m.id} className="mem-member-row">
              <div className="mem-member-avatar" style={{ background: m.color || '#6c5ce7' }}>{(m.first_name || 'C')[0]}</div>
              <div className="mem-member-info">
                <h4>{m.first_name} {m.last_name}</h4>
                <span className="mem-member-plan">{m.plan_name} — {m.currency} {parseFloat(m.price || 0).toLocaleString()}/{m.billing_period}</span>
              </div>
              <div className="mem-member-dates">
                <span>Started: {m.start_date ? new Date(m.start_date).toLocaleDateString() : '-'}</span>
                <span>Next billing: {m.next_billing_date ? new Date(m.next_billing_date).toLocaleDateString() : '-'}</span>
              </div>
              <span className={`mem-member-status mem-status-${m.status}`}>{m.status}</span>
              <div className="mem-member-actions">
                {m.status === 'active' && (
                  <button className="mem-icon-btn" onClick={() => handlePauseMembership(m)} title="Pause"><Pause size={14} /></button>
                )}
                {m.status === 'paused' && (
                  <button className="mem-icon-btn mem-sub-btn" onClick={() => handlePauseMembership(m)} title="Resume"><Play size={14} /></button>
                )}
                {(m.status === 'active' || m.status === 'paused') && (
                  <button className="mem-icon-btn mem-del-btn" onClick={() => handleCancelMembership(m)} title="Cancel"><XCircle size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="mem-modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="mem-modal" onClick={e => e.stopPropagation()}>
            <div className="mem-modal-header">
              <h2>{editingPlan ? 'Edit Plan' : 'New Membership Plan'}</h2>
              <button className="mem-modal-close" onClick={() => setShowPlanModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePlanSubmit}>
              <div className="mem-form-grid">
                <div className="mem-field"><label>Plan Name *</label><input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div className="mem-field"><label>Name (Arabic)</label><input value={planForm.name_ar} onChange={e => setPlanForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
                <div className="mem-field mem-field-full"><label>Description</label><textarea rows={2} value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="mem-field"><label>Price *</label><input type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} required /></div>
                <div className="mem-field"><label>Billing Period</label>
                  <select value={planForm.billing_period} onChange={e => setPlanForm(p => ({ ...p, billing_period: e.target.value }))}>
                    {Object.entries(BILLING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="mem-field"><label>Sessions Included</label><input type="number" value={planForm.sessions_included} onChange={e => setPlanForm(p => ({ ...p, sessions_included: e.target.value }))} /></div>
                <div className="mem-field"><label>Discount %</label><input type="number" step="0.01" value={planForm.discount_percent} onChange={e => setPlanForm(p => ({ ...p, discount_percent: e.target.value }))} /></div>
                <div className="mem-field"><label>Color</label><input type="color" value={planForm.color} onChange={e => setPlanForm(p => ({ ...p, color: e.target.value }))} style={{ height: 40, padding: 2 }} /></div>
                <div className="mem-field"><label>Status</label>
                  <select value={planForm.is_active} onChange={e => setPlanForm(p => ({ ...p, is_active: parseInt(e.target.value) }))}>
                    <option value={1}>Active</option><option value={0}>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mem-features-section">
                <label>Plan Features</label>
                <div className="mem-feature-input">
                  <input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="e.g. Priority booking" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
                  <button type="button" onClick={addFeature}><Plus size={14} /></button>
                </div>
                <div className="mem-feature-list">
                  {planForm.features.map((f, i) => (
                    <div key={i} className="mem-feature-tag">
                      <span>{f}</span>
                      <button type="button" onClick={() => removeFeature(i)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mem-modal-actions">
                <button type="button" className="mem-btn-outline" onClick={() => setShowPlanModal(false)}>Cancel</button>
                <button type="submit" className="mem-btn-primary">{editingPlan ? 'Save' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubModal && (
        <div className="mem-modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="mem-modal mem-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Subscribe Client</h2>
            <form onSubmit={handleSubscribe}>
              <div className="mem-field" style={{ marginBottom: 16 }}>
                <label>Client *</label>
                <select value={subData.customer_id} onChange={e => setSubData(p => ({ ...p, customer_id: e.target.value }))} required>
                  <option value="">Select client...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="mem-field" style={{ marginBottom: 16 }}>
                <label>Plan *</label>
                <select value={subData.plan_id} onChange={e => setSubData(p => ({ ...p, plan_id: e.target.value }))} required>
                  <option value="">Select plan...</option>
                  {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency} {parseFloat(p.price).toLocaleString()}/{p.billing_period})</option>)}
                </select>
              </div>
              <label className="mem-checkbox">
                <input type="checkbox" checked={subData.auto_renew} onChange={e => setSubData(p => ({ ...p, auto_renew: e.target.checked }))} />
                Auto-renew
              </label>
              <div className="mem-modal-actions">
                <button type="button" className="mem-btn-outline" onClick={() => setShowSubModal(false)}>Cancel</button>
                <button type="submit" className="mem-btn-primary"><UserPlus size={16} /> Subscribe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
