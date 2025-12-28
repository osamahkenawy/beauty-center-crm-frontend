import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'iconoir-react';
import { AuthContext } from '../App';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername('demo');
    setPassword('demo123');
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <Link to="/" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>
        
        <div className="login-content">
          <div className="login-header">
            <div className="logo">
              <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your CRM account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="demo-section">
            <p>Try the demo account:</p>
            <button type="button" className="btn btn-outline btn-block" onClick={fillDemo}>
              Use Demo Credentials
            </button>
            <div className="demo-hint">
              <code>demo / demo123</code> • <code>admin / Trasealla123</code>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="showcase">
          <div className="showcase-content">
            <h2>Manage Your Business<br/>Like Never Before</h2>
            <ul className="feature-list">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Track leads and opportunities
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Visualize your sales pipeline
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Automate workflows
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Get real-time analytics
              </li>
            </ul>
          </div>
          <div className="showcase-illustration">
            <div className="mock-dashboard">
              <div className="mock-stat">
                <div className="mock-stat-value">$124K</div>
                <div className="mock-stat-label">Revenue</div>
              </div>
              <div className="mock-stat">
                <div className="mock-stat-value">256</div>
                <div className="mock-stat-label">Leads</div>
              </div>
              <div className="mock-chart"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

