import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Language } from 'iconoir-react';
import { DirhamSymbol } from 'dirham-symbol';
import 'dirham-symbol/dist/index.css';
import SEO from '../components/SEO';
import WhatsAppButton from '../components/WhatsAppButton';
import './LandingPage.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(2);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, i18n } = useTranslation();

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'CRM Inquiry',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: '' });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLangMenu && !event.target.closest('.lang-switcher-landing')) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: '' });

    try {
      const response = await fetch('https://trasealla.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({ loading: false, success: true, error: '' });
        setContactForm({ name: '', email: '', subject: 'CRM Inquiry', message: '' });
      } else {
        setFormStatus({ loading: false, success: false, error: data.error || 'Something went wrong' });
      }
    } catch (error) {
      setFormStatus({ loading: false, success: false, error: 'Failed to send message. Please try again.' });
    }
  };

  return (
    <div className="landing-page">
      <SEO page="landing" />
      {/* Mobile Header */}
      <div className={`mobile-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link to="/" className="logo">
            <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
          </Link>
          <button 
            className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
          </button>
        </div>
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {/* Language Switcher Mobile */}
          <div className="lang-switcher-landing mobile-lang-switcher">
            <button 
              className="lang-toggle-landing"
              onClick={() => setShowLangMenu(!showLangMenu)}
            >
              <Language width={18} height={18} />
              <span>{i18n.language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown-landing mobile-lang-dropdown">
                <button 
                  className={`lang-option-landing ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => changeLanguage('en')}
                >
                  🇺🇸 English
                </button>
                <button 
                  className={`lang-option-landing ${i18n.language === 'ar' ? 'active' : ''}`}
                  onClick={() => changeLanguage('ar')}
                >
                  🇦🇪 العربية
                </button>
              </div>
            )}
          </div>
          <a onClick={() => scrollToSection('home')}>{t('landing.home')}</a>
          <a onClick={() => scrollToSection('features')}>{t('landing.features')}</a>
          <a onClick={() => scrollToSection('faq')}>{t('landing.faq')}</a>
          <a onClick={() => scrollToSection('contact')}>{t('landing.contact')}</a>
          <Link to="/login">{t('landing.login')}</Link>
          <Link to="/register" className="btn-mobile-cta">{t('landing.getStarted')}</Link>
        </div>
      </div>

      {/* Desktop Header */}
      <header className={`main-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-inner">
            <div className="header-left">
              <Link to="/" className="logo" onClick={() => scrollToSection('home')}>
                <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
              </Link>
            </div>
            
            <nav className="main-nav">
              <ul>
                <li><a onClick={() => scrollToSection('home')} className="active">{t('landing.home')}</a></li>
                <li><a onClick={() => scrollToSection('features')}>{t('landing.features')}</a></li>
                <li><a onClick={() => scrollToSection('faq')}>{t('landing.faq')}</a></li>
                <li><a onClick={() => scrollToSection('contact')}>{t('landing.contact')}</a></li>
              </ul>
            </nav>
            
            <div className="header-right">
              {/* Language Switcher */}
              <div className="lang-switcher-landing">
                <button 
                  className="lang-toggle-landing"
                  onClick={() => setShowLangMenu(!showLangMenu)}
                >
                  <Language width={18} height={18} />
                  <span>{i18n.language.toUpperCase()}</span>
                </button>
                {showLangMenu && (
                  <div className="lang-dropdown-landing">
                    <button 
                      className={`lang-option-landing ${i18n.language === 'en' ? 'active' : ''}`}
                      onClick={() => changeLanguage('en')}
                    >
                      🇺🇸 English
                    </button>
                    <button 
                      className={`lang-option-landing ${i18n.language === 'ar' ? 'active' : ''}`}
                      onClick={() => changeLanguage('ar')}
                    >
                      🇦🇪 العربية
                    </button>
                  </div>
                )}
              </div>
              <Link to="/login" className="btn-text">{t('landing.login')}</Link>
              <Link to="/register" className="btn-flat">{t('landing.getStarted')}</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-bg"></div>
        <div className="container">
          <div className="hero-content">
            <h1>{t('landing.heroTitle')}</h1>
            <p className="hero-subtitle">
              {t('landing.heroSubtitle')}
            </p>
            <Link to="/register" className="btn-primary">{t('landing.getStarted')}</Link>
            
            <div className="hero-image">
              <img src="/assets/images/crm-dashboard-trasealla-solutions.png" alt="CRM Dashboard" />
            </div>
          </div>
        </div>
      </section>

      {/* Spacer */}
      <div className="spacer-100"></div>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          {/* Feature Row 1 */}
          <div className="feature-row">
            <div className="feature-text">
              <h2>{t('landing.smartLeadManagement')}</h2>
              <p className="feature-description">{t('landing.smartLeadManagementDesc')}</p>
              <Link to="/register" className="btn-primary">{t('landing.discover')}</Link>
            </div>
            <div className="feature-image">
              <img src="/assets/images/crm-reports-trasealla-solutions.png" alt="Lead Management" />
            </div>
          </div>

          {/* Feature Row 2 */}
          <div className="feature-row reverse">
            <div className="feature-image">
              <img src="/assets/images/crm-deals-trasealla-solutions.png" alt="Sales Pipeline" />
            </div>
            <div className="feature-text">
              <h2>{t('landing.visualSalesPipeline')}</h2>
              <p className="feature-description">{t('landing.visualSalesPipelineDesc')}</p>
              <Link to="/register" className="btn-primary">{t('landing.discover')}</Link>
            </div>
          </div>

          {/* Feature Row 3 */}
          <div className="feature-row">
            <div className="feature-text">
              <h2>{t('landing.actionableAnalytics')}</h2>
              <p className="feature-description">{t('landing.actionableAnalyticsDesc')}</p>
              <Link to="/register" className="btn-primary">{t('landing.discover')}</Link>
            </div>
            <div className="feature-image">
              <img src="/assets/images/crm-products-trasealla-solutions.png" alt="Product Management" />
            </div>
          </div>
        </div>
      </section>

      {/* Boxed Features Section */}
      <section className="boxed-features-section">
        <div className="container">
          <div className="boxed-features-grid">
            <div className="boxed-feature">
              <div className="boxed-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="boxed-feature-content">
                <h3>{t('landing.quickSetup')}</h3>
                <p className="feature-tagline">{t('landing.implement')}</p>
                <p>{t('landing.quickSetupDesc')}</p>
                <a href="#" className="styled-link">{t('landing.learnMore')}</a>
              </div>
            </div>

            <div className="boxed-feature">
              <div className="boxed-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="boxed-feature-content">
                <h3>{t('landing.bankLevelSecurity')}</h3>
                <p className="feature-tagline">{t('landing.secure')}</p>
                <p>{t('landing.bankLevelSecurityDesc')}</p>
                <a href="#" className="styled-link">{t('landing.learnMore')}</a>
              </div>
            </div>

            <div className="boxed-feature">
              <div className="boxed-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div className="boxed-feature-content">
                <h3>{t('landing.smartAutomation')}</h3>
                <p className="feature-tagline">{t('landing.automate')}</p>
                <p>{t('landing.smartAutomationDesc')}</p>
                <a href="#" className="styled-link">{t('landing.learnMore')}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="why-different-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('landing.whyTrasealla')}</h2>
            <div className="styled-divider"></div>
          </div>

          <div className="why-different-content">
            <div className="why-features">
              <div className="line-feature">
                <div className="line-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <path d="M20 8v6M23 11h-6"/>
                  </svg>
                </div>
                <div className="line-feature-border"></div>
                <h4>{t('landing.builtForTeams')}</h4>
                <p>{t('landing.builtForTeamsDesc')}</p>
              </div>

              <div className="line-feature">
                <div className="line-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="line-feature-border"></div>
                <h4>{t('landing.yourIndustryYourWay')}</h4>
                <p>{t('landing.yourIndustryYourWayDesc')}</p>
              </div>

              <div className="line-feature">
                <div className="line-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div className="line-feature-border"></div>
                <h4>{t('landing.aiThatWorks')}</h4>
                <p>{t('landing.aiThatWorksDesc')}</p>
              </div>
            </div>

            <div className="why-video">
              <div className="video-box">
                <img src="/assets/images/crm-calendar-trasealla-solutions.png" alt="Watch Demo" />
                <button className="video-play-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <h3 className="faq-title">{t('landing.frequentlyAskedQuestions')}</h3>
          
          <div className="faq-grid">
            <div className="faq-column">
              <div className="faq-item">
                <h4>Can I integrate my existing software with Trasealla?</h4>
                <p>Yes! Trasealla offers REST APIs and webhooks for seamless integration with your existing tools and workflows.</p>
              </div>
              <div className="faq-item">
                <h4>How many users can I add to my account?</h4>
                <p>The number of users depends on your plan. Starter includes 5 users, Professional up to 25, and Enterprise offers unlimited users.</p>
              </div>
              <div className="faq-item">
                <h4>What payment methods do you accept?</h4>
                <p>We accept all major credit cards, bank transfers, and can arrange invoicing for enterprise customers.</p>
              </div>
            </div>

            <div className="faq-column">
              <div className="faq-item">
                <h4>Can I install Trasealla on my own servers?</h4>
                <p>Yes! Our Enterprise plan includes an on-premise deployment option for organizations requiring complete data control.</p>
              </div>
              <div className="faq-item">
                <h4>How secure is my data?</h4>
                <p>We use enterprise-grade encryption, SOC 2 compliant infrastructure, and regular security audits to protect your data.</p>
              </div>
              <div className="faq-item">
                <h4>Do you offer a free trial?</h4>
                <p>Absolutely! All plans come with a 14-day free trial. No credit card required to get started.</p>
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="cta-box">
            <div className="cta-box-inner">
              <div className="cta-box-image">
                <img src="/assets/images/crm-calendar-trasealla-solutions.png" alt="Get Started" />
              </div>
              <div className="cta-box-content">
                <h3>{t('landing.readyToGrow')}</h3>
                <p className="cta-description">{t('landing.joinThousands')}</p>
                <Link to="/register" className="btn-primary">{t('landing.startFreeTrial')}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('landing.howItWorks')}</h2>
            <p className="section-subtitle">{t('landing.threeSteps')}</p>
            <div className="styled-divider"></div>
          </div>

          <div className="tabs-content">
            <div className="tabs-image">
              {activeTab === 1 && <img src="/assets/images/crm-dashboard-trasealla-solutions.png" alt="Step 1 - Dashboard" />}
              {activeTab === 2 && <img src="/assets/images/crm-deals-trasealla-solutions.png" alt="Step 2 - Deals" />}
              {activeTab === 3 && <img src="/assets/images/crm-reports-trasealla-solutions.png" alt="Step 3 - Reports" />}
            </div>
            <div className="tabs-nav">
              <button 
                className={`tab-item ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                <h4>{t('landing.signUpFree')}</h4>
                <p>{t('landing.signUpFreeDesc')}</p>
              </button>
              <button 
                className={`tab-item ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                <h4>{t('landing.importConnect')}</h4>
                <p>{t('landing.importConnectDesc')}</p>
              </button>
              <button 
                className={`tab-item ${activeTab === 3 ? 'active' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                <h4>{t('landing.closeDeals')}</h4>
                <p>{t('landing.closeDealsDesc')}</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="testimonial-slider">
            <div className="testimonial">
              <p className="testimonial-text">
                "Trasealla CRM transformed how we manage our sales pipeline. 
                We've increased our close rate by 40% in just 3 months."
              </p>
              <div className="testimonial-author">
                <h6>Ahmed Al Rashid</h6>
                <span>Sales Director, Dubai Properties LLC</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('landing.getInTouch')}</h2>
            <p className="section-subtitle">{t('landing.questionsLetsTalk')}</p>
            <div className="styled-divider"></div>
          </div>

          <div className="contact-content">
            <div className="contact-image">
              <img src="/assets/images/crm-products-trasealla-solutions.png" alt="Contact Us" />
            </div>
            <div className="contact-form">
              <form onSubmit={handleContactSubmit}>
                <div className="form-group">
                  <span className="form-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder={t('landing.yourName')} 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <span className="form-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input 
                    type="email" 
                    placeholder={t('landing.yourEmail')} 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <span className="form-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </span>
                  <textarea 
                    rows="4" 
                    placeholder={t('landing.yourMessage')} 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    required
                  ></textarea>
                </div>
                {formStatus.error && <p className="form-error">{formStatus.error}</p>}
                {formStatus.success && <p className="form-success">{t('landing.messageSent')}</p>}
                <button type="submit" className="btn-secondary" disabled={formStatus.loading}>
                  {formStatus.loading ? t('landing.sending') : t('landing.sendMessage')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo">
                <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
              </Link>
              <p>{t('landing.growthPartner')}</p>
              <p className="copyright">{t('landing.copyright')}</p>
            </div>

            <div className="footer-links-group">
              <h4>{t('landing.company')}</h4>
              <ul>
                <li><button onClick={() => scrollToSection('features')}>{t('landing.features')}</button></li>
                <li><button onClick={() => scrollToSection('contact')}>{t('landing.contact')}</button></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4>{t('landing.support')}</h4>
              <ul>
                <li><button onClick={() => scrollToSection('faq')}>{t('landing.helpCenter')}</button></li>
                <li><Link to="/privacy">{t('landing.privacyPolicy')}</Link></li>
                <li><Link to="/terms">{t('landing.termsOfService')}</Link></li>
              </ul>
            </div>

            <div className="footer-newsletter">
              <h4>{t('landing.newsletter')}</h4>
              <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <div className="newsletter-input">
                  <span className="form-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input type="email" placeholder={t('landing.emailAddress')} />
                </div>
                <button type="submit" className="btn-primary">{t('landing.subscribe')}</button>
              </form>
              <div className="social-links">
                <a href="https://wa.me/971503920037" target="_blank" rel="noopener noreferrer" className="social-link" title="WhatsApp" itemProp="sameAs">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/trasealla/" target="_blank" rel="noopener noreferrer" className="social-link" title="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="6" r="1.5"/>
                  </svg>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61582271193231" target="_blank" rel="noopener noreferrer" className="social-link" title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <WhatsAppButton phoneNumber="971503920037" />
    </div>
  );
}
