import { useState, useContext, useEffect, useReducer, useCallback, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Collapse } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Menu, X, QrCode } from 'lucide-react';
import { Bell, Group, Notes, Wifi } from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import AIChatbot from './AIChatbot';
import './BeautyLayout.css';

// Reducer for menu state
const reducer = (previousState, updatedState) => ({
  ...previousState,
  ...updatedState,
});

const initialState = {
  active: "",
  activeSubmenu: "",
};

// Beauty Center Navigation Menu - with module permission keys for filtering
const beautyMenuList = [
  { title: 'MAIN', classsChange: 'menu-title' },
  {
    title: 'Dashboard',
    to: '/beauty-dashboard',
    iconStyle: <i className="flaticon-home" />,
    module: 'dashboard',
  },
  {
    title: 'Appointments',
    to: '/appointments',
    iconStyle: <i className="flaticon-calendar-2" />,
    module: 'appointments',
  },
  {
    title: 'Clients',
    to: '/beauty-clients',
    iconStyle: <i className="flaticon-user" />,
    module: 'clients',
  },
  { title: 'SERVICES', classsChange: 'menu-title' },
  {
    title: 'Team',
    to: '/team',
    iconStyle: <Group width={20} height={20} style={{ display: 'inline-flex' }} />,
    module: 'team',
  },
  { title: 'BUSINESS', classsChange: 'menu-title' },
  {
    title: 'Payments',
    to: '/beauty-payments',
    iconStyle: <i className="flaticon-shopping-cart" />,
    module: 'payments',
  },
  {
    title: 'Loyalty',
    to: '/loyalty',
    iconStyle: <i className="flaticon-heart-1" />,
    module: 'loyalty',
  },
  {
    title: 'Gift Cards',
    to: '/gift-cards',
    iconStyle: <i className="flaticon-price-tag" />,
    module: 'gift_cards',
  },
  {
    title: 'Packages',
    to: '/packages',
    iconStyle: <i className="flaticon-app" />,
    module: 'packages',
  },
  {
    title: 'Memberships',
    to: '/memberships',
    iconStyle: <i className="flaticon-user-1" />,
    module: 'memberships',
  },
  {
    title: 'Promotions',
    to: '/promotions',
    iconStyle: <i className="flaticon-price-tag" />,
    module: 'promotions',
  },
  {
    title: 'Reviews',
    to: '/reviews',
    iconStyle: <i className="flaticon-heart-1" />,
    module: 'reviews',
  },
  {
    title: 'Waitlist',
    to: '/waitlists',
    iconStyle: <i className="flaticon-calendar-2" />,
    module: 'waitlist',
  },
  {
    title: 'Reports',
    to: '/beauty-reports',
    iconStyle: <i className="flaticon-bar-chart" />,
    module: 'reports',
  },
  {
    title: 'Staff Analytics',
    to: '/beauty-staff-performance',
    iconStyle: <i className="flaticon-network" />,
    module: 'reports',
  },
  {
    title: 'Notifications',
    to: '/notifications',
    iconStyle: <Bell width={20} height={20} style={{ display: 'inline-flex' }} />,
    module: 'notifications',
  },
  {
    title: 'Marketing',
    to: '/marketing',
    iconStyle: <i className="flaticon-rocket" />,
    module: 'marketing',
  },
  { title: 'OPERATIONS', classsChange: 'menu-title' },
  {
    title: 'Point of Sale',
    to: '/pos',
    iconStyle: <i className="flaticon-shopping-cart" />,
    module: 'pos',
  },
  {
    title: 'Group Bookings',
    to: '/group-bookings',
    iconStyle: <i className="flaticon-calendar-2" />,
    module: 'group_bookings',
  },
  {
    title: 'Consultation Forms',
    to: '/consultation-forms',
    iconStyle: <Notes width={20} height={20} style={{ display: 'inline-flex' }} />,
    module: 'consultation_forms',
  },
  {
    title: 'Patch Tests',
    to: '/patch-tests',
    iconStyle: <i className="flaticon-app" />,
    module: 'patch_tests',
  },
  {
    title: 'Inventory',
    to: '/inventory',
    iconStyle: <i className="flaticon-app" />,
    module: 'inventory',
  },
  {
    title: 'App Connect',
    to: '/app-connect',
    iconStyle: <Wifi width={20} height={20} style={{ display: 'inline-flex' }} />,
    module: 'settings',
    isHighlight: true,
  },
  { title: 'TOOLS', classsChange: 'menu-title' },
  {
    title: 'Generate QR Codes',
    to: '/tools/qr-codes',
    iconStyle: <QrCode width={20} height={20} style={{ display: 'inline-flex' }} />,
  },
  { title: 'SETTINGS', classsChange: 'menu-title', adminOnly: true },
  {
    title: 'Settings',
    classsChange: 'mm-collapse',
    iconStyle: <i className="flaticon-app" />,
    module: 'settings',
    content: [
      { title: 'Business Info', to: '/beauty-settings/business' },
      { title: 'Locations', to: '/beauty-settings/branches' },
      { title: 'Categories', to: '/beauty-settings/categories' },
      { title: 'Service Menu', to: '/beauty-settings/services' },
      { title: 'Resources', to: '/beauty-settings/resources' },
      { title: 'Working Hours', to: '/beauty-settings/hours' },
      { title: 'Notifications', to: '/beauty-settings/notifications' },
      { title: 'Terms & Conditions', to: '/beauty-settings/terms' },
      { title: 'Online Booking', to: '/beauty-settings/booking' },
      { title: 'Team', to: '/beauty-settings/team' },
      { title: 'Roles & Permissions', to: '/beauty-settings/roles' },
      { title: 'Email Templates', to: '/beauty-settings/email-templates' },
      { title: 'Sales', to: '/beauty-settings/sales' },
    ],
  },
];

