import { useState } from 'react';
import { ShieldCheck, Mail, Bell, Key, CheckCircle } from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const SuperAdminSettings = () => {
  const user = JSON.parse(localStorage.getItem('superAdminUser') || '{}');
  const [section, setSection]   = useState('account');
  const [toast,   setToast]     = useState(null);
  const [saving,  setSaving]    = useState(false);

  // Account form
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email,    setEmail]    = useState(user.email    || '');

  // Password form
  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');

  // Notification prefs (stored locally for now)
  const [notifNewTenant,   setNotifNewTenant]   = useState(true);
  const [notifSuspend,     setNotifSuspend]     = useState(true);
  const [notifRevenue,     setNotifRevenue]     = useState(false);

  const showToast = (msg, type) => {
    setToast({ msg, type: type || 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Optimistic update — update localStorage
      const updated = { ...user, full_name: fullName, email };
      localStorage.setItem('superAdminUser', JSON.stringify(updated));
      showToast('Account settings saved');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confPw) { showToast('New passwords do not match', 'error'); return; }
    if (newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(API_BASE_URL + '/super-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      if (res.ok) {
        showToast('Password changed successfully');
        setCurPw(''); setNewPw(''); setConfPw('');
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to change password', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const SECTIONS = [
    { key: 'account',       label: 'Account',       icon: ShieldCheck },
    { key: 'password',      label: 'Password',      icon: Key         },
    { key: 'notifications', label: 'Notifications', icon: Bell        },
    { key: 'email',         label: 'Email Config',  icon: Mail        },
  ];

  return (
    <div>
      {toast && <div className={'sa-toast ' + toast.type}><CheckCircle size={16}/> {toast.msg}</div>}

      <div className="sa-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your super admin account and platform preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Sidebar */}
        <div className="sa-card" style={{ padding: '12px 8px', height: 'fit-content' }}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: section === s.key ? 'rgba(99,102,241,0.15)' : 'none',
                color: section === s.key ? 'var(--sa-primary2)' : 'var(--sa-text2)',
                fontWeight: section === s.key ? 600 : 400,
                fontSize: 14, marginBottom: 2, textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <s.icon size={16} />{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="sa-card">
          {/* Account */}
          {section === 'account' && (
            <form onSubmit={handleSaveAccount}>
              <div className="sa-card-header" style={{ marginBottom: 20 }}>
                <h2>Account Details</h2>
              </div>
              <div className="sa-form-row">
                <div className="sa-form-group">
                  <label>Full Name</label>
                  <input className="sa-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="sa-form-group">
                  <label>Email</label>
                  <input className="sa-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@domain.com" />
                </div>
              </div>
              <div className="sa-form-group">
                <label>Role</label>
                <input className="sa-input" value="Super Admin (Platform Owner)" readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="sa-primary-btn" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Password */}
          {section === 'password' && (
            <form onSubmit={handleChangePassword}>
              <div className="sa-card-header" style={{ marginBottom: 20 }}>
                <h2>Change Password</h2>
              </div>
              <div className="sa-form-group">
                <label>Current Password</label>
                <input className="sa-input" type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Current password" required />
              </div>
              <div className="sa-form-group">
                <label>New Password</label>
                <input className="sa-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" required />
              </div>
              <div className="sa-form-group">
                <label>Confirm New Password</label>
                <input className="sa-input" type="password" value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="Repeat new password" required />
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="sa-primary-btn" type="submit" disabled={saving || !curPw || !newPw || !confPw}>
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* Notifications */}
          {section === 'notifications' && (
            <div>
              <div className="sa-card-header" style={{ marginBottom: 20 }}>
                <h2>Notification Preferences</h2>
              </div>
              {[
                { key: 'newTenant',   label: 'New tenant registered',         sub: 'Alert when a new tenant signs up via Stripe or manual create', val: notifNewTenant,   set: setNotifNewTenant   },
                { key: 'suspend',     label: 'Tenant suspended/reactivated',  sub: 'Alert when you change a tenant status',                        val: notifSuspend,     set: setNotifSuspend     },
                { key: 'revenue',     label: 'Daily revenue digest',          sub: 'Get a daily summary of platform revenue',                      val: notifRevenue,     set: setNotifRevenue     },
              ].map((n) => (
                <div key={n.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: '1px solid var(--sa-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sa-text)' }}>{n.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--sa-text3)', marginTop: 3 }}>{n.sub}</div>
                  </div>
                  <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                    <input type="checkbox" checked={n.val} onChange={e => n.set(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: 12,
                      background: n.val ? 'var(--sa-primary)' : 'var(--sa-surface3)',
                      transition: 'background 0.2s',
                    }} />
                    <span style={{
                      position: 'absolute', top: 3, left: n.val ? 21 : 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </label>
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                <button className="sa-primary-btn" onClick={() => showToast('Notification preferences saved')}>
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Email Config */}
          {section === 'email' && (
            <div>
              <div className="sa-card-header" style={{ marginBottom: 20 }}>
                <h2>Email Configuration</h2>
              </div>
              <div
                style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                  fontSize: 13, color: 'var(--sa-text2)', display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <Mail size={18} style={{ color: 'var(--sa-primary2)', flexShrink: 0, marginTop: 2 }} />
                <span>Transactional emails are sent via the configured SMTP provider (Mailtrap/SMTP credentials in <code style={{ fontSize:12 }}>.env</code>). To change the SMTP settings, update <code style={{ fontSize:12 }}>SMTP_HOST</code>, <code style={{ fontSize:12 }}>SMTP_USER</code>, and <code style={{ fontSize:12 }}>SMTP_PASS</code> environment variables and restart the backend.</span>
              </div>
              {[
                { label: 'SMTP Host',     placeholder: 'smtp.example.com'  },
                { label: 'SMTP Port',     placeholder: '587'               },
                { label: 'SMTP Username', placeholder: 'user@example.com'  },
                { label: 'From Name',     placeholder: 'Trasealla Platform' },
              ].map((f) => (
                <div className="sa-form-group" key={f.label}>
                  <label>{f.label}</label>
                  <input className="sa-input" placeholder={f.placeholder + ' (from .env)'} readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--sa-text3)', marginTop: 8 }}>
                These fields are managed via environment variables for security. Direct editing coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
