import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeClosed, Check, WarningTriangle, RefreshDouble, Shield } from 'iconoir-react';
import './ResetPasswordPage.css'; // Reuse the same styles

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Password strength checker
function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',    color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair',    color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good',    color: '#3b82f6' };
  return             { score, label: 'Strong',  color: '#10b981' };
}

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('validating'); // validating | form | success | invalid
  const [userName, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getStrength(password);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      setError('Invalid invite link. Please check your email for the correct link.');
      return;
    }

    // Validate token with backend
    fetch(`${API_BASE}/staff/set-password/validate?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        // Check if response is OK (200-299)
        if (!r.ok) {
          // Try to parse error response
          const errorData = await r.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setName(data.name || '');
          setPhase('form');
        } else {
          setPhase('invalid');
          setError(data.message || 'This invite link is invalid or expired.');
        }
      })
      .catch((err) => {
        console.error('Token validation error:', err);
        setPhase('invalid');
        // Check if it's a network/endpoint error
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          setError('Endpoint not found. Please make sure the backend server is running and restart it if needed.');
        } else if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
          setError('Network error. Please check your connection and make sure the backend server is running.');
        } else {
          setError(err.message || 'Failed to validate invite link. Please try again or contact support.');
        }
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); 
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.'); 
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/staff/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPhase('success');
        // Auto-redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'Failed to set password. Please try again.');
        if (data.message?.includes('expired') || data.message?.includes('invalid')) {
          setPhase('invalid');
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Set password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = userName?.split(' ')[0] || '';

  return (
    <div className="rp-page">
      <div className="rp-card">
        {/* Logo */}
        <div className="rp-logo">
          <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
        </div>

        {/* ── VALIDATING ── */}
        {phase === 'validating' && (
          <div className="rp-center">
            <RefreshDouble width={32} height={32} className="rp-spin rp-icon-muted" />
            <p className="rp-muted">Loading your invite…</p>
          </div>
        )}

        {/* ── INVALID / EXPIRED ── */}
        {phase === 'invalid' && (
          <div className="rp-center">
            <div className="rp-icon-circle rp-icon-red">
              <WarningTriangle width={28} height={28} />
            </div>
            <h2>{error?.includes('not found') || error?.includes('Network') ? 'Connection Error' : 'Invite Link Expired'}</h2>
            <p className="rp-muted">
              {error || 'This invite link is invalid or has expired. Please ask your administrator to resend the invitation.'}
            </p>
            <Link to="/login" className="rp-btn-primary" style={{ marginTop: 8 }}>
              Go to Sign In
            </Link>
          </div>
        )}

        {/* ── FORM ── */}
        {phase === 'form' && (
          <>
            <div className="rp-header">
              <div className="rp-icon-circle rp-icon-dark">
                <Shield width={24} height={24} />
              </div>
              <h2>Set Your Password</h2>
              <p className="rp-muted">
                {firstName ? `Hi ${firstName}! ` : ''}Welcome to the team! Please set a secure password to activate your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rp-form">
              {error && (
                <div className="rp-error">
                  <WarningTriangle width={14} height={14} /> {error}
                </div>
              )}

              {/* New password */}
              <div className="rp-field">
                <label>Password</label>
                <div className="rp-pw-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                  <button type="button" className="rp-pw-eye" onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeClosed width={15} height={15} /> : <Eye width={15} height={15} />}
                  </button>
                </div>

                {/* Strength meter */}
                {password && (
                  <div className="rp-strength">
                    <div className="rp-strength-bar">
                      {[1,2,3,4].map(i => (
                        <div
                          key={i}
                          className="rp-strength-seg"
                          style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}

                <div className="rp-requirements">
                  {[
                    { ok: password.length >= 6,      text: 'At least 6 characters' },
                    { ok: password.length >= 8,      text: '8+ characters (recommended)' },
                    { ok: /[A-Z]/.test(password),    text: 'One uppercase letter (recommended)' },
                    { ok: /[0-9]/.test(password),    text: 'One number (recommended)' },
                  ].map(r => (
                    <div key={r.text} className={`rp-req ${r.ok ? 'ok' : ''}`}>
                      <Check width={11} height={11} />
                      {r.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm password */}
              <div className="rp-field">
                <label>Confirm Password</label>
                <div className="rp-pw-wrap">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    style={{
                      borderColor: confirm && password !== confirm ? '#ef4444'
                                 : confirm && password === confirm ? '#10b981'
                                 : undefined
                    }}
                  />
                  <button type="button" className="rp-pw-eye" onClick={() => setShowCf(p => !p)}>
                    {showCf ? <EyeClosed width={15} height={15} /> : <Eye width={15} height={15} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <span className="rp-mismatch">Passwords do not match</span>
                )}
                {confirm && password === confirm && (
                  <span className="rp-match"><Check width={12} height={12} /> Passwords match</span>
                )}
              </div>

              <button
                type="submit"
                className="rp-btn-primary"
                disabled={loading || password !== confirm || password.length < 6}
              >
                {loading ? <span className="rp-spinner" /> : <Check width={16} height={16} />}
                {loading ? 'Setting Password…' : 'Set Password'}
              </button>
            </form>
          </>
        )}

        {/* ── SUCCESS ── */}
        {phase === 'success' && (
          <div className="rp-center">
            <div className="rp-icon-circle rp-icon-green">
              <Check width={30} height={30} />
            </div>
            <h2>Password Set Successfully! 🎉</h2>
            <p className="rp-muted">
              Your account has been activated. You can now sign in with your email and password.
            </p>
            <p className="rp-redirect-note">Redirecting to sign in…</p>
            <Link to="/login" className="rp-btn-primary" style={{ marginTop: 4 }}>
              Sign In Now
            </Link>
          </div>
        )}

        {/* Back link */}
        {phase !== 'validating' && phase !== 'success' && (
          <div className="rp-footer">
            <Link to="/login" className="rp-back">
              <ArrowLeft width={14} height={14} /> Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
