import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, LogOut, Home, Building, User, Settings, ShieldCheck,
  Globe, Package, Bell, Search, NavArrowLeft, Suitcase
} from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
import './SuperAdmin.css';

const SuperAdminLayout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate('/super-admin/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Session invalid');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
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

  const navItems = [
    { path: '/super-admin/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/super-admin/tenants', icon: Building, label: 'Tenants' },
    { path: '/super-admin/users', icon: User, label: 'Platform Users' },
    { path: '/super-admin/modules', icon: Package, label: 'Modules' },
    { path: '/super-admin/analytics', icon: Suitcase, label: 'Analytics' },
    { path: '/super-admin/settings', icon: Settings, label: 'Settings' },
  ];

  if (loading) {
    return (
      <div className="super-admin-loading">
        <div className="loading-spinner large"></div>
        <p>Loading platform...</p>
      </div>
    );
  }

  return (
    <div className={`super-admin-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className={`sa-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sa-sidebar-header">
          <div className="sa-logo">
            <img src="/assets/images/logos/TRASEALLA_LOGO.svg" alt="Trasealla" />
          </div>
          <div className="sa-badge">
            <ShieldCheck size={14} />
            <span>Super Admin</span>
          </div>
        </div>

        <nav className="sa-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sa-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <button className="sa-logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="sa-main">
        {/* Topbar */}
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <button className="sa-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={24} />
            </button>
            <Link to="/dashboard" className="sa-back-to-crm">
              <NavArrowLeft size={18} />
              <span>Back to CRM</span>
            </Link>
          </div>

          <div className="sa-topbar-right">
            <div className="sa-search">
              <Search size={18} />
              <input type="text" placeholder="Search tenants, users..." />
            </div>

            <button className="sa-topbar-btn">
              <Bell size={20} />
            </button>

            <button className="sa-topbar-btn">
              <Globe size={20} />
            </button>

            <div className="sa-user-info">
              <div className="sa-user-avatar">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="sa-user-details">
                <span className="sa-user-name">{user?.full_name}</span>
                <span className="sa-user-role">{user?.role?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="sa-content">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

