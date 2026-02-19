import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Search, Plus, Eye, Xmark, Check, WarningTriangle,
  Calendar, Star, Heart, Phone, Mail, Clock, Edit, Trash,
  FilterList, SortDown, NavArrowDown, NavArrowRight, Instagram,
  UserPlus, CreditCard, Gift, ArrowRight, Activity, MoreVert,
  Notes, StarSolid, Copy, List
} from 'iconoir-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import SEO from '../components/SEO';

/* ═══════════════════════════════════════════════
   BeautyClients – Premium Client Management
   ═══════════════════════════════════════════════ */
export default function BeautyClients() {
  const { symbol, format: formatCurrency } = useCurrency();
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form
  const [form, setForm] = useState(getEmptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  function getEmptyForm() {
    return {
      first_name: '', last_name: '', email: '', phone: '', mobile: '',
      gender: '', date_of_birth: '', notes: '', source: 'walk-in',
      address: '', instagram: '', allergies: '', referral_source: '',
    };
  }

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  /* ─── Fetch clients ─── */
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '500', sort: sortBy });
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSource) params.append('source', filterSource);

      const data = await api.get(`/contacts?${params}`);
      if (data.success) {
        setClients(data.data || []);
        setAllClients(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, filterStatus, filterSource]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get('/contacts/stats');
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(null);
        else if (showAddEdit) setShowAddEdit(false);
        else if (showDetail) { setShowDetail(false); setDetailClient(null); }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showDeleteConfirm, showAddEdit, showDetail]);

  /* ─── Open client detail ─── */
  const openDetail = async (client) => {
    setDetailClient(client);
    setDetailData(null);
    setDetailTab('overview');
    setShowDetail(true);
    try {
      const res = await api.get(`/contacts/${client.id}`);
      if (res.success) setDetailData(res.data);
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    }
  };

  /* ─── Open add/edit ─── */
  const openAddEdit = (client = null) => {
    if (client) {
      setEditingClient(client);
      setForm({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        mobile: client.mobile || '',
        gender: client.gender || '',
        date_of_birth: client.date_of_birth ? client.date_of_birth.split('T')[0] : '',
        notes: client.notes || '',
        source: client.source || 'walk-in',
        address: client.address || '',
        instagram: client.instagram || '',
        allergies: client.allergies || '',
        referral_source: client.referral_source || '',
      });
    } else {
      setEditingClient(null);
      setForm(getEmptyForm());
    }
    setFormErrors({});
    setShowAddEdit(true);
  };

  /* ─── Save client ─── */
  const handleSave = async () => {
    const errors = {};
    if (!form.first_name.trim()) errors.first_name = 'First name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email';
    if (form.phone && !/^[+]?[\d\s\-()]{7,20}$/.test(form.phone)) errors.phone = 'Invalid phone';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.date_of_birth) delete payload.date_of_birth;

      if (editingClient) {
        await api.patch(`/contacts/${editingClient.id}`, payload);
        showToast('success', 'Client updated successfully');
      } else {
        await api.post('/contacts', payload);
        showToast('success', 'Client added successfully');
      }
      setShowAddEdit(false);
      fetchClients();
      fetchStats();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete client ─── */
  const handleDelete = async (id) => {
    try {
      await api.delete(`/contacts/${id}`);
      showToast('success', 'Client deleted successfully');
      setShowDeleteConfirm(null);
      if (showDetail && detailClient?.id === id) { setShowDetail(false); setDetailClient(null); }
      fetchClients();
      fetchStats();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete';
      showToast('error', msg);
    }
  };

  /* ─── Helpers ─── */
  const getInitials = (fn, ln) => `${fn?.charAt(0) || ''}${ln?.charAt(0) || ''}`.toUpperCase();
  const avatarColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ];
  const getAvatarColor = (id) => avatarColors[(id || 0) % avatarColors.length];

  const tierInfo = {
    bronze: { label: 'Bronze', color: '#CD7F32', bg: '#FFF3E0', icon: '🥉' },
    silver: { label: 'Silver', color: '#757575', bg: '#F5F5F5', icon: '🥈' },
    gold: { label: 'Gold', color: '#F9A825', bg: '#FFFDE7', icon: '🥇' },
    platinum: { label: 'Platinum', color: '#5C6BC0', bg: '#E8EAF6', icon: '💎' },
  };
  const getTier = (t) => tierInfo[t] || { label: 'Standard', color: '#9e9e9e', bg: '#f5f5f5', icon: '⭐' };

  const sourceLabels = {
    'walk-in': '🚶 Walk-in',
    'online': '🌐 Online',
    'referral': '👥 Referral',
    'social': '📱 Social Media',
    'campaign': '📧 Campaign',
    'other': '📋 Other',
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getVisitFrequency = (appts) => {
    if (!appts || appts.length < 2) return 'N/A';
    const dates = appts.map(a => new Date(a.appointment_date)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    const avg = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
    if (avg <= 7) return 'Weekly';
    if (avg <= 14) return 'Bi-weekly';
    if (avg <= 30) return 'Monthly';
    return `Every ~${avg} days`;
  };

  const SOURCES = [
    { id: '', label: 'All Sources' },
    { id: 'walk-in', label: '🚶 Walk-in' },
    { id: 'online', label: '🌐 Online' },
    { id: 'referral', label: '👥 Referral' },
    { id: 'social', label: '📱 Social' },
    { id: 'campaign', label: '📧 Campaign' },
    { id: 'other', label: '📋 Other' },
  ];

  const SORT_OPTIONS = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'name_asc', label: 'Name A-Z' },
    { id: 'name_desc', label: 'Name Z-A' },
    { id: 'spent_high', label: 'Highest Spend' },
    { id: 'spent_low', label: 'Lowest Spend' },
    { id: 'recent_visit', label: 'Recent Visit' },
  ];

  return (
    <div className="cl-page">
      <SEO page="beauty-clients" />
      <style>{CSS}</style>

      {/* Toast */}
      {toast.show && (
        <div className={`cl-toast cl-toast-${toast.type}`}>
          {toast.type === 'success' ? <Check width={18} height={18} /> : <WarningTriangle width={18} height={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── Hero Header ─── */}
      <div className="cl-hero">
        <div className="cl-hero-content">
          <div className="cl-hero-icon">
            <User width={28} height={28} />
          </div>
          <div>
            <h1 className="cl-hero-title">Client Management</h1>
            <p className="cl-hero-sub">Manage your beauty clients, track visits & build relationships</p>
          </div>
        </div>
        <div className="cl-hero-actions">
          <button className="cl-btn cl-btn-outline" data-tooltip="Filter clients" onClick={() => setShowFilters(!showFilters)}>
            <FilterList width={16} height={16} /> Filters
          </button>
          <button className="cl-btn cl-btn-primary" data-tooltip="Add new client" onClick={() => openAddEdit()}>
            <Plus width={16} height={16} /> Add Client
          </button>
        </div>
      </div>

      {/* ─── Stats Strip ─── */}
      <div className="cl-stats">
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}><User width={22} height={22} /></div>
          <div className="cl-stat-body">
            <div className="cl-stat-value">{stats?.total || 0}</div>
            <div className="cl-stat-label">Total Clients</div>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}><Check width={22} height={22} /></div>
          <div className="cl-stat-body">
            <div className="cl-stat-value">{stats?.active || 0}</div>
            <div className="cl-stat-label">Active</div>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#FDF2F8', color: '#DB2777' }}><Heart width={22} height={22} /></div>
          <div className="cl-stat-body">
            <div className="cl-stat-value">{stats?.vip || 0}</div>
            <div className="cl-stat-label">VIP Members</div>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#FFF7ED', color: '#f2421b' }}><UserPlus width={22} height={22} /></div>
          <div className="cl-stat-body">
            <div className="cl-stat-value">{stats?.newThisMonth || 0}</div>
            <div className="cl-stat-label">New This Month</div>
          </div>
        </div>
      </div>

      {/* ─── Filters Bar ─── */}
      {showFilters && (
        <div className="cl-filters-bar">
          <div className="cl-filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="cl-filter-group">
            <label>Source</label>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="cl-filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <button className="cl-btn cl-btn-text" data-tooltip="Reset all filters" onClick={() => { setFilterStatus(''); setFilterSource(''); setSortBy('newest'); }}>
            Clear All
          </button>
        </div>
      )}

      {/* ─── Client List ─── */}
      <div className="cl-list-card">
        {/* Search bar */}
        <div className="cl-list-header">
          <div className="cl-search-wrap">
            <Search width={18} height={18} className="cl-search-icon" />
            <input
              type="text"
              className="cl-search-input"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="cl-search-clear" data-tooltip="Clear search" onClick={() => setSearch('')}><Xmark width={14} height={14} /></button>
            )}
          </div>
          <div className="cl-list-count">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="cl-loading">
            <div className="cl-spinner" />
            <p>Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-icon"><User width={48} height={48} /></div>
            <h3>No clients found</h3>
            <p>{search ? 'Try a different search term' : 'Add your first client to get started'}</p>
            {!search && (
              <button className="cl-btn cl-btn-primary" onClick={() => openAddEdit()}>
                <Plus width={16} height={16} /> Add First Client
              </button>
            )}
          </div>
        ) : (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Tier</th>
                  <th>Total Spent</th>
                  <th>Last Visit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const tier = getTier(c.loyalty_tier);
                  return (
                    <tr key={c.id} className="cl-row" onClick={() => openDetail(c)}>
                      <td>
                        <div className="cl-client-cell">
                          <div className="cl-avatar" style={{ background: getAvatarColor(c.id) }}>
                            {getInitials(c.first_name, c.last_name)}
                          </div>
                          <div>
                            <div className="cl-name">{c.first_name} {c.last_name}</div>
                            <div className="cl-since">Since {formatDate(c.created_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cl-contact-info">
                          {c.phone && <span><Phone width={13} height={13} /> {c.phone}</span>}
                          {c.email && <span><Mail width={13} height={13} /> {c.email}</span>}
                          {!c.phone && !c.email && <span className="cl-muted">No contact info</span>}
                        </div>
                      </td>
                      <td>
                        <span className="cl-tier-badge" style={{ background: tier.bg, color: tier.color }}>
                          {tier.icon} {tier.label}
                        </span>
                      </td>
                      <td>
                        <span className="cl-spent">{symbol} {parseFloat(c.total_spent || 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </td>
                      <td>
                        <span className="cl-visit">{c.last_visit ? formatDate(c.last_visit) : '—'}</span>
                      </td>
                      <td>
                        <span className={`cl-status cl-status-${c.status || 'active'}`}>{c.status || 'Active'}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="cl-actions">
                          <button className="cl-act-btn" title="View" data-tooltip="View client" onClick={() => openDetail(c)}>
                            <Eye width={16} height={16} />
                          </button>
                          <button className="cl-act-btn" title="Edit" data-tooltip="Edit client" onClick={() => openAddEdit(c)}>
                            <Edit width={16} height={16} />
                          </button>
                          <button className="cl-act-btn cl-act-danger" title="Delete" data-tooltip="Delete client" onClick={() => setShowDeleteConfirm(c)}>
                            <Trash width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {showAddEdit && createPortal(
        <div className="cl-modal-overlay" onClick={() => setShowAddEdit(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <div>
                <h2>{editingClient ? '✏️ Edit Client' : '✨ New Client'}</h2>
                <p className="cl-modal-sub">{editingClient ? 'Update client information' : 'Add a new beauty client'}</p>
              </div>
              <button className="cl-modal-close" data-tooltip="Close" onClick={() => setShowAddEdit(false)}>
                <Xmark width={18} height={18} />
              </button>
            </div>
            <div className="cl-modal-body">
              {/* Row 1: Name */}
              <div className="cl-form-row">
                <div className={`cl-field ${formErrors.first_name ? 'error' : ''}`}>
                  <label>First Name <span className="cl-req">*</span></label>
                  <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="e.g., Sarah" />
                  {formErrors.first_name && <span className="cl-field-error">{formErrors.first_name}</span>}
                </div>
                <div className="cl-field">
                  <label>Last Name</label>
                  <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="e.g., Johnson" />
                </div>
              </div>

              {/* Row 2: Contact */}
              <div className="cl-form-row">
                <div className={`cl-field ${formErrors.email ? 'error' : ''}`}>
                  <label><Mail width={14} height={14} /> Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                  {formErrors.email && <span className="cl-field-error">{formErrors.email}</span>}
                </div>
                <div className={`cl-field ${formErrors.phone ? 'error' : ''}`}>
                  <label><Phone width={14} height={14} /> Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971 50 123 4567" />
                  {formErrors.phone && <span className="cl-field-error">{formErrors.phone}</span>}
                </div>
              </div>

              {/* Row 3: Gender & DOB */}
              <div className="cl-form-row">
                <div className="cl-field">
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="cl-field">
                  <label><Calendar width={14} height={14} /> Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                </div>
              </div>

              {/* Row 4: Source & Instagram */}
              <div className="cl-form-row">
                <div className="cl-field">
                  <label>Source</label>
                  <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    <option value="walk-in">🚶 Walk-in</option>
                    <option value="online">🌐 Online Booking</option>
                    <option value="referral">👥 Referral</option>
                    <option value="social">📱 Social Media</option>
                    <option value="campaign">📧 Campaign</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                <div className="cl-field">
                  <label><Instagram width={14} height={14} /> Instagram</label>
                  <input type="text" value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@username" />
                </div>
              </div>

              {/* Row 5: Address */}
              <div className="cl-field cl-field-full">
                <label>Address</label>
                <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="City, Area..." />
              </div>

              {/* Row 6: Allergies */}
              <div className="cl-field cl-field-full">
                <label>⚠️ Allergies / Sensitivities</label>
                <input type="text" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g., Latex allergy, sensitive skin..." />
              </div>

              {/* Row 7: Notes */}
              <div className="cl-field cl-field-full">
                <label><Notes width={14} height={14} /> Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any preferences or important notes..." rows={3} />
              </div>
            </div>
            <div className="cl-modal-footer">
              <button className="cl-btn cl-btn-ghost" onClick={() => setShowAddEdit(false)}>Cancel</button>
              <button className="cl-btn cl-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingClient ? '✓ Update Client' : '✓ Add Client')}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Client Detail Slide-over ─── */}
      {showDetail && detailClient && createPortal(
        <div className="cl-detail-overlay" onClick={() => { setShowDetail(false); setDetailClient(null); }}>
          <div className="cl-detail-panel" onClick={e => e.stopPropagation()}>
            {/* Detail Header */}
            <div className="cl-detail-header">
              <button className="cl-detail-close" data-tooltip="Close panel" onClick={() => { setShowDetail(false); setDetailClient(null); }}>
                <Xmark width={20} height={20} />
              </button>
              <div className="cl-detail-avatar" style={{ background: getAvatarColor(detailClient.id) }}>
                {getInitials(detailClient.first_name, detailClient.last_name)}
              </div>
              <h2>{detailClient.first_name} {detailClient.last_name}</h2>
              <div className="cl-detail-meta">
                {detailClient.email && <span><Mail width={14} height={14} /> {detailClient.email}</span>}
                {detailClient.phone && <span><Phone width={14} height={14} /> {detailClient.phone}</span>}
              </div>
              <div className="cl-detail-badges">
                {(() => { const t = getTier(detailClient.loyalty_tier); return (
                  <span className="cl-tier-badge" style={{ background: t.bg, color: t.color }}>{t.icon} {t.label}</span>
                ); })()}
                <span className={`cl-status cl-status-${detailClient.status || 'active'}`}>{detailClient.status || 'Active'}</span>
              </div>
              <div className="cl-detail-quick-actions">
                <button className="cl-btn cl-btn-sm" data-tooltip="Edit client info" onClick={() => { setShowDetail(false); openAddEdit(detailClient); }}>
                  <Edit width={14} height={14} /> Edit
                </button>
                <button className="cl-btn cl-btn-sm cl-btn-danger-outline" data-tooltip="Delete client" onClick={() => setShowDeleteConfirm(detailClient)}>
                  <Trash width={14} height={14} /> Delete
                </button>
              </div>
            </div>

            {/* Detail Stats */}
            <div className="cl-detail-stats">
              <div className="cl-d-stat">
                <CreditCard width={18} height={18} />
                <div>
                  <strong>{symbol} {parseFloat(detailData?.total_spent || detailClient.total_spent || 0).toLocaleString('en', { minimumFractionDigits: 0 })}</strong>
                  <span>Total Spent</span>
                </div>
              </div>
              <div className="cl-d-stat">
                <Calendar width={18} height={18} />
                <div>
                  <strong>{detailData?.appointments?.length || detailClient.total_appointments || 0}</strong>
                  <span>Appointments</span>
                </div>
              </div>
              <div className="cl-d-stat">
                <Star width={18} height={18} />
                <div>
                  <strong>{detailData?.loyalty_points || detailClient.loyalty_points || 0}</strong>
                  <span>Points</span>
                </div>
              </div>
              <div className="cl-d-stat">
                <Clock width={18} height={18} />
                <div>
                  <strong>{getVisitFrequency(detailData?.appointments)}</strong>
                  <span>Frequency</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="cl-detail-tabs">
              {[
                { id: 'overview', label: 'Overview', icon: <Eye width={14} height={14} /> },
                { id: 'appointments', label: 'Appointments', icon: <Calendar width={14} height={14} /> },
                { id: 'invoices', label: 'Invoices', icon: <CreditCard width={14} height={14} /> },
                { id: 'loyalty', label: 'Loyalty', icon: <Gift width={14} height={14} /> },
              ].map(tab => (
                <button key={tab.id} className={`cl-tab ${detailTab === tab.id ? 'active' : ''}`} onClick={() => setDetailTab(tab.id)}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="cl-detail-content">
              {!detailData ? (
                <div className="cl-loading"><div className="cl-spinner" /><p>Loading...</p></div>
              ) : detailTab === 'overview' ? (
                <div className="cl-overview">
                  <div className="cl-info-grid">
                    <div className="cl-info-item">
                      <label>Gender</label>
                      <span>{detailData.gender ? detailData.gender.charAt(0).toUpperCase() + detailData.gender.slice(1) : '—'}</span>
                    </div>
                    <div className="cl-info-item">
                      <label>Date of Birth</label>
                      <span>{detailData.date_of_birth ? formatDate(detailData.date_of_birth) : '—'}</span>
                    </div>
                    <div className="cl-info-item">
                      <label>Source</label>
                      <span>{sourceLabels[detailData.source] || detailData.source || '—'}</span>
                    </div>
                    <div className="cl-info-item">
                      <label>Instagram</label>
                      <span>{detailData.instagram || '—'}</span>
                    </div>
                    <div className="cl-info-item">
                      <label>Mobile</label>
                      <span>{detailData.mobile || '—'}</span>
                    </div>
                    <div className="cl-info-item">
                      <label>Member Since</label>
                      <span>{formatDate(detailData.created_at)}</span>
                    </div>
                  </div>
                  {detailData.address && (
                    <div className="cl-info-block">
                      <label>📍 Address</label>
                      <p>{detailData.address}</p>
                    </div>
                  )}
                  {detailData.allergies && (
                    <div className="cl-info-block cl-warning-block">
                      <label>⚠️ Allergies / Sensitivities</label>
                      <p>{detailData.allergies}</p>
                    </div>
                  )}
                  {detailData.notes && (
                    <div className="cl-info-block">
                      <label>📝 Notes</label>
                      <p>{detailData.notes}</p>
                    </div>
                  )}
                  {!detailData.address && !detailData.allergies && !detailData.notes && !detailData.gender && !detailData.instagram && (
                    <div className="cl-empty-tab">No additional info. <button className="cl-link-btn" onClick={() => { setShowDetail(false); openAddEdit(detailClient); }}>Add details →</button></div>
                  )}
                </div>
              ) : detailTab === 'appointments' ? (
                <div className="cl-appt-list">
                  {!detailData.appointments?.length ? (
                    <div className="cl-empty-tab">No appointments yet.</div>
                  ) : detailData.appointments.map(a => (
                    <div key={a.id} className="cl-appt-item">
                      <div className="cl-appt-date">
                        <div className="cl-appt-month">{new Date(a.appointment_date).toLocaleDateString('en', { month: 'short' })}</div>
                        <div className="cl-appt-day">{new Date(a.appointment_date).getDate()}</div>
                      </div>
                      <div className="cl-appt-info">
                        <div className="cl-appt-service">{a.service_name || 'Service'}</div>
                        <div className="cl-appt-staff">{a.staff_name || 'Staff'} · {a.start_time?.slice(0, 5)}</div>
                      </div>
                      <span className={`cl-status cl-status-${a.status}`}>{a.status?.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              ) : detailTab === 'invoices' ? (
                <div className="cl-invoice-list">
                  {!detailData.invoices?.length ? (
                    <div className="cl-empty-tab">No invoices yet.</div>
                  ) : detailData.invoices.map(inv => (
                    <div key={inv.id} className="cl-invoice-item">
                      <div className="cl-inv-number">{inv.invoice_number}</div>
                      <div className="cl-inv-date">{formatDate(inv.created_at)}</div>
                      <div className="cl-inv-amount">{symbol} {parseFloat(inv.total || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
                      <span className={`cl-status cl-status-${inv.status}`}>{inv.status}</span>
                    </div>
                  ))}
                </div>
              ) : detailTab === 'loyalty' ? (
                <div className="cl-loyalty-tab">
                  <div className="cl-loyalty-summary">
                    <div className="cl-loyalty-card">
                      <span className="cl-loy-label">Current Points</span>
                      <span className="cl-loy-value">{detailData.loyalty_points || 0}</span>
                    </div>
                    <div className="cl-loyalty-card">
                      <span className="cl-loy-label">Total Earned</span>
                      <span className="cl-loy-value">{detailData.loyalty_total_earned || 0}</span>
                    </div>
                    <div className="cl-loyalty-card">
                      <span className="cl-loy-label">Total Redeemed</span>
                      <span className="cl-loy-value">{detailData.loyalty_total_redeemed || 0}</span>
                    </div>
                  </div>
                  <h4 className="cl-section-title">Recent Transactions</h4>
                  {!detailData.loyalty_transactions?.length ? (
                    <div className="cl-empty-tab">No loyalty activity yet.</div>
                  ) : detailData.loyalty_transactions.map(tx => (
                    <div key={tx.id} className="cl-txn-item">
                      <span className={`cl-txn-icon ${tx.transaction_type === 'earn' ? 'positive' : 'negative'}`}>
                        {tx.transaction_type === 'earn' ? '+' : '-'}
                      </span>
                      <div className="cl-txn-info">
                        <div className="cl-txn-desc">{tx.description || tx.transaction_type}</div>
                        <div className="cl-txn-date">{formatDate(tx.created_at)}</div>
                      </div>
                      <span className={`cl-txn-points ${tx.transaction_type === 'earn' ? 'positive' : 'negative'}`}>
                        {tx.transaction_type === 'earn' ? '+' : '-'}{tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Delete Confirmation ─── */}
      {showDeleteConfirm && createPortal(
        <div className="cl-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="cl-delete-dialog" onClick={e => e.stopPropagation()}>
            <div className="cl-delete-icon-wrap">
              <Trash width={28} height={28} color="#dc2626" />
            </div>
            <h3>Delete Client</h3>
            <p>Are you sure you want to delete <strong>{showDeleteConfirm.first_name} {showDeleteConfirm.last_name}</strong>? This will also remove their loyalty data. This action cannot be undone.</p>
            <div className="cl-delete-actions">
              <button className="cl-btn cl-btn-ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="cl-btn cl-btn-danger" onClick={() => handleDelete(showDeleteConfirm.id)}>Delete Client</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CSS – Premium Client Management Design
   ═══════════════════════════════════════════════ */
const CSS = `
.cl-page { padding: 0 0 40px; }

/* ─── Hero ─── */
.cl-hero {
  background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%);
  border-radius: 18px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.cl-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
  border-radius: 50%;
}
.cl-hero-content { display: flex; align-items: center; gap: 16px; z-index: 1; }
.cl-hero-icon {
  width: 52px; height: 52px;
  background: rgba(255,255,255,0.12);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px);
}
.cl-hero-title { font-size: 22px; font-weight: 700; margin: 0; }
.cl-hero-sub { font-size: 13px; opacity: 0.7; margin: 4px 0 0; }
.cl-hero-actions { display: flex; gap: 10px; z-index: 1; }

/* ─── Buttons ─── */
.cl-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600;
  border: none; cursor: pointer;
  transition: all 0.2s;
}
.cl-btn-primary {
  background: linear-gradient(135deg, #f97316 0%, #f2421b 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3);
}
.cl-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249,115,22,0.4); }
.cl-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.cl-btn-outline {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(4px);
}
.cl-btn-outline:hover { background: rgba(255,255,255,0.18); }
.cl-btn-ghost { background: #f1f5f9; color: #475569; }
.cl-btn-ghost:hover { background: #e2e8f0; }
.cl-btn-text { background: none; color: #6366f1; padding: 6px 12px; }
.cl-btn-text:hover { background: #eef2ff; border-radius: 8px; }
.cl-btn-sm { padding: 6px 14px; font-size: 12px; border-radius: 8px; }
.cl-btn-danger { background: #dc2626; color: #fff; }
.cl-btn-danger:hover { background: #b91c1c; }
.cl-btn-danger-outline { background: transparent; color: #dc2626; border: 1px solid #fecaca; }
.cl-btn-danger-outline:hover { background: #fef2f2; }

/* ─── Stats ─── */
.cl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.cl-stat-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s;
}
.cl-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.cl-stat-icon {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cl-stat-value { font-size: 24px; font-weight: 800; color: #1e293b; line-height: 1.1; }
.cl-stat-label { font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 2px; }

/* ─── Filters ─── */
.cl-filters-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  margin-bottom: 16px;
}
.cl-filter-group { display: flex; flex-direction: column; gap: 4px; }
.cl-filter-group label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.cl-filter-group select {
  padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; color: #334155; background: #f8fafc;
  cursor: pointer; min-width: 140px;
}
.cl-filter-group select:focus { border-color: #6366f1; outline: none; }

/* ─── Client List Card ─── */
.cl-list-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 18px;
  overflow: hidden;
}
.cl-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;
}
.cl-search-wrap {
  position: relative;
  flex: 1;
  max-width: 420px;
}
.cl-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}
.cl-search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  background: #f8fafc;
  transition: all 0.2s;
}
.cl-search-input:focus {
  border-color: #6366f1;
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.cl-search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: #e2e8f0; border: none; border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b;
}
.cl-list-count { font-size: 13px; color: #94a3b8; font-weight: 500; }

/* ─── Table ─── */
.cl-table-wrap { overflow-x: auto; }
.cl-table {
  width: 100%;
  border-collapse: collapse;
}
.cl-table th {
  text-align: left;
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}
.cl-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #f8fafc;
  font-size: 13px;
  color: #334155;
}
.cl-row { cursor: pointer; transition: background 0.15s; }
.cl-row:hover { background: #f8fafc; }
.cl-row:last-child td { border-bottom: none; }

/* Client cell */
.cl-client-cell { display: flex; align-items: center; gap: 12px; }
.cl-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  flex-shrink: 0; letter-spacing: 0.5px;
}
.cl-name { font-weight: 600; color: #1e293b; }
.cl-since { font-size: 11px; color: #94a3b8; margin-top: 2px; }

/* Contact info */
.cl-contact-info { display: flex; flex-direction: column; gap: 3px; }
.cl-contact-info span {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #64748b;
}
.cl-contact-info svg { color: #94a3b8; flex-shrink: 0; }
.cl-muted { color: #cbd5e1; font-style: italic; font-size: 12px; }

/* Tier badge */
.cl-tier-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.3px; white-space: nowrap;
}

/* Spent */
.cl-spent { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
.cl-visit { font-size: 12px; color: #64748b; }

/* Status */
.cl-status {
  display: inline-flex; padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: capitalize;
}
.cl-status-active { background: #ecfdf5; color: #059669; }
.cl-status-inactive { background: #fef2f2; color: #dc2626; }
.cl-status-confirmed { background: #ecfdf5; color: #059669; }
.cl-status-completed { background: #eff6ff; color: #2563eb; }
.cl-status-pending { background: #fffbeb; color: #d97706; }
.cl-status-cancelled, .cl-status-no_show { background: #fef2f2; color: #dc2626; }
.cl-status-paid { background: #ecfdf5; color: #059669; }
.cl-status-draft { background: #f1f5f9; color: #64748b; }
.cl-status-overdue { background: #fef2f2; color: #dc2626; }

/* Actions */
.cl-actions { display: flex; gap: 4px; }
.cl-act-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b;
  transition: all 0.2s;
}
.cl-act-btn:hover { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.cl-act-danger:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

/* ─── Loading / Empty ─── */
.cl-loading { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; color: #94a3b8; }
.cl-spinner {
  width: 36px; height: 36px; border: 3px solid #f1f5f9; border-top-color: #6366f1;
  border-radius: 50%; animation: clSpin 0.8s linear infinite; margin-bottom: 12px;
}
@keyframes clSpin { to { transform: rotate(360deg); } }
.cl-empty { text-align: center; padding: 60px 20px; }
.cl-empty-icon { color: #cbd5e1; margin-bottom: 12px; }
.cl-empty h3 { font-size: 16px; color: #64748b; margin: 0 0 6px; }
.cl-empty p { font-size: 13px; color: #94a3b8; margin: 0 0 16px; }

/* ─── Toast ─── */
.cl-toast {
  position: fixed; top: 24px; right: 24px; z-index: 100000;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 12px;
  font-size: 13px; font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  animation: clToastIn 0.3s ease;
}
.cl-toast-success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.cl-toast-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
@keyframes clToastIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* ─── Modal Overlay ─── */
.cl-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 50000;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 20px;
  overflow-y: auto;
}
.cl-modal {
  width: 100%; max-width: 640px;
  background: #fff; border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.18);
  overflow: hidden;
  animation: clSlideIn 0.25s ease-out;
}
@keyframes clSlideIn { from { opacity: 0; transform: translateY(-16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

.cl-modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 28px 16px;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: #fff;
}
.cl-modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
.cl-modal-sub { font-size: 12px; opacity: 0.7; margin: 4px 0 0; }
.cl-modal-close {
  background: rgba(255,255,255,0.15); border: none; border-radius: 8px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
}
.cl-modal-close:hover { background: rgba(255,255,255,0.25); }

.cl-modal-body { padding: 24px 28px; max-height: calc(100vh - 280px); overflow-y: auto; }

/* Form */
.cl-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.cl-field { display: flex; flex-direction: column; gap: 5px; }
.cl-field-full { margin-bottom: 16px; }
.cl-field label {
  font-size: 12px; font-weight: 600; color: #475569;
  display: flex; align-items: center; gap: 5px;
}
.cl-field label svg { color: #94a3b8; }
.cl-req { color: #ef4444; }
.cl-field input, .cl-field select, .cl-field textarea {
  padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; color: #334155; background: #f8fafc;
  transition: all 0.2s; font-family: inherit;
}
.cl-field input:focus, .cl-field select:focus, .cl-field textarea:focus {
  border-color: #6366f1; outline: none; background: #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.cl-field textarea { resize: vertical; min-height: 70px; }
.cl-field.error input, .cl-field.error select { border-color: #ef4444; }
.cl-field-error { font-size: 11px; color: #ef4444; }

.cl-modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 28px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

/* ─── Detail Panel (slide-over) ─── */
.cl-detail-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(3px);
  z-index: 50000;
  display: flex; justify-content: flex-end;
}
.cl-detail-panel {
  width: 480px; max-width: 100vw;
  height: 100vh;
  background: #fff;
  box-shadow: -8px 0 40px rgba(0,0,0,0.12);
  display: flex; flex-direction: column;
  animation: clSlideRight 0.3s ease;
  overflow-y: auto;
}
@keyframes clSlideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

.cl-detail-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 20px 24px 24px;
  color: #fff;
  text-align: center;
  position: relative;
}
.cl-detail-close {
  position: absolute; top: 14px; right: 14px;
  background: rgba(255,255,255,0.15); border: none; border-radius: 8px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
}
.cl-detail-close:hover { background: rgba(255,255,255,0.25); }
.cl-detail-avatar {
  width: 64px; height: 64px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: #fff;
  margin: 0 auto 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.cl-detail-header h2 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
.cl-detail-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-bottom: 10px; }
.cl-detail-meta span { display: flex; align-items: center; gap: 5px; font-size: 12px; opacity: 0.8; }
.cl-detail-badges { display: flex; justify-content: center; gap: 8px; margin-bottom: 14px; }
.cl-detail-quick-actions { display: flex; justify-content: center; gap: 8px; }

/* Detail Stats */
.cl-detail-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid #f1f5f9;
}
.cl-d-stat {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-right: 1px solid #f1f5f9;
}
.cl-d-stat:last-child { border-right: none; }
.cl-d-stat svg { color: #6366f1; flex-shrink: 0; }
.cl-d-stat strong { font-size: 15px; font-weight: 700; color: #1e293b; display: block; }
.cl-d-stat span { font-size: 10px; color: #94a3b8; text-transform: uppercase; }

/* Tabs */
.cl-detail-tabs {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  padding: 0 16px;
}
.cl-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 12px 14px;
  font-size: 12px; font-weight: 600;
  color: #94a3b8;
  background: none; border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer; transition: all 0.2s;
}
.cl-tab:hover { color: #475569; }
.cl-tab.active { color: #6366f1; border-bottom-color: #6366f1; }

/* Detail Content */
.cl-detail-content { padding: 20px 24px; flex: 1; overflow-y: auto; }
.cl-empty-tab { text-align: center; color: #94a3b8; font-size: 13px; padding: 30px 0; }
.cl-link-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-weight: 600; font-size: 13px; }
.cl-link-btn:hover { text-decoration: underline; }

/* Overview info grid */
.cl-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  margin-bottom: 16px;
}
.cl-info-item { display: flex; flex-direction: column; gap: 2px; }
.cl-info-item label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; }
.cl-info-item span { font-size: 13px; color: #334155; font-weight: 500; }
.cl-info-block { padding: 14px; background: #f8fafc; border-radius: 10px; margin-bottom: 12px; }
.cl-info-block label { font-size: 12px; font-weight: 700; color: #475569; display: block; margin-bottom: 6px; }
.cl-info-block p { font-size: 13px; color: #334155; margin: 0; line-height: 1.5; }
.cl-warning-block { background: #fffbeb; border: 1px solid #fef3c7; }
.cl-warning-block label { color: #d97706; }

/* Appointments tab */
.cl-appt-item {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0; border-bottom: 1px solid #f8fafc;
}
.cl-appt-item:last-child { border-bottom: none; }
.cl-appt-date {
  width: 48px; text-align: center;
  background: #f1f5f9; border-radius: 10px; padding: 6px 0;
}
.cl-appt-month { font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase; }
.cl-appt-day { font-size: 18px; font-weight: 800; color: #1e293b; }
.cl-appt-info { flex: 1; }
.cl-appt-service { font-size: 13px; font-weight: 600; color: #1e293b; }
.cl-appt-staff { font-size: 11px; color: #94a3b8; margin-top: 2px; }

/* Invoices tab */
.cl-invoice-item {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0; border-bottom: 1px solid #f8fafc;
}
.cl-invoice-item:last-child { border-bottom: none; }
.cl-inv-number { font-weight: 600; color: #1e293b; font-size: 13px; min-width: 80px; }
.cl-inv-date { font-size: 12px; color: #94a3b8; flex: 1; }
.cl-inv-amount { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

/* Loyalty tab */
.cl-loyalty-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.cl-loyalty-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px; padding: 14px; text-align: center;
}
.cl-loy-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px; }
.cl-loy-value { font-size: 20px; font-weight: 800; color: #1e293b; }

.cl-section-title { font-size: 13px; font-weight: 700; color: #475569; margin: 0 0 12px; }

.cl-txn-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
.cl-txn-item:last-child { border-bottom: none; }
.cl-txn-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
}
.cl-txn-icon.positive { background: #ecfdf5; color: #059669; }
.cl-txn-icon.negative { background: #fef2f2; color: #dc2626; }
.cl-txn-info { flex: 1; }
.cl-txn-desc { font-size: 12px; color: #334155; }
.cl-txn-date { font-size: 11px; color: #94a3b8; }
.cl-txn-points { font-weight: 700; font-size: 13px; }
.cl-txn-points.positive { color: #059669; }
.cl-txn-points.negative { color: #dc2626; }

/* ─── Delete Dialog ─── */
.cl-delete-dialog {
  background: #fff; border-radius: 18px; padding: 30px;
  max-width: 400px; width: 100%; text-align: center;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2);
  animation: clSlideIn 0.25s ease-out;
  margin: auto;
}
.cl-delete-icon-wrap {
  width: 56px; height: 56px; border-radius: 50%;
  background: #fef2f2; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.cl-delete-dialog h3 { font-size: 16px; color: #1e293b; margin: 0 0 8px; }
.cl-delete-dialog p { font-size: 13px; color: #64748b; margin: 0 0 20px; line-height: 1.5; }
.cl-delete-actions { display: flex; gap: 10px; justify-content: center; }

/* ─── Responsive ─── */
@media (max-width: 1024px) {
  .cl-stats { grid-template-columns: repeat(2, 1fr); }
  .cl-detail-stats { grid-template-columns: repeat(2, 1fr); }
  .cl-d-stat:nth-child(2) { border-right: none; }
}
@media (max-width: 768px) {
  .cl-hero { flex-direction: column; gap: 16px; text-align: center; }
  .cl-hero-content { flex-direction: column; }
  .cl-stats { grid-template-columns: 1fr 1fr; }
  .cl-form-row { grid-template-columns: 1fr; }
  .cl-detail-panel { width: 100%; }
  .cl-filters-bar { flex-wrap: wrap; }
  .cl-table th:nth-child(4), .cl-table td:nth-child(4),
  .cl-table th:nth-child(5), .cl-table td:nth-child(5) { display: none; }
}
`;
