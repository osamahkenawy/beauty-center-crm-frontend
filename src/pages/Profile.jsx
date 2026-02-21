import { useState, useContext, useRef, useCallback, useEffect } from 'react';
import { AuthContext } from '../App';
import { apiFetch, apiUpload } from '../lib/api';
import {
  User, Mail, Phone, Shield, Calendar, Edit3, Lock, CheckCircle,
  XCircle, Camera, Upload, Trash2, Save, Eye, EyeOff, Info,
  Award, Activity, Key, Star, ChevronRight, LogIn
} from 'lucide-react';
import './Profile.css';

const ROLE_META = {
  admin:        { label: 'Admin',         color: '#244066', bg: 'rgba(36,64,102,0.1)' },
  super_admin:  { label: 'Super Admin',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  manager:      { label: 'Manager',       color: '#0369a1', bg: 'rgba(3,105,161,0.1)' },
  staff:        { label: 'Staff',         color: '#374151', bg: '#f3f4f6' },
  receptionist: { label: 'Receptionist', color: '#0f766e', bg: 'rgba(15,118,110,0.1)' },
  stylist:      { label: 'Stylist',      color: '#be185d', bg: 'rgba(190,24,93,0.1)' },
  therapist:    { label: 'Therapist',    color: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  technician:   { label: 'Technician',   color: '#1d4ed8', bg: 'rgba(29,78,216,0.1)' },
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function calcStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [editForm, setEditForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [pwStrength, setPwStrength] = useState(0);
  const [stats, setStats] = useState({ appointments: 0 });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    apiFetch('/appointments/stats').then(d => {
      if (d?.success && d?.data) setStats({ appointments: d.data.total || 0 });
    }).catch(() => {});
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleEditChange = (e) => setEditForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }

    // Show local preview immediately while upload is in progress
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');

      const res = await apiUpload('/uploads', formData);
      if (res.success && res.data?.url) {
        setAvatarPreview(res.data.url);
        setEditForm(f => ({ ...f, avatar_url: res.data.url }));
        showToast('Photo uploaded successfully!');
      } else {
        setAvatarPreview(null);
        setEditForm(f => ({ ...f, avatar_url: '' }));
        showToast(res.message || 'Upload failed', 'error');
      }
    } catch {
      setAvatarPreview(null);
      setEditForm(f => ({ ...f, avatar_url: '' }));
      showToast('Upload failed. Check your connection.', 'error');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setEditForm(f => ({ ...f, avatar_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.full_name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim(),
          avatar_url: editForm.avatar_url.trim(),
        }),
      });
      if (res.success) {
        setUser(prev => ({ ...prev, ...res.user }));
        setAvatarPreview(res.user.avatar_url || null);
        showToast('Profile updated successfully!');
      } else showToast(res.message || 'Update failed', 'error');
    } catch { showToast('Network error. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm(f => ({ ...f, [name]: value }));
    if (name === 'newPw') setPwStrength(calcStrength(value));
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current) { showToast('Enter current password', 'error'); return; }
    if (pwForm.newPw.length < 6) { showToast('Minimum 6 characters required', 'error'); return; }
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return; }
    setPwSaving(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      });
      if (res.success) {
        setPwForm({ current: '', newPw: '', confirm: '' });
        setPwStrength(0);
        showToast('Password changed successfully!');
      } else showToast(res.message || 'Failed to change password', 'error');
    } catch { showToast('Network error.', 'error'); }
    finally { setPwSaving(false); }
  };

  const roleMeta = ROLE_META[user?.role] || ROLE_META.staff;
  const displayAvatar = avatarPreview || user?.avatar_url;
  const initials = getInitials(user?.full_name || user?.username);
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  const strengthColors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const TABS = [
    { key: 'overview', label: 'Overview',     Icon: User   },
    { key: 'edit',     label: 'Edit Profile', Icon: Edit3  },
    { key: 'password', label: 'Security',     Icon: Shield },
  ];

  return (
    <div className="pf-page">

      {/* ── Toast ──────────────────────────────── */}
      {toast && (
        <div className={`pf-toast pf-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <div className="pf-header">
        <div className="pf-header-content">

          {/* Avatar */}
          <div className="pf-avatar-wrap">
            <div
              className={`pf-avatar${uploading ? ' pf-avatar--uploading' : ''}`}
              onClick={() => !uploading && activeTab === 'edit' && fileInputRef.current?.click()}
              style={{ cursor: !uploading && activeTab === 'edit' ? 'pointer' : 'default' }}
            >
              {displayAvatar
                ? <img src={displayAvatar} alt={user?.full_name} className="pf-avatar-img" />
                : <div className="pf-avatar-initials">{initials}</div>
              }
              {activeTab === 'edit' && !uploading && (
                <div className="pf-avatar-overlay">
                  <Camera size={18} />
                  <span>Change</span>
                </div>
              )}
              {uploading && (
                <div className="pf-avatar-overlay pf-avatar-overlay--active">
                  <span className="pf-spinner" />
                  <span>Uploading…</span>
                </div>
              )}
            </div>
            <div className="pf-avatar-online-dot" />
            {uploading && <div className="pf-avatar-uploading"><span className="pf-spinner pf-spinner--dark" /></div>}
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {/* Identity */}
          <div className="pf-identity">
            <div className="pf-identity-row">
              <h1 className="pf-name">{user?.full_name || user?.username}</h1>
              <span className="pf-role-pill" style={{ color: roleMeta.color, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Star size={11} />
                {roleMeta.label}
              </span>
            </div>
            <div className="pf-meta">
              {user?.email && <span className="pf-meta-item"><Mail size={13} />{user.email}</span>}
              {user?.phone && <span className="pf-meta-item"><Phone size={13} />{user.phone}</span>}
              {joinDate && <span className="pf-meta-item"><Calendar size={13} />Since {joinDate}</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="pf-header-stats">
            <div className="pf-hstat">
              <span className="pf-hstat-num">{stats.appointments}</span>
              <span className="pf-hstat-lbl">Appointments</span>
            </div>
            <div className="pf-hstat-sep" />
            <div className="pf-hstat">
              <span className="pf-hstat-num">{roleMeta.label}</span>
              <span className="pf-hstat-lbl">Access Level</span>
            </div>
            <div className="pf-hstat-sep" />
            <div className="pf-hstat">
              <span className="pf-hstat-num">{user?.is_active ? 'Active' : 'Inactive'}</span>
              <span className="pf-hstat-lbl">Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────── */}
      <div className="pf-tabs-bar">
        <div className="pf-tabs">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`pf-tab ${activeTab === key ? 'pf-tab--active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────── */}
      <div className="pf-body">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="pf-grid">

            <div className="pf-card">
              <div className="pf-card-hd">
                <span className="pf-card-ico pf-card-ico--blue"><User size={15} /></span>
                <div>
                  <h3 className="pf-card-title">Personal Information</h3>
                  <p className="pf-card-sub">Your account details</p>
                </div>
                <button className="pf-card-link" onClick={() => setActiveTab('edit')}>
                  <Edit3 size={13} /> Edit
                </button>
              </div>
              <div className="pf-info-list">
                <InfoRow icon={<User size={13} />}     label="Full Name"    value={user?.full_name || '—'} />
                <InfoRow icon={<LogIn size={13} />}    label="Username"     value={`@${user?.username}`} />
                <InfoRow icon={<Mail size={13} />}     label="Email"        value={user?.email || '—'} />
                <InfoRow icon={<Phone size={13} />}    label="Phone"        value={user?.phone || 'Not set'} muted={!user?.phone} />
                <InfoRow icon={<Award size={13} />}    label="Role"
                  value={
                    <span className="pf-role-pill pf-role-pill--sm" style={{ color: roleMeta.color, background: roleMeta.bg }}>
                      {roleMeta.label}
                    </span>
                  }
                />
                <InfoRow icon={<Calendar size={13} />} label="Member Since" value={joinDate || '—'} />
              </div>
            </div>

            <div className="pf-card">
              <div className="pf-card-hd">
                <span className="pf-card-ico pf-card-ico--green"><Activity size={15} /></span>
                <div>
                  <h3 className="pf-card-title">Account Activity</h3>
                  <p className="pf-card-sub">Current status overview</p>
                </div>
              </div>
              <div className="pf-activity-list">
                <div className="pf-act-item">
                  <span className="pf-act-dot pf-act-dot--green" />
                  <div>
                    <p className="pf-act-title">Profile Active</p>
                    <p className="pf-act-desc">Account is active and in good standing</p>
                  </div>
                </div>
                <div className="pf-act-item">
                  <span className="pf-act-dot pf-act-dot--blue" />
                  <div>
                    <p className="pf-act-title">Role: {roleMeta.label}</p>
                    <p className="pf-act-desc">{roleMeta.label} level access granted</p>
                  </div>
                </div>
                {joinDate && (
                  <div className="pf-act-item">
                    <span className="pf-act-dot pf-act-dot--purple" />
                    <div>
                      <p className="pf-act-title">Account Created</p>
                      <p className="pf-act-desc">{joinDate}</p>
                    </div>
                  </div>
                )}
              </div>
              <button className="pf-sec-banner" onClick={() => setActiveTab('password')}>
                <Shield size={14} />
                <span>Keep your account secure — <strong>update password</strong></span>
                <ChevronRight size={14} />
              </button>
            </div>

            {user?.permissions && Object.keys(user.permissions).filter(k => user.permissions[k]).length > 0 && (
              <div className="pf-card pf-card--full">
                <div className="pf-card-hd">
                  <span className="pf-card-ico pf-card-ico--gold"><Key size={15} /></span>
                  <div>
                    <h3 className="pf-card-title">Permissions</h3>
                    <p className="pf-card-sub">Your granted access rights</p>
                  </div>
                </div>
                <div className="pf-perms">
                  {Object.entries(user.permissions)
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <span key={k} className="pf-perm-chip">
                        <CheckCircle size={10} />
                        {k.replace(/_/g, ' ')}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EDIT PROFILE */}
        {activeTab === 'edit' && (
          <div className="pf-form-wrap">
            <form onSubmit={handleSaveProfile}>

              {/* Photo card */}
              <div className="pf-card">
                <div className="pf-card-hd">
                  <span className="pf-card-ico pf-card-ico--blue"><Camera size={15} /></span>
                  <div>
                    <h3 className="pf-card-title">Profile Photo</h3>
                        <p className="pf-upload-hint">JPG, PNG, GIF or WebP · max 5MB · hosted on AWS S3</p>
                  </div>
                </div>
                <div className="pf-photo-editor">
                  <div
                    className="pf-photo-preview"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{ cursor: uploading ? 'default' : 'pointer' }}
                  >
                    {displayAvatar
                      ? <img src={displayAvatar} alt="Preview" />
                      : <div className="pf-avatar-initials pf-avatar-initials--lg">{initials}</div>
                    }
                    <div className="pf-avatar-overlay">
                      {uploading ? <span className="pf-spinner" /> : <Camera size={20} />}
                      <span>{uploading ? 'Uploading to S3…' : 'Change Photo'}</span>
                    </div>
                  </div>
                  <div className="pf-photo-actions">
                    <button type="button" className="pf-btn pf-btn--outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <span className="pf-spinner pf-spinner--blue" /> : <Upload size={14} />}
                      {uploading ? 'Uploading to S3…' : 'Upload Photo'}
                    </button>
                    {displayAvatar && !uploading && (
                      <button type="button" className="pf-btn pf-btn--ghost-danger" onClick={handleRemoveAvatar}>
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fields card */}
              <div className="pf-card">
                <div className="pf-card-hd">
                  <span className="pf-card-ico pf-card-ico--blue"><Edit3 size={15} /></span>
                  <div>
                    <h3 className="pf-card-title">Basic Details</h3>
                    <p className="pf-card-sub">Update your personal information</p>
                  </div>
                </div>

                <div className="pf-fields">
                  <div className="pf-field pf-field--full">
                    <label className="pf-label"><User size={13} /> Full Name</label>
                    <input type="text" name="full_name" className="pf-input" value={editForm.full_name} onChange={handleEditChange} placeholder="Enter your full name" required />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">
                      <Mail size={13} /> Email
                      <span className="pf-badge pf-badge--ro">Read-only</span>
                    </label>
                    <input type="email" className="pf-input pf-input--ro" value={user?.email || ''} readOnly />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label"><Phone size={13} /> Phone Number</label>
                    <input type="tel" name="phone" className="pf-input" value={editForm.phone} onChange={handleEditChange} placeholder="+971 50 000 0000" />
                  </div>

                  <div className="pf-field">
                    <label className="pf-label">
                      <Award size={13} /> Role
                      <span className="pf-badge pf-badge--ro">Read-only</span>
                    </label>
                    <div className="pf-input pf-input--ro" style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="pf-role-pill pf-role-pill--sm" style={{ color: roleMeta.color, background: roleMeta.bg }}>{roleMeta.label}</span>
                    </div>
                  </div>

                  <div className="pf-field pf-field--full">
                    <label className="pf-label">
                      <Camera size={13} /> Photo URL
                      <span className="pf-badge pf-badge--opt">Optional</span>
                    </label>
                    <input
                      type="url" name="avatar_url" className="pf-input"
                      value={editForm.avatar_url}
                      onChange={(e) => { handleEditChange(e); setAvatarPreview(e.target.value || null); }}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>

                <div className="pf-actions">
                  <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>
                    {saving ? <span className="pf-spinner" /> : <Save size={15} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="pf-btn pf-btn--ghost" onClick={() => {
                    setEditForm({ full_name: user?.full_name || '', phone: user?.phone || '', avatar_url: user?.avatar_url || '' });
                    setAvatarPreview(user?.avatar_url || null);
                    setActiveTab('overview');
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'password' && (
          <div className="pf-form-wrap">
            <div className="pf-card">
              <div className="pf-card-hd">
                <span className="pf-card-ico pf-card-ico--gold"><Lock size={15} /></span>
                <div>
                  <h3 className="pf-card-title">Change Password</h3>
                  <p className="pf-card-sub">Keep your account safe with a strong password</p>
                </div>
              </div>

              <div className="pf-pw-tip">
                <Info size={14} />
                Use at least 8 characters with uppercase, numbers and symbols
              </div>

              <form className="pf-fields" onSubmit={handleSavePassword}>
                <div className="pf-field pf-field--full">
                  <label className="pf-label"><Key size={13} /> Current Password</label>
                  <div className="pf-pw-row">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      name="current" className="pf-input pf-input--pw"
                      value={pwForm.current} onChange={handlePwChange}
                      placeholder="Enter current password" required
                    />
                    <button type="button" className="pf-eye" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}>
                      {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="pf-field pf-field--full">
                  <label className="pf-label"><Lock size={13} /> New Password</label>
                  <div className="pf-pw-row">
                    <input
                      type={showPw.newPw ? 'text' : 'password'}
                      name="newPw" className="pf-input pf-input--pw"
                      value={pwForm.newPw} onChange={handlePwChange}
                      placeholder="Enter new password" required
                    />
                    <button type="button" className="pf-eye" onClick={() => setShowPw(p => ({ ...p, newPw: !p.newPw }))}>
                      {showPw.newPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwForm.newPw && (
                    <div className="pf-strength">
                      <div className="pf-strength-track">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="pf-strength-seg" style={{ background: pwStrength >= i ? strengthColors[pwStrength] : '#e5e7eb' }} />
                        ))}
                      </div>
                      <span className="pf-strength-lbl" style={{ color: strengthColors[pwStrength] }}>
                        {strengthLabels[pwStrength]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pf-field pf-field--full">
                  <label className="pf-label"><CheckCircle size={13} /> Confirm New Password</label>
                  <div className="pf-pw-row">
                    <input
                      type={showPw.confirm ? 'text' : 'password'}
                      name="confirm"
                      className={`pf-input pf-input--pw${pwForm.confirm && pwForm.newPw !== pwForm.confirm ? ' pf-input--err' : ''}${pwForm.confirm && pwForm.newPw === pwForm.confirm && pwForm.newPw ? ' pf-input--ok' : ''}`}
                      value={pwForm.confirm} onChange={handlePwChange}
                      placeholder="Confirm new password" required
                    />
                    <button type="button" className="pf-eye" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}>
                      {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    {pwForm.confirm && pwForm.newPw === pwForm.confirm && pwForm.newPw && (
                      <span className="pf-pw-ok"><CheckCircle size={15} /></span>
                    )}
                  </div>
                  {pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                    <p className="pf-err-msg"><XCircle size={12} /> Passwords do not match</p>
                  )}
                </div>

                <div className="pf-actions pf-field--full">
                  <button type="submit" className="pf-btn pf-btn--primary" disabled={pwSaving}>
                    {pwSaving ? <span className="pf-spinner" /> : <Shield size={15} />}
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                  <button type="button" className="pf-btn pf-btn--ghost" onClick={() => { setPwForm({ current: '', newPw: '', confirm: '' }); setPwStrength(0); }}>
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, muted }) {
  return (
    <div className="pf-info-row">
      <span className="pf-info-ico">{icon}</span>
      <span className="pf-info-lbl">{label}</span>
      <span className={`pf-info-val${muted ? ' pf-info-val--muted' : ''}`}>{value}</span>
    </div>
  );
}
