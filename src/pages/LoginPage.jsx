import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'iconoir-react';
import { AuthContext } from '../App';
import SEO from '../components/SEO';
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
        // If user already has a saved business type, navigate directly
        // If not, the App-level BusinessTypeSelector popup will appear
        const savedType = result.businessType;
        if (savedType) {
          navigate(savedType === 'beauty' ? '/beauty-dashboard' : '/dashboard');
        }
        // If no savedType, the popup handles navigation — we stay on current page briefly
        // (the popup is rendered at App level so it's visible even during route transitions)
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
    <>
      <div className="login-page">
        <SEO page="login" />
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
        <img 
          src="/assets/images/Trasealla_CRM_Background.png" 
          alt="Trasealla CRM Background" 
          className="login-background-image"
        />
      </div>
    </div>
    </>
  );
}

