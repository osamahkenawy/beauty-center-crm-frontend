import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import {
  Group, Search, Plus, Eye, EditPencil, Xmark, User, Clock,
  Phone, Mail, Star, Calendar, CreditCard, Check, Building,
  Settings, Shield, UserPlus, SendMail, RefreshDouble
} from 'iconoir-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import SEO from '../components/SEO';
import './TeamManager.css';

// Fallback roles - will be replaced by dynamic roles from API
const FALLBACK_ROLES = [
  { value: 'admin', label: 'Admin (Owner)', color: '#f2421b' },
  { value: 'manager', label: 'Manager', color: '#667eea' },
  { value: 'receptionist', label: 'Receptionist', color: '#10b981' },
  { value: 'stylist', label: 'Stylist / Therapist', color: '#8b5cf6' },
  { value: 'staff', label: 'Staff / Employee', color: '#f59e0b' },
  { value: 'employee', label: 'Employee', color: '#2e7d32' },
  { value: 'receptionist', label: 'Receptionist', color: '#c62828' },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
];

const GENDERS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const COLORS = [
  '#f2421b', '#e91e63', '#9c27b0', '#667eea', '#2196f3',
  '#009688', '#4caf50', '#ff9800', '#795548', '#607d8b',
  '#00bcd4', '#8bc34a', '#ff5722', '#3f51b5', '#1c2430'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyForm = {
  full_name: '', email: '', phone: '', job_title: '', bio: '',
  role: 'staff', branch_id: '', employment_type: 'full_time',
  hire_date: '', commission_rate: 0, color: '#667eea',
  can_book_online: true, notes: '', emergency_contact: '',
  salary: '', salary_currency: '',
  nationality: '', national_id: '', date_of_birth: '', gender: '',
  address: '',
  // Invite / password
  send_invite: true, password: '',
};

// ─── Simple validators ──────────────────────────────────
const validateEmail = (email) => {
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Invalid email format';
};

const validatePhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/[\s\-\(\)\+]/g, '');
  if (digits.length < 7) return 'Phone must be at least 7 digits';
  if (!/^[\d\+\-\s\(\)]+$/.test(phone)) return 'Invalid phone characters';
  return '';
};

