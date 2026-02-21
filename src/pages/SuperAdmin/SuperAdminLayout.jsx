import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Building, User, Settings, ShieldCheck, Package, Bell,
  Search, LogOut, Activity, StatsReport, NavArrowRight
} from 'iconoir-react';
import SEO from '../../components/SEO';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/super-admin/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/super-admin/activity',  icon: Activity, label: 'Live Activity' },
      { path: '/super-admin/analytics', icon: StatsReport,  label: 'Analytics'   },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/super-admin/tenants', icon: Building, label: 'Tenants' },
      { path: '/super-admin/users',   icon: User,     label: 'All Users' },
      { path: '/super-admin/modules', icon: Package,  label: 'Modules' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/super-admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const SuperAdminLayout = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) { navigate('/super-admin/login'); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/super-admin/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
    } catch {
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
      navigate('/super-admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    navigate('/super-admin/login');
  };

  const isActive = (path) =>
    path === '/super-admin/tenants'
      ? location.pathname.startsWith('/super-admin/tenant')
      : location.pathname === path;

  if (loading) {
    return (
      <div className="super-admin-loading">
        <div className="loading-spinner large" />
        <p>Loading platform...</p>
      </div>
    );
  }

  return (
    <div className="super-admin-layout">
      <SEO
        title="Super Admin - Trasealla Platform"
        description="Trasealla super admin control panel"
        noindex={true}
      />

      <aside className="sa-sidebar">
        <div className="sa-sidebar-header">
          <div className="sa-logo">
            <img src="/assets/images/logos/TRASEALLA_LOGO.svg" alt="Trasealla" />
            <span className="sa-logo-text">Trasealla</span>
          </div>
          <div className="sa-badge">
            <ShieldCheck size={12} />
            Platform Admin
          </div>
        </div>

        <nav className="sa-nav">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="sa-nav-section">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sa-nav-item${isActive(item.path) ? ' active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-sidebar-user">
            <div className="sa-user-avatar-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="sa-user-name">{user?.full_name || 'Admin'}</div>
              <div className="sa-user-role">Super Admin</div>
            </div>
          </div>
          <button
            className="sa-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="sa-main">
        <header className="sa-topbar">
          <Link to="/beauty-dashboard" className="sa-secondary-btn" style={{ padding: '7px 14px', fontSize: 13 }}>
            <NavArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
            Back to CRM
          </Link>
          <div className="sa-topbar-right">
            <div className="sa-topbar-search">
              <Search size={16} />
              <input placeholder="Search tenants..." />
            </div>
            <button className="sa-topbar-btn">
              <Bell size={18} />
              <span className="sa-topbar-dot" />
            </button>
            <div className="sa-topbar-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <main className="sa-content">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
