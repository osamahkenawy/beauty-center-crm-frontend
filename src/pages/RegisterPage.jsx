import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
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

  const translateIndustry = (industry) => {
    return t(`industries.${industry}`, { defaultValue: industry });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('auth.passwordMustBeAtLeast8Characters'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/tenants/register`, {
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
        setError(data.message || t('auth.registrationFailed'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('auth.registrationFailedPleaseTryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <SEO page="register" />
      <div className="register-container">
        {/* Left Side - Features */}
        <div className="register-features">
          <div className="brand-logo">
            <img src="/assets/images/logos/TRASEALLA._WHITE_LOGOsvg.svg" alt="Trasealla CRM" />
          </div>

          <h2>{t('auth.transformYourBusiness')}</h2>
          <p className="tagline">
            {t('auth.joinThousands')}
          </p>

          <ul className="features-list">
            <li>
              <div className="feature-icon gradient-1">📊</div>
              <div className="feature-content">
                <strong>{t('auth.completeCrmSolution')}</strong>
                <p>{t('auth.manageLeadsDeals')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-2">🚀</div>
              <div className="feature-content">
                <strong>{t('auth.builtForGrowth')}</strong>
                <p>{t('auth.scaleSeamlessly')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-3">🌍</div>
              <div className="feature-content">
                <strong>{t('auth.multiLanguageCurrency')}</strong>
                <p>{t('auth.supportForArabic')}</p>
              </div>
            </li>
            <li>
              <div className="feature-icon gradient-4">🔒</div>
              <div className="feature-content">
                <strong>{t('auth.enterpriseSecurity')}</strong>
                <p>{t('auth.roleBasedAccess')}</p>
              </div>
            </li>
          </ul>

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">{t('auth.users')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50+</span>
              <span className="stat-label">{t('auth.countries')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">{t('auth.uptime')}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="register-form-section">
          <div className="register-card">
            <div className="register-header">
              <h1>{t('auth.createYourAccount')}</h1>
              <p>{t('auth.startFreeTrialToday')}</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              {error && <div className="register-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="company_name">
                  {t('auth.companyName')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder={t('auth.enterCompanyName')}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="full_name">
                  {t('auth.yourName')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder={t('auth.enterFullName')}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    {t('auth.workEmail')} <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('auth.youAtCompany')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="industry">{t('auth.industry')}</label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                  >
                    <option value="">{t('auth.selectIndustry')}</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{translateIndustry(ind)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">
                    {t('auth.password')} <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('auth.min8Characters')}
                    required
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm_password">
                    {t('auth.confirmPassword')} <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder={t('auth.repeatPassword')}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {t('auth.creatingAccount')}
                  </>
                ) : (
                  <>
                    {t('auth.startFreeTrial')}
                    <span style={{ marginLeft: '8px' }}>→</span>
                  </>
                )}
              </button>

              <div className="trial-benefits">
                <span><span className="check-icon">✓</span> {t('auth.dayFreeTrial')}</span>
                <span><span className="check-icon">✓</span> {t('auth.noCreditCard')}</span>
                <span><span className="check-icon">✓</span> {t('auth.cancelAnytime')}</span>
              </div>
            </form>

            <div className="register-footer">
              <p>
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login">{t('auth.signIn')}</Link>
              </p>
              <Link to="/" className="back-home">← {t('auth.backToHome')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
