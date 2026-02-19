import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Badge } from 'react-bootstrap';
import { Users, Plus, Edit2, Calendar, Clock, MapPin, UserPlus, X, Save, Check, XCircle, Search, Eye, ChevronRight, CreditCard, FileText, Receipt, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import './GroupBookings.css';

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
  confirmed: { color: '#3b82f6', bg: '#dbeafe', label: 'Confirmed' },
  in_progress: { color: '#8b5cf6', bg: '#ede9fe', label: 'In Progress' },
  completed: { color: '#22c55e', bg: '#dcfce7', label: 'Completed' },
  cancelled: { color: '#ef4444', bg: '#fee2e2', label: 'Cancelled' },
};

export default function GroupBookings() {
  const { symbol: curr } = useCurrency();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '', branch_id: '', organizer_contact_id: '', event_date: '', start_time: '', end_time: '',
    max_participants: 20, notes: '', participants: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bkRes, statRes, svcRes, cRes, stRes, brRes] = await Promise.all([
        api.get(`/group-bookings${filter ? `?status=${filter}` : ''}`),
        api.get('/group-bookings/stats'),
        api.get('/products?active=true'),
        api.get('/contacts?limit=200'),
        api.get('/staff?limit=200'),
        api.get('/branches'),
      ]);
      if (bkRes.success) setBookings(bkRes.data || []);
      if (statRes.success) setStats(statRes.data || {});
      if (svcRes.success) setServices(svcRes.data || []);
      if (cRes.success) setClients(cRes.data || []);
      if (stRes.success) setStaffList(stRes.data || []);
      if (brRes.success) setBranches(brRes.data || []);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load data', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredBookings = bookings.filter(b => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (b.name || '').toLowerCase().includes(q) || (b.organizer_first_name || '').toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', branch_id: '', organizer_contact_id: '', event_date: '', start_time: '', end_time: '', max_participants: 20, notes: '', participants: [] });
    setShowModal(true);
  };

  const openDetail = async (b) => {
    try {
      const res = await api.get(`/group-bookings/${b.id}`);
      if (res.success) setShowDetail(res.data);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load details', confirmButtonColor: '#f2421b' });
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.event_date || !form.start_time) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Event name, date and start time are required', confirmButtonColor: '#f2421b' });
      return;
    }
    try {
      if (editing) {
        await api.patch(`/group-bookings/${editing.id}`, form);
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/group-bookings', form);
        Swal.fire({ icon: 'success', title: 'Group Booking Created!', timer: 2000, showConfirmButton: false });
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save booking', confirmButtonColor: '#f2421b' });
    }
  };

  const updateStatus = async (id, status) => {
    const result = await Swal.fire({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Booking?`,
      text: `Are you sure you want to mark this booking as ${status}?`,
      icon: status === 'cancelled' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'cancelled' ? '#ef4444' : '#f2421b',
      confirmButtonText: `Yes, ${status}`
    });
    if (!result.isConfirmed) return;

    try {
      await api.patch(`/group-bookings/${id}`, { status });
      Swal.fire({ icon: 'success', title: `Booking ${status}!`, timer: 1500, showConfirmButton: false });
      fetchData();
      if (showDetail?.id === id) {
        const res = await api.get(`/group-bookings/${id}`);
        if (res.success) setShowDetail(res.data);
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status', confirmButtonColor: '#f2421b' });
    }
  };

  // ── Confirm: auto-creates appointments for each participant ──
  const confirmBooking = async (id) => {
    const result = await Swal.fire({
      title: 'Confirm Group Booking?',
      html: `<p style="color:#555;">This will:<br/>✅ Create <b>individual appointments</b> for each participant<br/>✅ Show them on the staff calendar</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Confirm & Create Appointments'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.post(`/group-bookings/${id}/confirm`);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Confirmed!',
          html: `<p>${res.data?.appointments_created || 0} appointment(s) created and added to the calendar.</p>`,
          confirmButtonColor: '#f2421b'
        });
        fetchData();
        if (showDetail?.id === id) {
          const detailRes = await api.get(`/group-bookings/${id}`);
          if (detailRes.success) setShowDetail(detailRes.data);
        }
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'Failed to confirm', confirmButtonColor: '#f2421b' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message || 'Failed to confirm booking', confirmButtonColor: '#f2421b' });
    }
  };

  // ── Checkout: auto-creates combined invoice ──
  const checkoutBooking = async (id) => {
    const { value: formValues } = await Swal.fire({
      title: 'Checkout Group Booking',
      html: `
        <div style="text-align:left;">
          <p style="color:#555;margin-bottom:16px;">This will create a <b>combined invoice</b> for all participant services.</p>
          <div style="margin-bottom:10px;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">Payment Method</label>
            <select id="swal-payment" class="swal2-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">Tax Rate (%)</label>
            <input id="swal-tax" type="number" class="swal2-input" value="5" style="width:100%;margin:0;padding:8px;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">Discount</label>
            <input id="swal-discount" type="number" class="swal2-input" value="0" style="width:100%;margin:0;padding:8px;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input id="swal-paynow" type="checkbox" checked style="width:18px;height:18px;" />
              <span style="font-weight:600;">Mark as Paid Now</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Generate Invoice',
      focusConfirm: false,
      preConfirm: () => ({
        payment_method: document.getElementById('swal-payment').value,
        tax_rate: parseFloat(document.getElementById('swal-tax').value) || 0,
        discount_amount: parseFloat(document.getElementById('swal-discount').value) || 0,
        pay_now: document.getElementById('swal-paynow').checked
      })
    });

    if (!formValues) return;

    try {
      const res = await api.post(`/group-bookings/${id}/checkout`, formValues);
      if (res.success) {
        const goToInvoice = await Swal.fire({
          icon: 'success',
          title: 'Invoice Created!',
          html: `
            <p style="margin:0;">Invoice <b>${res.data?.invoice_number}</b> created</p>
            <p style="font-size:24px;font-weight:700;color:#f2421b;margin:12px 0;">${curr} ${parseFloat(res.data?.total || 0).toFixed(2)}</p>
            <p style="color:#666;">${res.data?.items_count} service(s) • ${res.data?.status === 'paid' ? '✅ Paid' : '📄 Pending'}</p>
          `,
          showCancelButton: true,
          confirmButtonColor: '#f2421b',
          confirmButtonText: 'View Invoice',
          cancelButtonText: 'Close'
        });

        if (goToInvoice.isConfirmed) {
          navigate('/beauty-payments');
        }

        fetchData();
        if (showDetail?.id === id) {
          const detailRes = await api.get(`/group-bookings/${id}`);
          if (detailRes.success) setShowDetail(detailRes.data);
        }
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'Failed to checkout', confirmButtonColor: '#f2421b' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message || 'Failed to checkout booking', confirmButtonColor: '#f2421b' });
    }
  };

  const handleDelete = () => {
    Swal.fire({
      title: 'Cannot Delete',
      html: `<p style="margin:0;color:#666;">For complete removal, please contact support:</p><p style="margin:8px 0 0;"><strong>📧 info@trasealla.com</strong></p>`,
      icon: 'info',
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'OK'
    });
  };

  const addParticipant = () => {
    setForm(p => ({
      ...p,
      participants: [...p.participants, { contact_id: '', guest_name: '', service_id: '', staff_id: '' }]
    }));
  };

  const updateParticipant = (idx, field, value) => {
    setForm(p => ({
      ...p,
      participants: p.participants.map((pt, i) => i === idx ? { ...pt, [field]: value } : pt)
    }));
  };

  const removeParticipant = (idx) => {
    setForm(p => ({ ...p, participants: p.participants.filter((_, i) => i !== idx) }));
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="gb-page">
      {/* Header */}
      <div className="gb-header">
        <div className="gb-header-left">
          <div className="gb-header-icon-wrap">
            <Users size={24} />
          </div>
          <div>
            <h2 className="gb-title">Group Bookings</h2>
            <p className="gb-subtitle">Manage group events, bridal parties, and team bookings</p>
          </div>
        </div>
        <button className="gb-add-btn" data-tooltip="New group booking" onClick={openCreate}><Plus size={16} /> New Group Booking</button>
      </div>

      {/* Stats Cards */}
      <div className="gb-stats-grid">
        <div className="gb-stat-card">
          <div className="gb-stat-icon" style={{ background: 'rgba(242,66,27,0.1)' }}>
            <Users size={20} color="#f2421b" />
          </div>
          <div>
            <div className="gb-stat-value">{stats.total || 0}</div>
            <div className="gb-stat-label">Total</div>
          </div>
        </div>
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'cancelled').map(([key, cfg]) => (
          <div key={key} className="gb-stat-card">
            <div className="gb-stat-icon" style={{ background: cfg.bg }}>
              {key === 'pending' && <Clock size={20} color={cfg.color} />}
              {key === 'confirmed' && <Check size={20} color={cfg.color} />}
              {key === 'in_progress' && <ChevronRight size={20} color={cfg.color} />}
              {key === 'completed' && <Check size={20} color={cfg.color} />}
            </div>
            <div>
              <div className="gb-stat-value" style={{ color: cfg.color }}>{stats[key] || 0}</div>
              <div className="gb-stat-label">{cfg.label}</div>
            </div>
          </div>
        ))}
        <div className="gb-stat-card">
          <div className="gb-stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <UserPlus size={20} color="#6366f1" />
          </div>
          <div>
            <div className="gb-stat-value" style={{ color: '#6366f1' }}>{stats.total_participants || 0}</div>
            <div className="gb-stat-label">Participants</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gb-toolbar">
        <div className="gb-search-wrap">
          <Search size={15} className="gb-search-icon" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gb-search-input"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="gb-filter-select">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Booking Cards */}
      <div className="gb-grid">
        {loading ? (
          <div className="gb-loading">
            <div className="gb-spinner" />
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="gb-empty">
            <Users size={48} strokeWidth={1} />
            <h4>No group bookings</h4>
            <p>Create a group booking for events, parties, or team sessions.</p>
            <button className="gb-add-btn" onClick={openCreate}>
              <Plus size={16} /> New Booking
            </button>
          </div>
        ) : (
          filteredBookings.map(b => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            return (
              <div key={b.id} className="gb-card" onClick={() => openDetail(b)}>
                <div className="gb-card-top">
                  <span className="gb-status-pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="gb-card-date"><Calendar size={12} /> {formatDate(b.event_date)}</span>
                </div>
                <h4 className="gb-card-name">{b.name}</h4>
                <div className="gb-card-meta">
                  <span><Clock size={12} /> {b.start_time?.slice(0, 5)} {b.end_time ? `– ${b.end_time.slice(0, 5)}` : ''}</span>
                  {b.branch_name && <span><MapPin size={12} /> {b.branch_name}</span>}
                </div>
                <div className="gb-card-bottom">
                  <div className="gb-participant-indicator">
                    <div className="gb-participant-bar">
                      <div className="gb-participant-fill" style={{ width: `${Math.min(((b.participant_count || 0) / (b.max_participants || 1)) * 100, 100)}%` }} />
                    </div>
                    <span>{b.participant_count || 0} / {b.max_participants}</span>
                  </div>
                  {b.organizer_first_name && <span className="gb-organizer">by {b.organizer_first_name}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Create/Edit Modal ═══ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="gb-modal-header">
          <Modal.Title><Users size={18} /> {editing ? 'Edit' : 'New'} Group Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: 24 }}>
          <div className="gb-form-grid">
            <Form.Group>
              <Form.Label>Event Name <span className="text-danger">*</span></Form.Label>
              <Form.Control value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sarah's Bridal Party" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Branch</Form.Label>
              <Form.Select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}>
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Date <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Start Time <span className="text-danger">*</span></Form.Label>
              <Form.Control type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>End Time</Form.Label>
              <Form.Control type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Max Participants</Form.Label>
              <Form.Control type="number" value={form.max_participants} onChange={e => setForm(p => ({ ...p, max_participants: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Organizer</Form.Label>
              <Form.Select value={form.organizer_contact_id} onChange={e => setForm(p => ({ ...p, organizer_contact_id: e.target.value }))}>
                <option value="">Select organizer</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="gb-full-width">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special requests or notes..." />
            </Form.Group>
          </div>

          {/* Participants */}
          <div className="gb-participants-section">
            <div className="gb-participants-header">
              <h5><Users size={16} /> Participants ({form.participants.length})</h5>
              <button className="gb-add-participant" data-tooltip="Add participant" onClick={addParticipant}><UserPlus size={14} /> Add</button>
            </div>
            {form.participants.length === 0 && (
              <div className="gb-no-participants">
                <p>No participants added yet. Click "Add" to add participants.</p>
              </div>
            )}
            {form.participants.map((p, idx) => (
              <div key={idx} className="gb-participant-row">
                <Form.Select value={p.contact_id} onChange={e => updateParticipant(idx, 'contact_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Guest / Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </Form.Select>
                <Form.Control placeholder="Or guest name" value={p.guest_name || ''} onChange={e => updateParticipant(idx, 'guest_name', e.target.value)} style={{ flex: 1 }} />
                <Form.Select value={p.service_id} onChange={e => updateParticipant(idx, 'service_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
                <Form.Select value={p.staff_id} onChange={e => updateParticipant(idx, 'staff_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Staff</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </Form.Select>
                <button className="gb-remove-participant" data-tooltip="Remove participant" onClick={() => removeParticipant(idx)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="gb-modal-footer">
          <button className="gb-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="gb-btn-primary" onClick={handleSave}><Save size={14} /> {editing ? 'Update' : 'Create'}</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Detail Modal ═══ */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} size="lg" centered>
        <Modal.Header closeButton className="gb-modal-header">
          <Modal.Title><Users size={18} /> {showDetail?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 24 }}>
          {showDetail && (
            <div className="gb-detail">
              <div className="gb-detail-info-grid">
                <div className="gb-detail-item">
                  <Calendar size={15} />
                  <div>
                    <span className="gb-detail-label">Date</span>
                    <span className="gb-detail-value">{formatDate(showDetail.event_date)}</span>
                  </div>
                </div>
                <div className="gb-detail-item">
                  <Clock size={15} />
                  <div>
                    <span className="gb-detail-label">Time</span>
                    <span className="gb-detail-value">{showDetail.start_time?.slice(0, 5)} {showDetail.end_time ? `– ${showDetail.end_time.slice(0, 5)}` : ''}</span>
                  </div>
                </div>
                {showDetail.branch_name && (
                  <div className="gb-detail-item">
                    <MapPin size={15} />
                    <div>
                      <span className="gb-detail-label">Branch</span>
                      <span className="gb-detail-value">{showDetail.branch_name}</span>
                    </div>
                  </div>
                )}
                <div className="gb-detail-item">
                  <Users size={15} />
                  <div>
                    <span className="gb-detail-label">Status</span>
                    <span className="gb-status-pill" style={{ background: STATUS_CONFIG[showDetail.status]?.bg, color: STATUS_CONFIG[showDetail.status]?.color }}>
                      {STATUS_CONFIG[showDetail.status]?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="gb-status-actions">
                {showDetail.status === 'pending' && (
                  <button className="gb-action-btn confirm" onClick={() => confirmBooking(showDetail.id)}>
                    <CheckCircle2 size={14} /> Confirm & Create Appointments
                  </button>
                )}
                {showDetail.status === 'confirmed' && (
                  <button className="gb-action-btn start" onClick={() => updateStatus(showDetail.id, 'in_progress')}>
                    <ChevronRight size={14} /> Start Session
                  </button>
                )}
                {(showDetail.status === 'confirmed' || showDetail.status === 'in_progress') && (
                  <button className="gb-action-btn checkout" onClick={() => checkoutBooking(showDetail.id)}>
                    <Receipt size={14} /> Checkout & Invoice
                  </button>
                )}
                {showDetail.status === 'completed' && (
                  <button className="gb-action-btn invoice-link" onClick={() => navigate('/beauty-payments')}>
                    <FileText size={14} /> View Invoice
                  </button>
                )}
                {showDetail.status !== 'cancelled' && showDetail.status !== 'completed' && (
                  <button className="gb-action-btn cancel" onClick={() => updateStatus(showDetail.id, 'cancelled')}>
                    <XCircle size={14} /> Cancel
                  </button>
                )}
              </div>

              {/* Flow Indicator */}
              <div className="gb-flow-indicator">
                <div className={`gb-flow-step ${['pending','confirmed','in_progress','completed'].indexOf(showDetail.status) >= 0 ? 'active' : ''}`}>
                  <div className="gb-flow-dot" />
                  <span>Created</span>
                </div>
                <div className="gb-flow-line" />
                <div className={`gb-flow-step ${['confirmed','in_progress','completed'].indexOf(showDetail.status) >= 0 ? 'active' : ''}`}>
                  <div className="gb-flow-dot" />
                  <span>Confirmed</span>
                </div>
                <div className="gb-flow-line" />
                <div className={`gb-flow-step ${['in_progress','completed'].indexOf(showDetail.status) >= 0 ? 'active' : ''}`}>
                  <div className="gb-flow-dot" />
                  <span>In Progress</span>
                </div>
                <div className="gb-flow-line" />
                <div className={`gb-flow-step ${showDetail.status === 'completed' ? 'active' : ''}`}>
                  <div className="gb-flow-dot" />
                  <span>Invoiced</span>
                </div>
              </div>

              {/* Participants */}
              <div className="gb-detail-section">
                <h5><Users size={16} /> Participants ({(showDetail.participants || []).length})</h5>
                {(showDetail.participants || []).length > 0 ? (
                  <table className="gb-participants-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Service</th>
                        <th>Staff</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showDetail.participants || []).map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="gb-participant-name">
                              <div className="gb-avatar-sm">{(p.contact_first_name || p.guest_name || '?')[0].toUpperCase()}</div>
                              {p.contact_first_name ? `${p.contact_first_name} ${p.contact_last_name || ''}` : p.guest_name || '—'}
                            </div>
                          </td>
                          <td>{p.service_name || '—'}</td>
                          <td>{p.staff_name || '—'}</td>
                          <td>
                            <span className="gb-status-pill small" style={{ background: STATUS_CONFIG[p.status]?.bg || '#f3f4f6', color: STATUS_CONFIG[p.status]?.color || '#666' }}>
                              {STATUS_CONFIG[p.status]?.label || p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="gb-no-participants">
                    <p>No participants added yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
