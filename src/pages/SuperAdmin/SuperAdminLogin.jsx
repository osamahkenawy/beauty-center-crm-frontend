import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, User, Eye, EyeClosed, ShieldCheck } from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
import './SuperAdmin.css';

const SuperAdminLogin = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('superAdminToken', data.token);
      localStorage.setItem('superAdminUser', JSON.stringify(data.user));
      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="super-admin-login">
      <div className="login-background">
        <div className="bg-pattern"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img src="/assets/images/logos/TRASEALLA_LOGO.svg" alt="Trasealla" className="logo" />
            </div>
            <div className="login-badge">
              <ShieldCheck size={20} />
              <span>Platform Administration</span>
            </div>
            <h1>Super Admin Portal</h1>
            <p>Access the Trasealla CRM platform management</p>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Username or Email</label>
              <div className="input-wrapper">
                <User size={20} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Access Platform</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <a href="/login" className="back-link">← Back to CRM Login</a>
          </div>
        </div>

        <div className="security-note">
          <ShieldCheck size={16} />
          <span>This portal is for authorized Trasealla administrators only</span>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;

