import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toast, ToastContainer } from 'react-bootstrap';
import api from '../lib/api';
import SEO from '../components/SEO';

// Sub-components
import BusinessSetup from './settings/BusinessSetup';
import BranchesManager from './settings/BranchesManager';
import CategoriesManager from './settings/CategoriesManager';
import ServiceMenu from './settings/ServiceMenu';
import WorkingHours from './settings/WorkingHours';
import NotificationSettings from './settings/NotificationSettings';
import BookingRules from './settings/BookingRules';
import ResourcesManager from './settings/ResourcesManager';
import './settings/Settings.css';

// Route → Tab mapping
const getTabFromPath = (pathname) => {
  if (pathname.includes('/business')) return 'business';
  if (pathname.includes('/branches')) return 'branches';
  if (pathname.includes('/categories')) return 'categories';
  if (pathname.includes('/services')) return 'services';
  if (pathname.includes('/hours')) return 'hours';
  if (pathname.includes('/notifications')) return 'notifications';
  if (pathname.includes('/booking')) return 'booking';
  if (pathname.includes('/resources')) return 'resources';
  if (pathname.includes('/team')) return 'team';
  if (pathname.includes('/sales')) return 'sales';
  return 'business'; // default to business info
};

const TAB_TITLES = {
  business: 'Business Info',
  branches: 'Locations',
  categories: 'Service Categories',
  services: 'Service Menu',
  hours: 'Working Hours',
  notifications: 'Notifications',
  booking: 'Online Booking',
  resources: 'Resources',
  team: 'Team',
  sales: 'Sales',
};

export default function BeautySettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Toast
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const showToast = (type, message) => setToast({ show: true, type, message });

  // Shared Data
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Business Info — loaded from API
  const [businessInfo, setBusinessInfo] = useState({
    name: '', email: '', phone: '', address: '',
    description: '', currency: 'AED', timezone: 'Asia/Dubai', country: 'UAE',
    latitude: 25.2048, longitude: 55.2708, tax_type: 'include',
    facebook: '', instagram: '', twitter: '', website: '', logo: '',
  });

  const handleBusinessChange = (field, value) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  // Fetch tenant info (business details + logo)
  const fetchBusinessInfo = useCallback(async () => {
    try {
      const data = await api.get('/tenants/current');
      if (data.success && data.data) {
        const t = data.data;
        let settings = {};
        if (t.settings) {
          try { settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings; } catch (e) { /* ignore */ }
        }
        setBusinessInfo(prev => ({
          ...prev,
          ...settings,
          name: t.name || prev.name,
          email: t.email || prev.email,
          phone: t.phone || prev.phone,
          address: t.address || prev.address,
          city: t.city || prev.city,
          country: t.country || prev.country,
          timezone: t.timezone || prev.timezone,
          currency: t.currency || prev.currency,
          logo: t.logo_url || settings.logo || prev.logo || '',
        }));
      }
    } catch (e) { console.error('Fetch business info error:', e); }
  }, []);

  // Fetch functions
  const fetchBranches = useCallback(async () => {
    setBranchLoading(true);
    try {
      const data = await api.get('/branches');
      if (data.success) setBranches(data.data || []);
    } catch (e) { console.error('Branches fetch error:', e); }
    setBranchLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const data = await api.get('/service-categories');
      if (data.success) setCategories(data.data || []);
    } catch (e) { console.error('Categories fetch error:', e); }
    setCatLoading(false);
  }, []);

  const fetchServices = useCallback(async () => {
    setServiceLoading(true);
    try {
      const data = await api.get('/products');
      if (data.success) setServices(data.data || []);
    } catch (e) { console.error('Services fetch error:', e); }
    setServiceLoading(false);
  }, []);

  useEffect(() => {
    fetchBusinessInfo();
    fetchBranches();
    fetchCategories();
    fetchServices();
  }, [fetchBusinessInfo, fetchBranches, fetchCategories, fetchServices]);

  // Sync tab with URL
  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    setActiveTab(tab);
    // Redirect bare /beauty-settings to /beauty-settings/business
    if (location.pathname === '/beauty-settings' || location.pathname === '/beauty-settings/') {
      navigate('/beauty-settings/business', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateTo = (tab) => {
    navigate(`/beauty-settings/${tab}`, { replace: true });
  };

  return (
    <>
      <SEO title={`Settings — ${TAB_TITLES[activeTab] || 'Settings'}`} description="Manage your beauty center settings" />

      <div className="stn">
        {/* Page header */}
        {/* <div className="stn-header">
          <h1>{TAB_TITLES[activeTab] || 'Settings'}</h1>
        </div> */}

        {/* Content */}
        <div className="stn-body">
          {activeTab === 'business' && (
            <BusinessSetup
              businessInfo={businessInfo}
              onBusinessChange={handleBusinessChange}
              onSave={() => showToast('success', 'Saved')}
              branches={branches}
              onNavigate={navigateTo}
              showToast={showToast}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesManager
              branches={branches}
              branchLoading={branchLoading}
              fetchBranches={fetchBranches}
              api={api}
              showToast={showToast}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesManager
              categories={categories}
              catLoading={catLoading}
              fetchCategories={fetchCategories}
              api={api}
              showToast={showToast}
              onNavigate={navigateTo}
            />
          )}

          {activeTab === 'services' && (
            <ServiceMenu
              services={services}
              serviceLoading={serviceLoading}
              fetchServices={fetchServices}
              categories={categories}
              branches={branches}
              api={api}
              showToast={showToast}
            />
          )}

          {activeTab === 'hours' && (
            <WorkingHours branches={branches} fetchBranches={fetchBranches} api={api} showToast={showToast} />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings api={api} showToast={showToast} />
          )}

          {activeTab === 'booking' && (
            <BookingRules api={api} showToast={showToast} />
          )}

          {activeTab === 'resources' && (
            <ResourcesManager branches={branches} api={api} showToast={showToast} />
          )}

          {activeTab === 'team' && (
            <div className="stn-empty">
              <div className="stn-empty-icon">👥</div>
              <h3>Team Management</h3>
              <p>Staff roles, permissions and time-off management coming soon.</p>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="stn-empty">
              <div className="stn-empty-icon">💳</div>
              <h3>Sales Settings</h3>
              <p>Payment methods, taxes, receipts and gift card settings coming soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast show={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} delay={3000} autohide bg={toast.type === 'success' ? 'success' : 'danger'}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}