// Check if user's role has permission for a module
function canUserAccess(user, rolePerms, module) {
  if (!user) return false;
  // Admin, super_admin, owner always have access
  const role = user.role;
  const perms = user.permissions || {};
  if (role === 'admin' || role === 'super_admin' || user.is_owner || perms.all || perms.platform_owner) return true;
  // Check role-based permissions
  if (rolePerms && rolePerms[module]) {
    return rolePerms[module].view === true;
  }
  return false;
}

export default function BeautyLayout({ children }) {
  const [state, setState] = useReducer(reducer, initialState);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [iconHover, setIconHover] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [rolePerms, setRolePerms] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Sidebar logo – reserved for platform branding (leave empty for now)

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

  // Set active menu based on current path
  let path = location.pathname;
  path = path.split("/");
  path = path[path.length - 1] || path[path.length - 2];

  useEffect(() => {
    beautyMenuList.forEach((data) => {
      if (data.to && location.pathname === data.to) {
        setState({ active: data.title });
      }
      data.content?.forEach((item) => {
        if (location.pathname === item.to || location.pathname.startsWith(item.to)) {
          setState({ active: data.title });
        }
        item.content?.forEach(ele => {
          if (location.pathname === ele.to) {
            setState({ activeSubmenu: item.title, active: data.title });
          }
        });
      });
    });
  }, [location.pathname]);

  const handleMenuActive = (status) => {
    setState({ active: status });
    if (state.active === status) {
      setState({ active: "" });
    }
  };

  const handleSubmenuActive = (status) => {
    setState({ activeSubmenu: status });
    if (state.activeSubmenu === status) {
      setState({ activeSubmenu: "" });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Fetch unread notification count periodically
  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.success) setUnreadCount(res.count || 0);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30 seconds
    
    // Listen for custom event when notifications are marked as read
    const handleNotificationRead = () => {
      fetchUnread(); // Immediately refresh count
    };
    window.addEventListener('notification-read', handleNotificationRead);
    window.addEventListener('notification-read-all', handleNotificationRead);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-read', handleNotificationRead);
      window.removeEventListener('notification-read-all', handleNotificationRead);
    };
  }, [fetchUnread]);

  // Fetch user's role permissions for menu filtering
  useEffect(() => {
    const fetchRolePerms = async () => {
      try {
        const res = await api.get('/roles');
        if (res.success && res.data) {
          const myRole = res.data.find(r => r.name === user?.role);
          if (myRole) {
            setRolePerms(myRole.permissions || {});
          }
        }
      } catch (e) { /* roles table might not exist yet */ }
    };
    if (user?.role) fetchRolePerms();
  }, [user?.role]);

  const toggleNotifPopup = async () => {
    const newState = !showNotifPopup;
    setShowNotifPopup(newState);
    setShowUserMenu(false);
    setShowLangMenu(false);
    if (newState) {
      try {
        const res = await api.get('/notifications?limit=5&is_read=0');
        if (res.success) setRecentNotifs(res.data || []);
      } catch (e) { /* ignore */ }
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  return (
    <div className={`beauty-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isRTL ? 'rtl' : ''}`}>
      {/* Overlay for mobile */}
      <div 
        className={`beauty-overlay ${sidebarOpen && isMobile ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      {/* Nav Header (Logo) */}
      <div className="nav-header">
        <Link to="/beauty-dashboard" className="brand-logo">
          <span className="logo-placeholder" />
        </Link>
        <div 
          className="nav-control"
          data-tooltip="Toggle sidebar"
          data-tooltip-pos="bottom"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={24} color="#fff" strokeWidth={2.2} />
        </div>
      </div>

      {/* Sidebar */}
      <div 
        className={`ic-sidenav ${iconHover ? 'icon-hover' : ''} ${sidebarOpen ? '' : 'closed'}`}
        onMouseEnter={() => setIconHover(true)}
        onMouseLeave={() => setIconHover(false)}
      >
        <div className="ic-sidenav-scroll">
          <ul className="metismenu" id="menu">
            {beautyMenuList.map((data, index) => {
              let menuClass = data.classsChange;
              
              // Menu Title
              if (menuClass === "menu-title") {
                // Hide admin-only section titles for non-admin
                if (data.adminOnly && !canUserAccess(user, rolePerms, 'settings')) return null;
                return (
                  <li className={menuClass} key={index}>{data.title}</li>
                );
              }
              
              // Filter by module permission
              if (data.module && !canUserAccess(user, rolePerms, data.module)) {
                return null;
              }
              
              // Menu Item with Submenu
              if (data.content && data.content.length > 0) {
                return (
                  <li 
                    key={index}
                    className={`${state.active === data.title ? 'mm-active' : ''}`}
                  >
                    <Link 
                      to="#"
                      className="has-arrow"
                      onClick={(e) => { e.preventDefault(); handleMenuActive(data.title); }}
                    >
                      {data.iconStyle}
                      <span className="nav-text">{data.title}</span>
                    </Link>
                    <Collapse in={state.active === data.title}>
                      <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                        {data.content.map((item, idx) => {
                          // Sub-submenu
                          if (item.content && item.content.length > 0) {
                            return (
                              <li 
                                key={idx}
                                className={`${state.activeSubmenu === item.title ? "mm-active" : ""}`}
                              >
                                <Link 
                                  to={item.to || "#"} 
                                  className={`${item.hasMenu ? 'has-arrow' : ''} ${location.pathname === item.to ? 'mm-active' : ''}`}
                                  onClick={(e) => { 
                                    if (item.hasMenu) {
                                      e.preventDefault();
                                      handleSubmenuActive(item.title); 
                                    }
                                  }}
                                >
                                  {item.title}
                                </Link>
                                <Collapse in={state.activeSubmenu === item.title}>
                                  <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                    {item.content.map((ele, eleIdx) => (
                                      <Fragment key={eleIdx}>
                                        <li>
                                          <Link 
                                            className={`${location.pathname === ele.to ? "mm-active" : ""}`} 
                                            to={ele.to}
                                          >
                                            {ele.title}
                                          </Link>
                                        </li>
                                      </Fragment>
                                    ))}
                                  </ul>
                                </Collapse>
                              </li>
                            );
                          }
                          
                          // Regular submenu item
                          return (
                            <li key={idx}>
                              <Link 
                                to={item.to} 
                                className={`${location.pathname === item.to || location.pathname.startsWith(item.to) ? 'mm-active' : ''}`}
                              >
                                {item.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Collapse>
                  </li>
                );
              }
              
              // Simple Menu Item (no submenu)
              return (
                <li 
                  key={index}
                  className={`${location.pathname === data.to ? 'mm-active' : ''} ${data.isHighlight ? 'nav-highlight-item' : ''}`}
                >
                  <Link to={data.to} className={data.isHighlight ? 'nav-highlight-link' : ''}>
                    {data.iconStyle}
                    <span className="nav-text">{data.title}</span>
                    {data.isHighlight && <span className="nav-live-dot" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Switch to CRM Button */}
          <div className="sidebar-switch">
            <Link to="/dashboard" className="switch-btn">
              <i className="flaticon-rocket"></i>
              <span>Switch to CRM</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className={`header ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="header-content">
          <nav className="navbar navbar-expand">
            <div className="collapse navbar-collapse justify-content-between">
              <div className="header-left">
                {/* Search */}
                <div className="input-group search-area">
                  <span className="input-group-text">
                    <i className="flaticon-search-interface-symbol"></i>
                  </span>
                  <input type="text" className="form-control" placeholder="Search..." />
                </div>
              </div>
              
              <ul className="navbar-nav header-right">
                {/* Language Switcher */}
                <li className="nav-item dropdown notification_dropdown">
                  <div className="lang-switcher">
                    <button 
                      className="nav-link"
                      data-tooltip="Switch language"
                      data-tooltip-pos="bottom"
                      onClick={() => setShowLangMenu(!showLangMenu)}
                    >
                      <i className="flaticon-web"></i>
                      <span className="ms-1">{i18n.language.toUpperCase()}</span>
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
                </li>

                {/* Notification Bell */}
                <li className="nav-item dropdown notification_dropdown">
                  <button 
                    className="nav-link notif-bell-btn"
                    data-tooltip="Notifications"
                    data-tooltip-pos="bottom"
                    onClick={toggleNotifPopup}
                    style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  >
                    <Bell width={20} height={20} />
                    {unreadCount > 0 && (
                      <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>
                  {showNotifPopup && (
                    <div className="notif-popup-dropdown">
                      <div className="notif-popup-header">
                        <strong>Notifications</strong>
                        <Link to="/notifications" onClick={() => setShowNotifPopup(false)} style={{ fontSize: '0.78rem', color: '#f2421b', textDecoration: 'none' }}>View All</Link>
                      </div>
                      {recentNotifs.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#adb5bd', fontSize: '0.82rem' }}>
                          No new notifications
                        </div>
                      ) : (
                        recentNotifs.slice(0, 5).map(n => (
                          <div key={n.id} className="notif-popup-item">
                            <div className="notif-popup-dot" />
                            <div>
                              <p className="notif-popup-title">{n.title}</p>
                              <p className="notif-popup-time">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="notif-popup-footer">
                        <Link to="/notifications" onClick={() => setShowNotifPopup(false)}>
                          See all notifications →
                        </Link>
                      </div>
                    </div>
                  )}
                </li>

                {/* User Profile */}
                <li className="nav-item dropdown header-profile">
                  <button 
                    className="nav-link"
                    data-tooltip="Account menu"
                    data-tooltip-pos="bottom"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <div className="header-user">
                      <span className="avatar">{user?.full_name?.charAt(0) || 'U'}</span>
                      <div className="header-info ms-2">
                        <span className="fs-14 font-w600">{user?.full_name || user?.username}</span>
                      </div>
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div className="profile-dropdown">
                      <div className="profile-header">
                        <div className="avatar-lg">{user?.full_name?.charAt(0) || 'U'}</div>
                        <div className="ms-3">
                          <h4>{user?.full_name || user?.username}</h4>
                          <p>{user?.email}</p>
                        </div>
                      </div>
                      <div className="profile-menu">
                        <Link to="/profile" className="profile-item">
                          <i className="flaticon-user"></i>
                          <span>Profile</span>
                        </Link>
                        <Link to="/beauty-settings" className="profile-item">
                          <i className="flaticon-app"></i>
                          <span>Settings</span>
                        </Link>
                        <button onClick={handleLogout} className="profile-item logout" data-tooltip="Sign out">
                          <i className="flaticon-x-mark"></i>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className={`content-body ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="container-fluid">
          {children}
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
