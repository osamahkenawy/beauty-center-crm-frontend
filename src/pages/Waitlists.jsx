import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Search, Filter, User, Phone, CalendarDays, ArrowRight, CheckCircle2, XCircle, Bell, Trash2, Edit3, MoreHorizontal } from 'lucide-react';
import api from '../lib/api';
import Swal from 'sweetalert2';
import { supportAlert } from '../utils/supportAlert';
import './Waitlists.css';

const STATUS_COLORS = {
  waiting: { bg: '#fff3e0', color: '#e65100', label: 'Waiting' },
  notified: { bg: '#e3f2fd', color: '#1565c0', label: 'Notified' },
  booked: { bg: '#e8f5e9', color: '#2e7d32', label: 'Booked' },
  expired: { bg: '#fce4ec', color: '#c62828', label: 'Expired' },
  cancelled: { bg: '#f5f5f5', color: '#757575', label: 'Cancelled' },
};

export default function Waitlists() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '', service_id: '', preferred_staff_id: '', branch_id: '',
    preferred_date: '', preferred_time_start: '', preferred_time_end: '',
    priority: 0, notes: ''
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, sRes, stRes, cRes, bRes] = await Promise.all([
        api.get('/waitlists?limit=100'),
        api.get('/waitlists/stats'),
        api.get('/products?active=true'),
        api.get('/contacts'),
        api.get('/branches'),
      ]);
      setItems(wRes.data || []);
      setStats(sRes.data || {});
      setServices(stRes.data || []);
      setCustomers(cRes.data || []);
      setBranches(bRes.data || []);

      // Fetch staff
      try { const staffRes = await api.get('/staff'); setStaff(staffRes.data || []); } catch(e) { setStaff([]); }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter(i => i.status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        (i.customer_first_name || '').toLowerCase().includes(s) ||
        (i.customer_last_name || '').toLowerCase().includes(s) ||
        (i.service_name || '').toLowerCase().includes(s) ||
        (i.customer_phone || '').includes(s)
      );
    }
    return list;
  }, [items, filter, search]);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ customer_id: '', service_id: '', preferred_staff_id: '', branch_id: '', preferred_date: '', preferred_time_start: '', preferred_time_end: '', priority: 0, notes: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      customer_id: String(item.customer_id || ''),
      service_id: String(item.service_id || ''),
      preferred_staff_id: String(item.preferred_staff_id || ''),
      branch_id: String(item.branch_id || ''),
      preferred_date: item.preferred_date ? item.preferred_date.split('T')[0] : '',
      preferred_time_start: item.preferred_time_start || '',
      preferred_time_end: item.preferred_time_end || '',
      priority: item.priority || 0,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, customer_id: parseInt(formData.customer_id) };
      if (formData.service_id) payload.service_id = parseInt(formData.service_id);
      if (formData.preferred_staff_id) payload.preferred_staff_id = parseInt(formData.preferred_staff_id);
      if (formData.branch_id) payload.branch_id = parseInt(formData.branch_id);

      if (editingItem) {
        await api.patch(`/waitlists/${editingItem.id}`, payload);
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/waitlists', payload);
        Swal.fire({ icon: 'success', title: 'Added to Waitlist!', timer: 1500, showConfirmButton: false });
      }
      setShowModal(false);
      fetchAll();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  const handleNotify = async (item) => {
    const result = await Swal.fire({
      title: 'Notify Client?',
      text: `Send notification to ${item.customer_first_name} ${item.customer_last_name}?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Notify'
    });
    if (result.isConfirmed) {
      await api.patch(`/waitlists/${item.id}`, { status: 'notified' });
      Swal.fire({ icon: 'success', title: 'Client Notified!', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleBook = async (item) => {
    const { value: formValues } = await Swal.fire({
      title: 'Book Appointment',
      html: `
        <p style="margin-bottom:12px">Create appointment for <b>${item.customer_first_name} ${item.customer_last_name}</b></p>
        <input id="swal-date" type="date" class="swal2-input" placeholder="Date" value="${item.preferred_date ? item.preferred_date.split('T')[0] : new Date().toISOString().split('T')[0]}">
        <input id="swal-start" type="time" class="swal2-input" placeholder="Start Time" value="${item.preferred_time_start || '09:00'}">
        <input id="swal-end" type="time" class="swal2-input" placeholder="End Time" value="${item.preferred_time_end || '10:00'}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Book Now',
      preConfirm: () => ({
        date: document.getElementById('swal-date').value,
        start: document.getElementById('swal-start').value,
        end: document.getElementById('swal-end').value,
      })
    });
    if (formValues) {
      try {
        const start_time = new Date(`${formValues.date}T${formValues.start}:00`).toISOString();
        const end_time = new Date(`${formValues.date}T${formValues.end}:00`).toISOString();
        await api.post(`/waitlists/${item.id}/book`, { start_time, end_time, staff_id: item.preferred_staff_id });
        Swal.fire({ icon: 'success', title: 'Booked!', text: 'Appointment created from waitlist', timer: 2000, showConfirmButton: false });
        fetchAll();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const handleCancel = async (item) => {
    const result = await Swal.fire({ title: 'Cancel?', text: 'Remove from waitlist?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, cancel', confirmButtonColor: '#dc3545' });
    if (result.isConfirmed) {
      await api.patch(`/waitlists/${item.id}`, { status: 'cancelled' });
      fetchAll();
    }
  };

  const handleDelete = () => supportAlert();

  if (loading) return <div className="wl-loading"><div className="wl-spinner" /></div>;

  return (
    <div className="wl-page">
      {/* Header */}
      <div className="wl-header">
        <div>
          <h1 className="wl-title">Waitlist</h1>
          <p className="wl-subtitle">Manage clients waiting for available slots</p>
        </div>
        <button className="wl-btn-primary" onClick={openCreate}><Plus size={18} /> Add to Waitlist</button>
      </div>

      {/* Stats */}
      <div className="wl-stats">
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="wl-stat-card" style={{ borderLeftColor: val.color }}>
            <span className="wl-stat-num" style={{ color: val.color }}>{stats[key] || 0}</span>
            <span className="wl-stat-label">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="wl-filters">
        <div className="wl-search-wrap">
          <Search size={16} />
          <input placeholder="Search clients, services..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="wl-tabs">
          <button className={`wl-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({items.length})</button>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <button key={key} className={`wl-tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)} style={filter === key ? { color: val.color, borderColor: val.color } : {}}>
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="wl-empty">
          <Clock size={48} strokeWidth={1} />
          <h3>No waitlist entries</h3>
          <p>Add clients who want to be notified when a slot opens</p>
        </div>
      ) : (
        <div className="wl-list">
          {filtered.map(item => (
            <div key={item.id} className="wl-card">
              <div className="wl-card-left">
                <div className="wl-card-avatar">
                  {(item.customer_first_name || 'C')[0]}{(item.customer_last_name || '')[0]}
                </div>
                <div className="wl-card-info">
                  <h4>{item.customer_first_name} {item.customer_last_name}</h4>
                  <div className="wl-card-meta">
                    {item.service_name && <span className="wl-meta-tag"><CalendarDays size={12} /> {item.service_name}</span>}
                    {item.customer_phone && <span className="wl-meta-tag"><Phone size={12} /> {item.customer_phone}</span>}
                    {item.staff_name && <span className="wl-meta-tag"><User size={12} /> {item.staff_name}</span>}
                    {item.preferred_date && <span className="wl-meta-tag"><CalendarDays size={12} /> {new Date(item.preferred_date).toLocaleDateString()}</span>}
                    {item.preferred_time_start && <span className="wl-meta-tag"><Clock size={12} /> {item.preferred_time_start} - {item.preferred_time_end}</span>}
                  </div>
                  {item.notes && <p className="wl-card-notes">{item.notes}</p>}
                </div>
              </div>
              <div className="wl-card-right">
                <span className="wl-status-badge" style={{ background: STATUS_COLORS[item.status]?.bg, color: STATUS_COLORS[item.status]?.color }}>
                  {STATUS_COLORS[item.status]?.label || item.status}
                </span>
                <div className="wl-card-actions">
                  {item.status === 'waiting' && (
                    <>
                      <button className="wl-action-btn" onClick={() => handleNotify(item)} title="Notify"><Bell size={16} /></button>
                      <button className="wl-action-btn wl-action-book" onClick={() => handleBook(item)} title="Book"><ArrowRight size={16} /></button>
                    </>
                  )}
                  {item.status === 'notified' && (
                    <button className="wl-action-btn wl-action-book" onClick={() => handleBook(item)} title="Book"><CheckCircle2 size={16} /></button>
                  )}
                  <button className="wl-action-btn" onClick={() => openEdit(item)} title="Edit"><Edit3 size={16} /></button>
                  {(item.status === 'waiting' || item.status === 'notified') && (
                    <button className="wl-action-btn wl-action-cancel" onClick={() => handleCancel(item)} title="Cancel"><XCircle size={16} /></button>
                  )}
                  <button className="wl-action-btn wl-action-delete" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="wl-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="wl-modal" onClick={e => e.stopPropagation()}>
            <h2>{editingItem ? 'Edit Waitlist Entry' : 'Add to Waitlist'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="wl-form-grid">
                <div className="wl-field">
                  <label>Client *</label>
                  <select value={formData.customer_id} onChange={e => setFormData(p => ({ ...p, customer_id: e.target.value }))} required>
                    <option value="">Select client...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div className="wl-field">
                  <label>Service</label>
                  <select value={formData.service_id} onChange={e => setFormData(p => ({ ...p, service_id: e.target.value }))}>
                    <option value="">Any service</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="wl-field">
                  <label>Preferred Staff</label>
                  <select value={formData.preferred_staff_id} onChange={e => setFormData(p => ({ ...p, preferred_staff_id: e.target.value }))}>
                    <option value="">Any staff</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="wl-field">
                  <label>Branch</label>
                  <select value={formData.branch_id} onChange={e => setFormData(p => ({ ...p, branch_id: e.target.value }))}>
                    <option value="">Any branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="wl-field">
                  <label>Preferred Date</label>
                  <input type="date" value={formData.preferred_date} onChange={e => setFormData(p => ({ ...p, preferred_date: e.target.value }))} />
                </div>
                <div className="wl-field wl-field-half">
                  <label>Time Range</label>
                  <div className="wl-time-range">
                    <input type="time" value={formData.preferred_time_start} onChange={e => setFormData(p => ({ ...p, preferred_time_start: e.target.value }))} placeholder="From" />
                    <span>to</span>
                    <input type="time" value={formData.preferred_time_end} onChange={e => setFormData(p => ({ ...p, preferred_time_end: e.target.value }))} placeholder="To" />
                  </div>
                </div>
                <div className="wl-field">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: parseInt(e.target.value) }))}>
                    <option value={0}>Normal</option>
                    <option value={1}>High</option>
                    <option value={2}>Urgent</option>
                  </select>
                </div>
              </div>
              <div className="wl-field" style={{ marginTop: 16 }}>
                <label>Notes</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." />
              </div>
              <div className="wl-modal-actions">
                <button type="button" className="wl-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="wl-btn-primary">{editingItem ? 'Save Changes' : 'Add to Waitlist'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
