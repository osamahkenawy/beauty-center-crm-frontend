import { useState, useEffect } from 'react';
import { Percent, Plus, Edit3, Trash2, Tag, Copy, Eye, X, Zap, Gift, Calendar, Clock, Users } from 'lucide-react';
import api from '../lib/api';
import Swal from 'sweetalert2';
import { supportAlert } from '../utils/supportAlert';
import './Promotions.css';

const TYPE_LABELS = {
  percentage: { label: 'Percentage Off', icon: Percent, color: '#6c5ce7' },
  fixed: { label: 'Fixed Amount', icon: Tag, color: '#00b894' },
  buy_x_get_y: { label: 'Buy X Get Y', icon: Gift, color: '#e17055' },
  happy_hour: { label: 'Happy Hour', icon: Clock, color: '#fdcb6e' },
  referral: { label: 'Referral', icon: Users, color: '#0984e3' },
  birthday: { label: 'Birthday', icon: Gift, color: '#e84393' },
  first_visit: { label: 'First Visit', icon: Zap, color: '#00cec9' },
};

export default function Promotions() {
  const [promos, setPromos] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '', type: 'percentage',
    discount_value: '', min_spend: 0, applies_to: 'all_services',
    service_ids: [], category_ids: [], start_date: '', end_date: '',
    usage_limit: 0, is_active: 1
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, svRes, cRes] = await Promise.all([
        api.get('/promotions'),
        api.get('/promotions/stats'),
        api.get('/products?active=true'),
        api.get('/service-categories'),
      ]);
      setPromos(pRes.data || []);
      setStats(sRes.data || {});
      setServices(svRes.data || []);
      setCategories(cRes.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', name_ar: '', description: '', type: 'percentage', discount_value: '', min_spend: 0, applies_to: 'all_services', service_ids: [], category_ids: [], start_date: '', end_date: '', usage_limit: 0, is_active: 1 });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, name_ar: p.name_ar || '', description: p.description || '', type: p.type,
      discount_value: p.discount_value, min_spend: p.min_spend || 0, applies_to: p.applies_to || 'all_services',
      service_ids: p.service_ids || [], category_ids: p.category_ids || [],
      start_date: p.start_date ? p.start_date.split('T')[0] : '', end_date: p.end_date ? p.end_date.split('T')[0] : '',
      usage_limit: p.usage_limit || 0, is_active: p.is_active
    });
    setShowModal(true);
  };

  const openDetail = async (p) => {
    try {
      const res = await api.get(`/promotions/${p.id}`);
      setSelectedPromo(res.data);
      setShowDetailModal(true);
    } catch(e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, discount_value: parseFloat(form.discount_value), min_spend: parseFloat(form.min_spend), usage_limit: parseInt(form.usage_limit) };
      if (editing) await api.patch(`/promotions/${editing.id}`, payload);
      else await api.post('/promotions', payload);
      Swal.fire({ icon: 'success', title: editing ? 'Updated!' : 'Created!', timer: 1500, showConfirmButton: false });
      setShowModal(false);
      fetchAll();
    } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
  };

  const handleDelete = () => supportAlert();

  const generateCode = async (promo) => {
    const { value: code } = await Swal.fire({ title: 'Generate Discount Code', input: 'text', inputPlaceholder: 'Leave blank for auto-generate', showCancelButton: true, confirmButtonText: 'Generate' });
    if (code !== undefined) {
      try {
        const res = await api.post(`/promotions/${promo.id}/codes`, { code: code || undefined, max_uses: 0 });
        Swal.fire({ icon: 'success', title: 'Code Generated!', text: res.data.code, confirmButtonText: 'Copy', preConfirm: () => navigator.clipboard.writeText(res.data.code) });
        fetchAll();
      } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
    }
  };

  const isExpired = (p) => p.end_date && new Date(p.end_date) < new Date();
  const isUpcoming = (p) => p.start_date && new Date(p.start_date) > new Date();

  if (loading) return <div className="prm-loading"><div className="prm-spinner" /></div>;

  return (
    <div className="prm-page">
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Percent size={26} /></div>
          <div>
            <h1 className="module-hero-title">Deals & Promotions</h1>
            <p className="module-hero-sub">Create offers and discount codes to attract more clients</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" onClick={openCreate}><Plus size={18} /> New Promotion</button>
        </div>
      </div>

      {/* Stats */}
      <div className="prm-stats">
        <div className="prm-stat"><Tag size={20} /><div><span className="prm-stat-num">{stats.total || 0}</span><span className="prm-stat-lbl">Total</span></div></div>
        <div className="prm-stat"><Zap size={20} /><div><span className="prm-stat-num">{stats.active || 0}</span><span className="prm-stat-lbl">Active</span></div></div>
        <div className="prm-stat"><Copy size={20} /><div><span className="prm-stat-num">{stats.total_codes || 0}</span><span className="prm-stat-lbl">Codes</span></div></div>
        <div className="prm-stat"><Users size={20} /><div><span className="prm-stat-num">{stats.total_uses || 0}</span><span className="prm-stat-lbl">Total Uses</span></div></div>
      </div>

      {/* Promotions List */}
      {promos.length === 0 ? (
        <div className="prm-empty"><Percent size={48} strokeWidth={1} /><h3>No promotions yet</h3><p>Create deals to attract and retain clients</p></div>
      ) : (
        <div className="prm-grid">
          {promos.map(p => {
            const typeInfo = TYPE_LABELS[p.type] || TYPE_LABELS.percentage;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={p.id} className={`prm-card ${isExpired(p) ? 'prm-expired' : ''}`}>
                <div className="prm-card-top">
                  <div className="prm-type-badge" style={{ background: typeInfo.color }}><TypeIcon size={14} /> {typeInfo.label}</div>
                  {isExpired(p) && <span className="prm-exp-badge">Expired</span>}
                  {isUpcoming(p) && <span className="prm-upcoming-badge">Upcoming</span>}
                  {!p.is_active && <span className="prm-exp-badge">Inactive</span>}
                </div>
                <h3 className="prm-card-name">{p.name}</h3>
                <div className="prm-card-value" style={{ color: typeInfo.color }}>
                  {p.type === 'percentage' ? `${p.discount_value}% OFF` : p.type === 'fixed' ? `${p.discount_value} OFF` : p.type}
                </div>
                {p.description && <p className="prm-card-desc">{p.description}</p>}
                <div className="prm-card-details">
                  {p.start_date && <span><Calendar size={12} /> {new Date(p.start_date).toLocaleDateString()} - {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'No end'}</span>}
                  {p.min_spend > 0 && <span>Min spend: {p.min_spend}</span>}
                  <span>{p.code_count || 0} codes • {p.used_count || 0} uses</span>
                </div>
                <div className="prm-card-footer">
                  <button className="prm-icon-btn prm-code-btn" onClick={() => generateCode(p)} title="Generate Code"><Tag size={14} /></button>
                  <button className="prm-icon-btn" onClick={() => openDetail(p)} title="View"><Eye size={14} /></button>
                  <button className="prm-icon-btn" onClick={() => openEdit(p)} title="Edit"><Edit3 size={14} /></button>
                  <button className="prm-icon-btn prm-del-btn" onClick={() => handleDelete(p)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="prm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="prm-modal" onClick={e => e.stopPropagation()}>
            <div className="prm-modal-header">
              <h2>{editing ? 'Edit Promotion' : 'New Promotion'}</h2>
              <button className="prm-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="prm-form-grid">
                <div className="prm-field"><label>Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div className="prm-field"><label>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="prm-field"><label>{form.type === 'percentage' ? 'Discount %' : 'Discount Amount'} *</label>
                  <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} required />
                </div>
                <div className="prm-field"><label>Min Spend</label><input type="number" step="0.01" value={form.min_spend} onChange={e => setForm(p => ({ ...p, min_spend: e.target.value }))} /></div>
                <div className="prm-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div className="prm-field"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
                <div className="prm-field"><label>Usage Limit (0=unlimited)</label><input type="number" value={form.usage_limit} onChange={e => setForm(p => ({ ...p, usage_limit: e.target.value }))} /></div>
                <div className="prm-field"><label>Status</label>
                  <select value={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: parseInt(e.target.value) }))}>
                    <option value={1}>Active</option><option value={0}>Inactive</option>
                  </select>
                </div>
                <div className="prm-field prm-field-full"><label>Applies To</label>
                  <select value={form.applies_to} onChange={e => setForm(p => ({ ...p, applies_to: e.target.value }))}>
                    <option value="all_services">All Services</option>
                    <option value="specific_services">Specific Services</option>
                    <option value="specific_categories">Specific Categories</option>
                  </select>
                </div>
                <div className="prm-field prm-field-full"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              </div>
              <div className="prm-modal-actions">
                <button type="button" className="prm-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="prm-btn-primary">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPromo && (
        <div className="prm-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="prm-modal" onClick={e => e.stopPropagation()}>
            <div className="prm-modal-header">
              <h2>{selectedPromo.name}</h2>
              <button className="prm-modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>
            <div className="prm-detail-value" style={{ color: TYPE_LABELS[selectedPromo.type]?.color }}>
              {selectedPromo.type === 'percentage' ? `${selectedPromo.discount_value}% OFF` : `${selectedPromo.discount_value} OFF`}
            </div>
            {selectedPromo.description && <p style={{ color: '#666', margin: '8px 0 16px' }}>{selectedPromo.description}</p>}

            {selectedPromo.codes && selectedPromo.codes.length > 0 && (
              <>
                <h4>Discount Codes ({selectedPromo.codes.length})</h4>
                <div className="prm-codes-list">
                  {selectedPromo.codes.map(c => (
                    <div key={c.id} className="prm-code-item">
                      <span className="prm-code-val">{c.code}</span>
                      <span>{c.used_count}/{c.max_uses || '∞'} uses</span>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied!', timer: 1000, showConfirmButton: false }); }}><Copy size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedPromo.usage && selectedPromo.usage.length > 0 && (
              <>
                <h4 style={{ marginTop: 20 }}>Recent Usage ({selectedPromo.usage.length})</h4>
                <div className="prm-usage-list">
                  {selectedPromo.usage.map(u => (
                    <div key={u.id} className="prm-usage-item">
                      <span>{u.first_name} {u.last_name}</span>
                      <span>-{u.discount_amount}</span>
                      <span>{new Date(u.used_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
