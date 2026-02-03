import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import {
  HomeSimple, Mail, Building, User, Flash, Wallet, ViewColumns3,
  List, Calendar, Notes, Label, Cube, Page, Folder, Megaphone,
  City, Settings, Activity, StatsUpSquare, ClockRotateRight, Menu,
  LogOut, Language, Group, MailIn, Network, Sparks
} from 'iconoir-react';
import AIChatbot from './AIChatbot';
import './Layout.css';

const iconMap = {
  'dashboard': HomeSimple,
  'inbox': Mail,
  'accounts': Building,
  'contacts': User,
  'leads': Flash,
  'deals': Wallet,
  'pipelines': ViewColumns3,
  'activities': List,
  'calendar': Calendar,
  'notes': Notes,
  'tags': Label,
  'products': Cube,
  'quotes': Page,
  'documents': Folder,
  'campaigns': Megaphone,
  'audiences': Group,
  'email-templates': MailIn,
  'integrations': Network,
  'branches': City,
  'custom-fields': Settings,
  'workflows': Activity,
  'reports': StatsUpSquare,
  'audit-logs': ClockRotateRight,
  'mwasalat-ai': Sparks,
}; 

const navSections = [
  {
    titleKey: 'Main',
    items: [
      { path: '/dashboard', labelKey: 'common.dashboard', iconKey: 'dashboard' },
      { path: '/inbox', labelKey: 'common.inbox', iconKey: 'inbox' },
      { path: '/mwasalat-ai', labelKey: 'ai.traseallaAI', iconKey: 'mwasalat-ai'},
    ]
  },
  {
    titleKey: 'CRM',
    items: [
      { path: '/accounts', labelKey: 'common.accounts', iconKey: 'accounts' },
      { path: '/contacts', labelKey: 'common.contacts', iconKey: 'contacts' },
      { path: '/leads', labelKey: 'common.leads', iconKey: 'leads' },
      { path: '/deals', labelKey: 'common.deals', iconKey: 'deals' },
      { path: '/pipelines', labelKey: 'common.pipelines', iconKey: 'pipelines' },
      { path: '/activities', labelKey: 'common.activities', iconKey: 'activities' },
      { path: '/calendar', labelKey: 'common.calendar', iconKey: 'calendar' },
      { path: '/notes', labelKey: 'common.notes', iconKey: 'notes' },
      { path: '/tags', labelKey: 'common.tags', iconKey: 'tags' },
    ]
  },
  {
    titleKey: 'Sales',
    items: [
      { path: '/products', labelKey: 'common.products', iconKey: 'products' },
      { path: '/quotes', labelKey: 'common.quotes', iconKey: 'quotes' },
      { path: '/documents', labelKey: 'common.documents', iconKey: 'documents' },
    ]
  },
  {
    titleKey: 'Marketing',
    items: [
      { path: '/campaigns', labelKey: 'common.campaigns', iconKey: 'campaigns' },
      { path: '/audiences', labelKey: 'common.audiences', iconKey: 'audiences' },
      { path: '/email-templates', labelKey: 'common.emailTemplates', iconKey: 'email-templates' },
      { path: '/integrations', labelKey: 'common.integrations', iconKey: 'integrations' },
    ]
  },
  {
    titleKey: 'Settings',
    items: [
      { path: '/branches', labelKey: 'common.branches', iconKey: 'branches' },
      { path: '/custom-fields', labelKey: 'common.customFields', iconKey: 'custom-fields' },
      { path: '/workflows', labelKey: 'common.workflows', iconKey: 'workflows' },
      { path: '/reports', labelKey: 'common.reports', iconKey: 'reports' },
      { path: '/audit-logs', labelKey: 'common.auditLogs', iconKey: 'audit-logs' },
    ]
  }
];

const allNavItems = navSections.flatMap(s => s.items);

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { user, tenant, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const getPageTitle = () => {
    const item = allNavItems.find(item => item.path === location.pathname);
    return item ? t(item.labelKey) : 'CRM';
  };

  const renderIcon = (iconKey) => {
    const IconComponent = iconMap[iconKey];
    return IconComponent ? <IconComponent width={20} height={20} strokeWidth={1.5} /> : null;
  };

  return (
    <div className={`staff-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isRTL ? 'rtl' : ''}`}>
      <div 
        className={`sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`custom-sidebar ${sidebarOpen ? (isMobile ? 'open' : '') : 'closed'}`}>
        <div className="sidebar-brand">
          <Link to="/dashboard">
            <img 
              src="/assets/images/logos/TRASEALLA._WHITE_LOGOsvg.svg" 
              alt="Trasealla CRM" 
              style={{ height: '45px' }} 
            />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.titleKey} className="nav-section">
              <div className="sidebar-nav-label">{t(`layout.${section.titleKey}`)}</div>
              {section.items.map((item) => (
                <div key={item.path} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''} ${item.isNew ? 'ai-link' : ''}`}
                  >
                    {renderIcon(item.iconKey)}
                    <span>{t(item.labelKey)}</span>
                    {item.isNew && <span className="nav-new-badge">NEW</span>}
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className={`custom-topbar ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="topbar-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu width={24} height={24} />
          </button>
          
          {!sidebarOpen && (
            <div className="topbar-brand-mobile">
              <img 
                src="/assets/images/logos/T_ONLY.png" 
                alt="T" 
                style={{ height: '35px', marginRight: '10px' }} 
              />
            </div>
          )}
          
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        <div className="topbar-actions">
          {/* Language Switcher */}
          <div className="lang-switcher">
            <button 
              className="lang-toggle"
              onClick={() => setShowLangMenu(!showLangMenu)}
            >
              <Language width={20} height={20} />
              <span>{i18n.language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown">
                <button 
                  className={`lang-option ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => changeLanguage('en')}
                >
                  🇺🇸 English
                </button>
                <button 
                  className={`lang-option ${i18n.language === 'ar' ? 'active' : ''}`}
                  onClick={() => changeLanguage('ar')}
                >
                  🇦🇪 العربية
                </button>
              </div>
            )}
          </div>

          {user?.role === 'super_admin' && (
            <span className="role-badge super-admin">SUPER ADMIN</span>
          )}
          {user?.role === 'admin' && (
            <span className="role-badge admin">ADMIN</span>
          )}
          {user?.role === 'staff' && (
            <span className="role-badge staff">STAFF</span>
          )}
          
          <div className="user-menu-wrapper">
            <button 
              className="user-avatar-toggle" 
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </button>
            
            <div className={`user-dropdown ${showUserMenu ? 'show' : ''}`}>
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <strong>{user?.full_name || user?.username}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              <Link to="/profile" className="user-dropdown-item">
                <User width={18} height={18} />
                {t('common.profile')}
              </Link>
              <button onClick={handleLogout} className="user-dropdown-item danger">
                <LogOut width={18} height={18} />
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        {children}
      </main>

      <footer className={`custom-footer ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        {t('common.copyright')}
      </footer>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
