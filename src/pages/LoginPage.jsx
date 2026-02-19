import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Eye, EyeClosed, Check, ArrowRight } from 'iconoir-react';
import { AuthContext } from '../App';
import SEO from '../components/SEO';
import './LoginPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function LoginPage() {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');

  // Forgot password state
  const [view,     setView]       = useState('login');   // 'login' | 'forgot' | 'sent'
  const [fpEmail,  setFpEmail]    = useState('');
  const [fpLoading,setFpLoading]  = useState(false);
  const [fpError,  setFpError]    = useState('');

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  // ── Login ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        const savedType = result.businessType;
        if (savedType) {
          navigate(savedType === 'beauty' ? '/beauty-dashboard' : '/dashboard');
        }
      } else {
        setError(result.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => { setUsername('demo'); setPassword('demo123'); };

  // ── Forgot Password ────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setFpError('');
    if (!fpEmail.trim()) { setFpError('Please enter your email address.'); return; }
    setFpLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setView('sent');
      } else {
        setFpError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setFpError('Network error. Please check your connection.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="login-page">
      <SEO page="login" />

      {/* ── Left Panel ── */}
      <div className="login-left">
        <Link to="/" className="back-link">
          <ArrowLeft width={18} height={18} />
          Back to Home
        </Link>

        <div className="login-content">

          {/* Logo */}
          <div className="login-header">
            <div className="logo">
              <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
            </div>
          </div>

          {/* ══ LOGIN VIEW ══ */}
          {view === 'login' && (
            <div className="lp-view lp-view-enter">
              <h1>Welcome Back</h1>
              <p className="lp-subtitle">Sign in to your CRM account</p>

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="lp-error">
                    <span>⚠</span> {error}
                  </div>
                )}

                <div className="lp-field">
                  <label>Username or Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="lp-field">
                  <div className="lp-field-row">
                    <label>Password</label>
                    <button
                      type="button"
                      className="lp-forgot-link"
                      onClick={() => { setView('forgot'); setFpEmail(username.includes('@') ? username : ''); setFpError(''); }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="lp-pw-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="lp-pw-eye" onClick={() => setShowPw(p => !p)}>
                      {showPw ? <EyeClosed width={16} height={16} /> : <Eye width={16} height={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="lp-btn-primary" disabled={loading}>
                  {loading ? <span className="lp-spinner" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="lp-divider"><span>or</span></div>

              <div className="lp-demo-section">
                <p>Try the demo account:</p>
                <button type="button" className="lp-btn-outline" onClick={fillDemo}>
                  Use Demo Credentials
                </button>
                <div className="lp-demo-hint">
                  <code>demo / demo123</code> · <code>admin / Trasealla123</code>
                </div>
              </div>
            </div>
          )}

          {/* ══ FORGOT PASSWORD VIEW ══ */}
          {view === 'forgot' && (
            <div className="lp-view lp-view-enter">
              <button className="lp-back-view" onClick={() => { setView('login'); setFpError(''); }}>
                <ArrowLeft width={16} height={16} /> Back to sign in
              </button>

              <div className="lp-fp-icon">
                <Mail width={28} height={28} />
              </div>
              <h1>Forgot Password?</h1>
              <p className="lp-subtitle">
                Enter your account email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgot} className="login-form">
                {fpError && (
                  <div className="lp-error">
                    <span>⚠</span> {fpError}
                  </div>
                )}

                <div className="lp-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <button type="submit" className="lp-btn-primary" disabled={fpLoading}>
                  {fpLoading ? <span className="lp-spinner" /> : <ArrowRight width={16} height={16} />}
                  {fpLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}

          {/* ══ EMAIL SENT VIEW ══ */}
          {view === 'sent' && (
            <div className="lp-view lp-view-enter lp-sent-view">
              <div className="lp-sent-icon">
                <Check width={30} height={30} />
              </div>
              <h1>Check Your Inbox</h1>
              <p className="lp-subtitle">
                We sent a password reset link to <strong>{fpEmail}</strong>.
                The link expires in 1 hour.
              </p>
              <div className="lp-sent-tips">
                <p>Didn't receive it?</p>
                <ul>
                  <li>Check your spam / junk folder</li>
                  <li>Make sure you entered the correct email</li>
                </ul>
              </div>
              <button
                type="button"
                className="lp-btn-outline"
                onClick={() => { setView('forgot'); setFpError(''); }}
              >
                Try a different email
              </button>
              <button
                type="button"
                className="lp-back-view"
                style={{ marginTop: 12 }}
                onClick={() => setView('login')}
              >
                <ArrowLeft width={16} height={16} /> Back to sign in
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <img
          src="/assets/images/Trasealla_CRM_Background.png"
          alt="Trasealla CRM"
          className="login-background-image"
        />
      </div>
    </div>
  );
}
