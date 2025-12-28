import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './RegisterPage.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    industry: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Real Estate', 'Education', 'Hospitality', 'Consulting', 'Automotive',
    'Construction', 'Legal', 'Marketing', 'Insurance', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError(t('Passwords do not match'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('Password must be at least 8 characters'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name,
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          industry: formData.industry
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
        localStorage.setItem('user', JSON.stringify(data.data.user));
        navigate('/dashboard');
        window.location.reload();
      } else {
        setError(data.message || t('Registration failed'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {/* Left Side - Features */}
        <div className="register-features">
          <div className="brand-logo">
            <img src="/assets/images/logos/TRASEALLA._WHITE_LOGOsvg.svg" alt="Trasealla CRM" />
          </div>

          <h2>{t('Transform Your Business with Powerful CRM')}</h2>
          <p className="tagline">
            {t('Join thousands of businesses that trust Trasealla CRM to manage their customer relationships and drive growth.')}
          </p>

          <ul className="features-list">
            <li>
              <div className="feature-icon gradient-1">📊</div>
              <div className="feature-content">
                <strong>{t('Complete CRM Solution')}</strong>
                <p>{t('Manage leads, deals, contacts, and accounts all in one unified platform')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-2">🚀</div>
              <div className="feature-content">
                <strong>{t('Built for Growth')}</strong>
                <p>{t('Scale seamlessly from startup to enterprise with flexible plans')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-3">🌍</div>
              <div className="feature-content">
                <strong>{t('Multi-Language & Currency')}</strong>
                <p>{t('Support for Arabic, English, and multiple currencies including AED')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-4">🔒</div>
              <div className="feature-content">
                <strong>{t('Enterprise Security')}</strong>
                <p>{t('Role-based access, audit logs, and complete data protection')}</p>
              </div>
            </li>
          </ul>

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">{t('Users')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50+</span>
              <span className="stat-label">{t('Countries')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">{t('Uptime')}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="register-form-section">
          <div className="register-card">
            <div className="register-header">
              <h1>{t('Create Your Account')}</h1>
              <p>{t('Start your 14-day free trial today')}</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              {error && <div className="register-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="company_name">
                  {t('Company Name')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder={t('Enter your company name')}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="full_name">
                  {t('Your Name')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder={t('Enter your full name')}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    {t('Work Email')} <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('you@company.com')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="industry">{t('Industry')}</label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                  >
                    <option value="">{t('Select industry')}</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{t(ind)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">
                    {t('Password')} <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('Min 8 characters')}
                    required
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm_password">
                    {t('Confirm')} <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder={t('Repeat password')}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {t('Creating Account...')}
                  </>
                ) : (
                  <>
                    {t('Start Free Trial')}
                    <span style={{ marginLeft: '8px' }}>→</span>
                  </>
                )}
              </button>

              <div className="trial-benefits">
                <span><span className="check-icon">✓</span> {t('14-day free trial')}</span>
                <span><span className="check-icon">✓</span> {t('No credit card')}</span>
                <span><span className="check-icon">✓</span> {t('Cancel anytime')}</span>
              </div>
            </form>

            <div className="register-footer">
              <p>
                {t('Already have an account?')}{' '}
                <Link to="/login">{t('Sign In')}</Link>
              </p>
              <Link to="/" className="back-home">← {t('Back to Home')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