export default function TeamManager() {
  const { currency, symbol } = useCurrency();
  const [team, setTeam] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [ROLES, setROLES] = useState(FALLBACK_ROLES);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Fetch ─────────────────────────────────────
  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes, serviceRes, statsRes, rolesRes] = await Promise.all([
        api.get('/staff'),
        api.get('/branches'),
        api.get('/products'),
        api.get('/staff/stats'),
        api.get('/roles/list/available').catch(() => ({ success: false })),
      ]);
      if (staffRes.success) setTeam(staffRes.data || []);
      if (branchRes.success) setBranches(branchRes.data || []);
      if (serviceRes.success) setServices(serviceRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});
      if (rolesRes.success && rolesRes.data?.length > 0) {
        setROLES(rolesRes.data.map(r => ({ value: r.name, label: r.display_name, color: r.color })));
      }
    } catch (e) { console.error('Fetch team error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // ── Filter ────────────────────────────────────
  const filtered = useMemo(() => {
    return team.filter(m => {
      if (search) {
        const s = search.toLowerCase();
        const match = (m.full_name || '').toLowerCase().includes(s) ||
          (m.email || '').toLowerCase().includes(s) ||
          (m.phone || '').includes(s) ||
          (m.username || '').toLowerCase().includes(s) ||
          (m.job_title || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filterRole && m.role !== filterRole) return false;
      if (filterBranch && String(m.branch_id) !== filterBranch) return false;
      if (filterActive === 'active' && !m.is_active) return false;
      if (filterActive === 'inactive' && m.is_active) return false;
      return true;
    });
  }, [team, search, filterRole, filterBranch, filterActive]);

  // ── Modals ────────────────────────────────────
  const openCreate = () => {
    setEditingMember(null);
    setFormData({ ...emptyForm, salary_currency: currency || '' });
    setStep(1);
    setErrors({});
    setShowCreateModal(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      job_title: member.job_title || '',
      bio: member.bio || '',
      role: member.role || 'staff',
      branch_id: member.branch_id ? String(member.branch_id) : '',
      employment_type: member.employment_type || 'full_time',
      hire_date: member.hire_date ? member.hire_date.split('T')[0] : '',
      commission_rate: member.commission_rate || 0,
      color: member.color || '#667eea',
      can_book_online: member.can_book_online !== 0,
      notes: member.notes || '',
      emergency_contact: member.emergency_contact || '',
      salary: member.salary || '',
      salary_currency: member.salary_currency || currency || '',
      nationality: member.nationality || '',
      national_id: member.national_id || '',
      date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
      gender: member.gender || '',
      address: member.address || '',
      send_invite: false,
      password: '',
    });
    setStep(1);
    setErrors({});
    setShowCreateModal(true);
  };

  const openView = async (member) => {
    try {
      const res = await api.get(`/staff/${member.id}`);
      if (res.success) {
        setViewingMember(res.data);
        setShowViewModal(true);
      }
    } catch (e) {
      setViewingMember(member);
      setShowViewModal(true);
    }
  };

  // ── Validate ──────────────────────────────────
  const validateStep = (stepNum) => {
    const newErrors = {};
    if (stepNum === 1) {
      if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';
      const emailErr = validateEmail(formData.email);
      if (emailErr) newErrors.email = emailErr;
      const phoneErr = validatePhone(formData.phone);
      if (phoneErr) newErrors.phone = phoneErr;
      // For new members, email is required for invite
      if (!editingMember && formData.send_invite && !formData.email?.trim()) {
        newErrors.email = 'Email is required to send invite';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save ──────────────────────────────────────
  const handleSave = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      // Remove password if editing and empty
      if (editingMember && !payload.password) delete payload.password;
      // Remove invite fields for edit
      if (editingMember) {
        delete payload.send_invite;
        delete payload.password;
      }

      const res = editingMember
        ? await api.patch(`/staff/${editingMember.id}`, payload)
        : await api.post('/staff', payload);

      if (res.success) {
        const inviteMsg = res.data?.invite_sent 
          ? ' Invite email sent!' 
          : (res.data?.has_pending_invite ? ' Invite link generated.' : '');
        
        Swal.fire({
          icon: 'success',
          title: editingMember ? 'Updated!' : 'Added!',
          text: (editingMember ? 'Team member updated successfully.' : 'New team member added.') + inviteMsg,
          timer: 2200,
          showConfirmButton: false,
        });
        setShowCreateModal(false);
        fetchTeam();
      } else {
        Swal.fire('Error', res.message || 'Something went wrong', 'error');
      }
    } catch (e) {
      Swal.fire('Error', e.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  // ── Resend Invite ─────────────────────────────
  const resendInvite = async (member) => {
    const result = await Swal.fire({
      title: 'Resend Invite?',
      html: `Send a new invite email to <strong>${member.email}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Send Invite',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post(`/staff/${member.id}/resend-invite`);
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Sent!', text: res.message, timer: 1800, showConfirmButton: false });
        } else {
          Swal.fire('Error', res.message, 'error');
        }
      } catch (e) {
        Swal.fire('Error', e.message || 'Failed to resend', 'error');
      }
    }
  };

  // ── Toggle Active ─────────────────────────────
  const toggleActive = async (member) => {
    const action = member.is_active ? 'deactivate' : 'activate';
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${member.full_name}?`,
      text: member.is_active
        ? 'They will no longer appear in booking and scheduling'
        : 'They will be available for booking and scheduling again',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: member.is_active ? '#dc3545' : '#28a745',
      confirmButtonText: member.is_active ? 'Deactivate' : 'Activate',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.patch(`/staff/${member.id}/toggle-active`);
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Done!', text: res.message, timer: 1500, showConfirmButton: false });
          fetchTeam();
        } else {
          Swal.fire('Error', res.message, 'error');
        }
      } catch (e) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  // ── Steps ─────────────────────────────────────
  const steps = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Role & Access' },
    { num: 3, label: 'Compensation' },
    { num: 4, label: 'Review' },
  ];

  const isStepValid = (s) => {
    if (s === 1) return !!formData.full_name?.trim();
    return true;
  };

  const nextStep = () => {
    if (step < 4 && validateStep(step)) setStep(step + 1);
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const salarySymbol = formData.salary_currency
    ? (formData.salary_currency === currency ? symbol : formData.salary_currency)
    : symbol;

  return (
    <div className="team-page">
      <SEO page="team" />

      {/* Stats */}
      <div className="team-stats">
        <div className="team-stat-card primary">
          <div className="team-stat-icon" style={{ background: '#fff5f3', color: '#f2421b' }}>
            <Group width={22} height={22} />
          </div>
          <div className="team-stat-info">
            <div className="team-stat-value">{stats.total || 0}</div>
            <div className="team-stat-label">Total Members</div>
          </div>
        </div>
        <div className="team-stat-card success">
          <div className="team-stat-icon" style={{ background: '#e8f5e9', color: '#28a745' }}>
            <Check width={22} height={22} />
          </div>
          <div className="team-stat-info">
            <div className="team-stat-value">{stats.active || 0}</div>
            <div className="team-stat-label">Active Members</div>
          </div>
        </div>
        <div className="team-stat-card info">
          <div className="team-stat-icon" style={{ background: '#e3f2fd', color: '#667eea' }}>
            <Calendar width={22} height={22} />
          </div>
          <div className="team-stat-info">
            <div className="team-stat-value">{stats.completed_this_month || 0}</div>
            <div className="team-stat-label">Appointments This Month</div>
          </div>
        </div>
        <div className="team-stat-card warning">
          <div className="team-stat-icon" style={{ background: '#fff8e1', color: '#ff9800' }}>
            <CreditCard width={22} height={22} />
          </div>
          <div className="team-stat-info">
            <div className="team-stat-value">{symbol} {(stats.revenue_this_month || 0).toLocaleString()}</div>
            <div className="team-stat-label">Revenue This Month</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="team-header">
        <div className="team-header-left">
          <h2><Group width={22} height={22} /> Team</h2>
          <div className="team-search">
            <Search width={16} height={16} />
            <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="team-filters">
          <select className="team-filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {branches.length > 1 && (
            <select className="team-filter-select" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              <option value="">All Locations</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'active', 'inactive'].map(val => (
              <button key={val} className={`team-filter-btn ${filterActive === val ? 'active' : ''}`}
                onClick={() => setFilterActive(val)}>
                {val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            ))}
          </div>
          <button className="team-add-btn" data-tooltip="Add team member" onClick={openCreate}>
            <Plus width={16} height={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="team-loading"><div className="spinner" /><p>Loading team...</p></div>
      ) : filtered.length === 0 ? (
        <div className="team-empty">
          <div className="team-empty-icon"><Group width={36} height={36} color="#96a0af" /></div>
          <h3>No team members found</h3>
          <p>{search || filterRole || filterBranch ? 'Try adjusting your filters' : 'Add your first team member to get started'}</p>
          <button className="team-add-btn" onClick={openCreate}><Plus width={16} height={16} /> Add First Member</button>
        </div>
      ) : (
        <div className="team-grid">
          {filtered.map(member => (
            <div key={member.id} className="team-card">
              <div className="team-card-top" style={{ background: member.color || '#667eea' }} />
              <div className="team-card-body">
                <div className="team-card-profile">
                  <div className="team-avatar" style={{ background: member.color || '#667eea' }}>
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt="" />
                      : (member.full_name?.charAt(0) || member.username?.charAt(0) || '?')
                    }
                    <span className={`team-status-dot ${member.is_active ? 'active' : 'inactive'}`} />
                  </div>
                  <div>
                    <h4 className="team-card-name">{member.full_name || member.username}</h4>
                    <p className="team-card-title">{member.job_title || member.role}</p>
                    <span className={`team-card-role ${member.role}`}>{member.role}</span>
                    {member.has_pending_invite && (
                      <span className="team-invite-badge">📩 Invite Pending</span>
                    )}
                  </div>
                </div>

                <div className="team-card-meta">
                  {member.email && (
                    <div className="team-meta-item">
                      <Mail width={13} height={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="team-meta-item">
                      <Phone width={13} height={13} />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.branch_name && (
                    <div className="team-meta-item">
                      <Building width={13} height={13} />
                      <span>{member.branch_name}</span>
                    </div>
                  )}
                  <div className="team-meta-item">
                    <Clock width={13} height={13} />
                    <span>{member.schedule?.length || 0} days/week</span>
                  </div>
                </div>

                <div className="team-card-perf">
                  {member.avg_rating && (
                    <span className="team-perf-badge rating">
                      <Star width={12} height={12} /> {member.avg_rating}
                    </span>
                  )}
                  <span className="team-perf-badge appointments">
                    <Calendar width={12} height={12} /> {member.appointments_this_month || 0} this month
                  </span>
                  {member.total_revenue > 0 && (
                    <span className="team-perf-badge revenue">
                      {symbol} {member.total_revenue.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="team-card-actions">
                  <button className="team-action-btn view" data-tooltip="View member" onClick={() => openView(member)}>
                    <Eye width={14} height={14} /> View
                  </button>
                  <button className="team-action-btn" data-tooltip="Edit member" onClick={() => openEdit(member)}>
                    <EditPencil width={14} height={14} /> Edit
                  </button>
                  {member.has_pending_invite && member.email && (
                    <button className="team-action-btn invite" data-tooltip="Resend invite" onClick={() => resendInvite(member)}>
                      <SendMail width={14} height={14} /> Resend
                    </button>
                  )}
                  <button className={`team-action-btn ${member.is_active ? 'terminate' : 'activate'}`}
                    data-tooltip={member.is_active ? 'Deactivate member' : 'Activate member'}
                    onClick={() => toggleActive(member)}>
                    {member.is_active
                      ? <><Xmark width={14} height={14} /> Terminate</>
                      : <><Check width={14} height={14} /> Activate</>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* CREATE / EDIT MODAL — Multi-Step          */}
      {/* ══════════════════════════════════════════ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}
        centered dialogClassName="team-modal" size="lg" backdrop="static">
        <div className="team-modal-header">
          <h3>
            <UserPlus width={20} height={20} />
            {editingMember ? `Edit ${editingMember.full_name}` : 'Add Team Member'}
          </h3>
          <button className="close-btn" onClick={() => setShowCreateModal(false)}>
            <Xmark width={18} height={18} />
          </button>
        </div>

        {/* Steps */}
        <div className="team-modal-steps">
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`team-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
                onClick={() => { if (step > s.num || isStepValid(step)) setStep(s.num); }}>
                <span className="team-step-num">
                  {step > s.num ? <Check width={14} height={14} /> : s.num}
                </span>
                <span className="team-step-label">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`team-step-line ${step > s.num ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="team-modal-body">
          {/* Step 1: Profile */}
          {step === 1 && (
            <>
              <div className="team-form-section">
                <div className="team-form-section-title"><User width={14} height={14} /> Personal Information</div>
                <div className="team-form-grid">
                  <div className={`team-form-group ${errors.full_name ? 'has-error' : ''}`}>
                    <label>Full Name <span className="req">*</span></label>
                    <input placeholder="e.g. Sarah Ahmed" value={formData.full_name}
                      onChange={e => setField('full_name', e.target.value)} />
                    {errors.full_name && <span className="team-field-error">{errors.full_name}</span>}
                  </div>
                  <div className="team-form-group">
                    <label>Job Title</label>
                    <input placeholder="e.g. Senior Stylist" value={formData.job_title}
                      onChange={e => setField('job_title', e.target.value)} />
                  </div>
                  <div className={`team-form-group ${errors.email ? 'has-error' : ''}`}>
                    <label>Email {!editingMember && formData.send_invite && <span className="req">*</span>}</label>
                    <div className="team-input-icon">
                      <Mail width={15} height={15} />
                      <input type="email" placeholder="sarah@beauty.com" value={formData.email}
                        onChange={e => setField('email', e.target.value)} />
                    </div>
                    {errors.email && <span className="team-field-error">{errors.email}</span>}
                  </div>
                  <div className={`team-form-group ${errors.phone ? 'has-error' : ''}`}>
                    <label>Phone</label>
                    <div className="team-input-icon">
                      <Phone width={15} height={15} />
                      <input placeholder="+971 50 123 4567" value={formData.phone}
                        onChange={e => setField('phone', e.target.value)} />
                    </div>
                    {errors.phone && <span className="team-field-error">{errors.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="team-form-section">
                <div className="team-form-section-title"><Shield width={14} height={14} /> Additional Details <span className="team-optional-tag">Optional</span></div>
                <div className="team-form-grid">
                  <div className="team-form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={formData.date_of_birth}
                      onChange={e => setField('date_of_birth', e.target.value)} />
                  </div>
                  <div className="team-form-group">
                    <label>Gender</label>
                    <select value={formData.gender} onChange={e => setField('gender', e.target.value)}>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="team-form-group">
                    <label>Nationality</label>
                    <input placeholder="e.g. Emirati, Indian, Filipino" value={formData.nationality}
                      onChange={e => setField('nationality', e.target.value)} />
                  </div>
                  <div className="team-form-group">
                    <label>National / Emirates ID</label>
                    <input placeholder="e.g. 784-1990-1234567-1" value={formData.national_id}
                      onChange={e => setField('national_id', e.target.value)} />
                  </div>
                  <div className="team-form-group">
                    <label>Emergency Contact</label>
                    <input placeholder="Name: +971 ..." value={formData.emergency_contact}
                      onChange={e => setField('emergency_contact', e.target.value)} />
                  </div>
                  <div className="team-form-group">
                    <label>Hire Date</label>
                    <input type="date" value={formData.hire_date}
                      onChange={e => setField('hire_date', e.target.value)} />
                  </div>
                  <div className="team-form-group full">
                    <label>Address</label>
                    <input placeholder="Street, City, Country" value={formData.address}
                      onChange={e => setField('address', e.target.value)} />
                  </div>
                  <div className="team-form-group full">
                    <label>Bio</label>
                    <textarea placeholder="Brief bio or specialization notes..."
                      value={formData.bio} onChange={e => setField('bio', e.target.value)} rows={2} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Role & Access */}
          {step === 2 && (
            <>
              <div className="team-form-section">
                <div className="team-form-section-title"><Shield width={14} height={14} /> Role & Location</div>
                <div className="team-form-grid">
                  <div className="team-form-group">
                    <label>Role <span className="req">*</span></label>
                    <select value={formData.role} onChange={e => setField('role', e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="team-form-group">
                    <label>Branch / Location</label>
                    <select value={formData.branch_id} onChange={e => setField('branch_id', e.target.value)}>
                      <option value="">No specific branch</option>
                      {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="team-form-group">
                    <label>Employment Type</label>
                    <select value={formData.employment_type} onChange={e => setField('employment_type', e.target.value)}>
                      {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="team-form-group">
                    <label>Calendar Color</label>
                    <div className="team-color-picker">
                      {COLORS.map(c => (
                        <div key={c} className={`team-color-swatch ${formData.color === c ? 'selected' : ''}`}
                          style={{ background: c }} onClick={() => setField('color', c)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Access / Invite section */}
              {!editingMember && (
                <div className="team-form-section">
                  <div className="team-form-section-title"><SendMail width={14} height={14} /> Account Setup</div>
                  
                  <div className="team-invite-card">
                    <div className="team-invite-option" onClick={() => setField('send_invite', true)}>
                      <div className={`team-invite-radio ${formData.send_invite ? 'selected' : ''}`}>
                        {formData.send_invite && <Check width={12} height={12} />}
                      </div>
                      <div className="team-invite-content">
                        <div className="team-invite-title">
                          <SendMail width={16} height={16} /> Send Invite Email
                        </div>
                        <p>An email will be sent to the team member with a link to set their own password. <strong>Recommended!</strong></p>
                      </div>
                    </div>
                    
                    <div className="team-invite-divider">or</div>
                    
                    <div className="team-invite-option" onClick={() => setField('send_invite', false)}>
                      <div className={`team-invite-radio ${!formData.send_invite ? 'selected' : ''}`}>
                        {!formData.send_invite && <Check width={12} height={12} />}
                      </div>
                      <div className="team-invite-content">
                        <div className="team-invite-title">
                          <Settings width={16} height={16} /> Set Password Manually
                        </div>
                        <p>You set the password now. The member can log in immediately.</p>
                      </div>
                    </div>

                    {!formData.send_invite && (
                      <div className="team-manual-pw" style={{ marginTop: 14 }}>
                        <div className="team-form-group">
                          <label>Password <span className="req">*</span></label>
                          <input type="password" placeholder="Minimum 6 characters" value={formData.password}
                            onChange={e => setField('password', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editingMember && (
                <div className="team-form-section">
                  <div className="team-form-section-title"><Settings width={14} height={14} /> Change Password <span className="team-optional-tag">Optional</span></div>
                  <div className="team-form-grid">
                    <div className="team-form-group">
                      <label>New Password</label>
                      <input type="password" placeholder="Leave blank to keep current" value={formData.password}
                        onChange={e => setField('password', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Compensation */}
          {step === 3 && (
            <>
              <div className="team-form-section">
                <div className="team-form-section-title"><CreditCard width={14} height={14} /> Compensation</div>
                <div className="team-form-grid">
                  <div className="team-form-group">
                    <label>Salary</label>
                    <div className="team-salary-input">
                      <span className="team-salary-currency">{salarySymbol}</span>
                      <input type="number" placeholder="0.00" value={formData.salary}
                        onChange={e => setField('salary', e.target.value)} />
                    </div>
                    <span className="team-field-hint">
                      Currency: {formData.salary_currency || currency || 'AED'} (from company settings)
                    </span>
                  </div>
                  <div className="team-form-group">
                    <label>Commission Rate (%)</label>
                    <div className="team-commission-input">
                      <input type="number" min="0" max="100" step="0.5" value={formData.commission_rate}
                        onChange={e => setField('commission_rate', parseFloat(e.target.value) || 0)} />
                      <span className="team-commission-pct">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="team-form-section">
                <div className="team-form-section-title"><Settings width={14} height={14} /> Booking & Visibility</div>
                <div className="team-toggle-row">
                  <div className="team-toggle-label">
                    <span>Available for Online Booking</span>
                    <span>Customers can book appointments with this member online</span>
                  </div>
                  <button type="button" className={`team-toggle ${formData.can_book_online ? 'on' : ''}`}
                    onClick={() => setField('can_book_online', !formData.can_book_online)} />
                </div>
              </div>

              <div className="team-form-section">
                <div className="team-form-section-title">📝 Notes <span className="team-optional-tag">Optional</span></div>
                <div className="team-form-group full">
                  <textarea placeholder="Internal notes about this team member..."
                    value={formData.notes} onChange={e => setField('notes', e.target.value)}
                    rows={3} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review Summary */}
          {step === 4 && (
            <div className="team-form-section">
              <div className="team-form-section-title"><Check width={14} height={14} /> Review Before {editingMember ? 'Updating' : 'Adding'}</div>
              
              <div className="team-review-card">
                <div className="team-review-avatar" style={{ background: formData.color || '#667eea' }}>
                  {formData.full_name?.charAt(0) || '?'}
                </div>
                <div className="team-review-info">
                  <h4>{formData.full_name || 'No name'}</h4>
                  <p>{formData.job_title || formData.role}</p>
                </div>
              </div>

              <div className="team-review-grid">
                <div className="team-review-item">
                  <span className="team-review-label">Email</span>
                  <span className="team-review-value">{formData.email || '—'}</span>
                </div>
                <div className="team-review-item">
                  <span className="team-review-label">Phone</span>
                  <span className="team-review-value">{formData.phone || '—'}</span>
                </div>
                <div className="team-review-item">
                  <span className="team-review-label">Role</span>
                  <span className="team-review-value" style={{ textTransform: 'capitalize' }}>{formData.role}</span>
                </div>
                <div className="team-review-item">
                  <span className="team-review-label">Branch</span>
                  <span className="team-review-value">
                    {branches.find(b => String(b.id) === formData.branch_id)?.name || 'Not assigned'}
                  </span>
                </div>
                <div className="team-review-item">
                  <span className="team-review-label">Salary</span>
                  <span className="team-review-value">
                    {formData.salary ? `${salarySymbol} ${formData.salary}` : 'Not set'}
                  </span>
                </div>
                <div className="team-review-item">
                  <span className="team-review-label">Commission</span>
                  <span className="team-review-value">{formData.commission_rate}%</span>
                </div>
                {formData.nationality && (
                  <div className="team-review-item">
                    <span className="team-review-label">Nationality</span>
                    <span className="team-review-value">{formData.nationality}</span>
                  </div>
                )}
                {formData.gender && (
                  <div className="team-review-item">
                    <span className="team-review-label">Gender</span>
                    <span className="team-review-value" style={{ textTransform: 'capitalize' }}>{formData.gender}</span>
                  </div>
                )}
                {!editingMember && (
                  <div className="team-review-item full">
                    <span className="team-review-label">Account Setup</span>
                    <span className="team-review-value">
                      {formData.send_invite 
                        ? '📩 Invite email will be sent' 
                        : '🔑 Password set manually'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="team-modal-footer">
          <div className="team-footer-left">
            {step > 1 && (
              <button className="team-btn back" onClick={prevStep}>← Back</button>
            )}
          </div>
          <div className="team-footer-right">
            <button className="team-btn cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
            {step < 4 ? (
              <button className="team-btn next" onClick={nextStep} disabled={!isStepValid(step)}>
                Continue →
              </button>
            ) : (
              <button className="team-btn save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingMember ? 'Update Member' : 'Add Member')}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════ */}
      {/* VIEW MODAL — Detail + Performance         */}
      {/* ══════════════════════════════════════════ */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}
        centered dialogClassName="team-modal" size="lg">
        {viewingMember && (
          <>
            <div className="team-modal-header">
              <h3><Eye width={20} height={20} /> Team Member Profile</h3>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>
                <Xmark width={18} height={18} />
              </button>
            </div>
            <div className="team-modal-body">
              <div className="team-view-header">
                <div className="team-view-avatar" style={{ background: viewingMember.color || '#667eea' }}>
                  {viewingMember.avatar_url
                    ? <img src={viewingMember.avatar_url} alt="" />
                    : (viewingMember.full_name?.charAt(0) || '?')
                  }
                </div>
                <div>
                  <h3 className="team-view-name">{viewingMember.full_name || viewingMember.username}</h3>
                  <p className="team-view-email">
                    {viewingMember.job_title && <span>{viewingMember.job_title} · </span>}
                    {viewingMember.email || 'No email'}
                  </p>
                  <span className={`team-card-role ${viewingMember.role}`}>{viewingMember.role}</span>
                  {viewingMember.branch_name && (
                    <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#667eea' }}>
                      📍 {viewingMember.branch_name}
                    </span>
                  )}
                  {viewingMember.has_pending_invite && (
                    <span className="team-invite-badge" style={{ marginLeft: 8 }}>📩 Invite Pending</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="team-view-stats">
                <div className="team-view-stat">
                  <div className="val">
                    {viewingMember.performance?.total_appointments || viewingMember.total_appointments || 0}
                  </div>
                  <div className="lbl">Total Appointments</div>
                </div>
                <div className="team-view-stat">
                  <div className="val">
                    {viewingMember.review_stats?.avg_rating || viewingMember.avg_rating || '-'}
                    {(viewingMember.review_stats?.avg_rating || viewingMember.avg_rating) && ' ⭐'}
                  </div>
                  <div className="lbl">Avg Rating ({viewingMember.review_stats?.total_reviews || viewingMember.review_count || 0} reviews)</div>
                </div>
                <div className="team-view-stat">
                  <div className="val">
                    {symbol} {(viewingMember.performance?.total_revenue || viewingMember.total_revenue || 0).toLocaleString()}
                  </div>
                  <div className="lbl">Total Revenue</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="team-view-section">
                <h4><User width={16} height={16} /> Details</h4>
                <div className="team-view-info-grid">
                  <div className="team-view-info-item">
                    <span className="label">Phone</span>
                    <span className="value">{viewingMember.phone || '-'}</span>
                  </div>
                  <div className="team-view-info-item">
                    <span className="label">Employment</span>
                    <span className="value" style={{ textTransform: 'capitalize' }}>
                      {(viewingMember.employment_type || 'full_time').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="team-view-info-item">
                    <span className="label">Hire Date</span>
                    <span className="value">
                      {viewingMember.hire_date ? new Date(viewingMember.hire_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="team-view-info-item">
                    <span className="label">Commission</span>
                    <span className="value">{viewingMember.commission_rate || 0}%</span>
                  </div>
                  <div className="team-view-info-item">
                    <span className="label">Online Booking</span>
                    <span className="value">{viewingMember.can_book_online ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="team-view-info-item">
                    <span className="label">Status</span>
                    <span className="value">{viewingMember.is_active ? '🟢 Active' : '🔴 Inactive'}</span>
                  </div>
                  {viewingMember.nationality && (
                    <div className="team-view-info-item">
                      <span className="label">Nationality</span>
                      <span className="value">{viewingMember.nationality}</span>
                    </div>
                  )}
                  {viewingMember.national_id && (
                    <div className="team-view-info-item">
                      <span className="label">National ID</span>
                      <span className="value">{viewingMember.national_id}</span>
                    </div>
                  )}
                  {viewingMember.date_of_birth && (
                    <div className="team-view-info-item">
                      <span className="label">Date of Birth</span>
                      <span className="value">{new Date(viewingMember.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {viewingMember.gender && (
                    <div className="team-view-info-item">
                      <span className="label">Gender</span>
                      <span className="value" style={{ textTransform: 'capitalize' }}>{viewingMember.gender}</span>
                    </div>
                  )}
                  {viewingMember.address && (
                    <div className="team-view-info-item full">
                      <span className="label">Address</span>
                      <span className="value">{viewingMember.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Specializations */}
              {viewingMember.specializations?.length > 0 && (
                <div className="team-view-section">
                  <h4>💇 Specializations</h4>
                  <div className="team-spec-tags">
                    {viewingMember.specializations.map((sp, i) => (
                      <span key={i} className="team-spec-tag">
                        {sp.service_name} ({sp.skill_level})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {viewingMember.schedule?.length > 0 && (
                <div className="team-view-section">
                  <h4><Clock width={16} height={16} /> Weekly Schedule</h4>
                  <div className="team-sched-mini">
                    {DAYS.map(day => {
                      const sched = viewingMember.schedule.find(s => s.day_of_week === day);
                      return (
                        <div key={day} className={`team-sched-day ${sched ? 'has' : 'off'}`}>
                          <span className="day-label">{day.slice(0, 3)}</span>
                          {sched ? (
                            <span className="day-time">
                              {sched.start_time?.slice(0, 5)}-{sched.end_time?.slice(0, 5)}
                            </span>
                          ) : (
                            <span className="day-time">OFF</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bio */}
              {viewingMember.bio && (
                <div className="team-view-section">
                  <h4>📝 Bio</h4>
                  <p style={{ fontSize: '0.85rem', color: '#4a5568', lineHeight: 1.6 }}>{viewingMember.bio}</p>
                </div>
              )}
            </div>

            <div className="team-modal-footer">
              <div className="team-footer-left" />
              <div className="team-footer-right">
                <button className="team-btn cancel" onClick={() => setShowViewModal(false)}>Close</button>
                <button className="team-btn next" onClick={() => { setShowViewModal(false); openEdit(viewingMember); }}>
                  <EditPencil width={14} height={14} /> Edit
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
