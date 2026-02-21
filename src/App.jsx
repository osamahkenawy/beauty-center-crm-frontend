import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Contacts from './pages/Contacts';
import Accounts from './pages/Accounts';
import Activities from './pages/Activities';
import Pipelines from './pages/Pipelines';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Tags from './pages/Tags';
import Reports from './pages/Reports';
import Products from './pages/Products';
import Quotes from './pages/Quotes';
import Branches from './pages/Branches';
import Campaigns from './pages/Campaigns';
import Audiences from './pages/Audiences';
import EmailTemplates from './pages/EmailTemplates';
import Integrations from './pages/Integrations';
import Inbox from './pages/Inbox';
import Workflows from './pages/Workflows';
import CustomFields from './pages/CustomFields';
import Documents from './pages/Documents';
import AuditLogs from './pages/AuditLogs';
import TrasealaAI from './pages/TrasealaAI';
import BeautyDashboard from './pages/BeautyDashboard';
import Appointments from './pages/Appointments';
import BeautyServices from './pages/BeautyServices';
import StaffSchedule from './pages/StaffSchedule';
import TeamManager from './pages/TeamManager';
import LoyaltyProgram from './pages/LoyaltyProgram';
import BeautyClients from './pages/BeautyClients';
import BeautyPayments from './pages/BeautyPayments';
import BeautyReports from './pages/BeautyReports';
import BeautySettings from './pages/BeautySettings';
import GiftCards from './pages/GiftCards';
import Waitlists from './pages/Waitlists';
import PackagesPage from './pages/Packages';
import MembershipsPage from './pages/Memberships';
import PromotionsPage from './pages/Promotions';
import ReviewsPage from './pages/Reviews';
import POSPage from './pages/POS';
import InventoryPage from './pages/Inventory';
import ConsultationFormsPage from './pages/ConsultationForms';
import GroupBookingsPage from './pages/GroupBookings';
import PatchTestsPage from './pages/PatchTests';
import NotificationCenterPage from './pages/NotificationCenter';
import MarketingHubPage from './pages/MarketingHub';
import QrToolsPage from './pages/QrTools';
import OnlineBooking from './pages/OnlineBooking';
import OnlineStore from './pages/OnlineStore';
import AppConnect from './pages/AppConnect';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SetPasswordPage from './pages/SetPasswordPage';

// Super Admin Pages
import SuperAdminLogin from './pages/SuperAdmin/SuperAdminLogin';
import SuperAdminLayout from './pages/SuperAdmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import SuperAdminTenants from './pages/SuperAdmin/SuperAdminTenants';

// Components
import Layout from './components/Layout';
import BeautyLayout from './components/BeautyLayout';
import BusinessTypeSelector from './components/BusinessTypeSelector';

// Security Hook
import useSecurityProtection from './hooks/useSecurityProtection';

// Auth Context
export const AuthContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);

  // Initialize security protections (only for logged-in users)
  useSecurityProtection({
    disableRightClickMenu: !!user,        // Disable right-click when logged in
    disableKeyboardShortcuts: !!user,      // Disable DevTools shortcuts when logged in
    detectDevToolsOpen: !!user,            // Detect DevTools when logged in
    disableSelection: false,               // Set to true to disable text selection
    disableCopyPasteOperations: false,     // Set to true to disable copy/paste
    showWatermark: false,                  // Set to true to show watermark
    watermarkText: 'CONFIDENTIAL',
    onDevToolsOpen: (isOpen) => {
      if (isOpen && user) {
        console.warn('⚠️ Security Alert: Developer tools opened');
        // You can add logging to backend here if needed
      }
    }
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      if (token) {
        // Token exists, verify with server
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_URL}/auth/session`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          setUser(data.data);
          setTenant(data.data.tenant);
          localStorage.setItem('crm_user', JSON.stringify(data.data));
          if (data.data.tenant) {
            localStorage.setItem('crm_tenant', JSON.stringify(data.data.tenant));
          }
        } else {
          // Token invalid, clear it
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          localStorage.removeItem('crm_tenant');
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    
    if (data.success) {
      // Handle both old format (data.data) and new format (data.token + data.user)
      const token = data.token || data.data?.token;
      const userData = data.user || data.data;
      
      if (token && userData) {
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        
        if (userData.tenant) {
          localStorage.setItem('crm_tenant', JSON.stringify(userData.tenant));
          setTenant(userData.tenant);
        }
        
        setUser(userData);
        
        // Check if user needs business type selection
        const savedType = localStorage.getItem('crm_business_type');
        if (!savedType && userData.role !== 'super_admin') {
          // First login — show business type selector
          setShowBusinessSelector(true);
        }
        
        return { success: true, businessType: savedType, role: userData.role };
      }
    }
    return { success: false, message: data.message };
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch (e) {
      // Ignore errors
    }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant');
    setUser(null);
    setTenant(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', gap: '20px' }}>
        <div className="loader-dots">
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#244066', animation: 'pulse 1.4s ease-in-out infinite' }}></div>
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#244066', animation: 'pulse 1.4s ease-in-out infinite 0.2s' }}></div>
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#244066', animation: 'pulse 1.4s ease-in-out infinite 0.4s' }}></div>
        </div>
        <style>{`
          .loader-dots { display: flex; gap: 8px; }
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1.2); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout, checkSession, setUser, setTenant }}>
      {/* Business Type Selector — shown after first login */}
      <BusinessTypeSelector
        show={showBusinessSelector}
        onSelect={(typeId) => setShowBusinessSelector(false)}
        onClose={() => setShowBusinessSelector(false)}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/book/:slug" element={<OnlineBooking />} />
        <Route path="/store/:slug" element={<OnlineStore />} />
        <Route path="/login" element={
          user 
            ? (showBusinessSelector 
                ? <LoginPage /> 
                : <Navigate to={localStorage.getItem('crm_business_type') === 'beauty' ? '/beauty-dashboard' : '/dashboard'} />
              ) 
            : <LoginPage />
        } />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        
        {/* Protected routes - Core CRM */}
        <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/leads" element={user ? <Layout><Leads /></Layout> : <Navigate to="/login" />} />
        <Route path="/deals" element={user ? <Layout><Deals /></Layout> : <Navigate to="/login" />} />
        <Route path="/contacts" element={user ? <Layout><Contacts /></Layout> : <Navigate to="/login" />} />
        <Route path="/accounts" element={user ? <Layout><Accounts /></Layout> : <Navigate to="/login" />} />
        <Route path="/activities" element={user ? <Layout><Activities /></Layout> : <Navigate to="/login" />} />
        <Route path="/pipelines" element={user ? <Layout><Pipelines /></Layout> : <Navigate to="/login" />} />
        <Route path="/calendar" element={user ? <Layout><Calendar /></Layout> : <Navigate to="/login" />} />
        
        {/* Protected routes - Notes & Tags */}
        <Route path="/notes" element={user ? <Layout><Notes /></Layout> : <Navigate to="/login" />} />
        <Route path="/tags" element={user ? <Layout><Tags /></Layout> : <Navigate to="/login" />} />
        
        {/* Protected routes - Products & Quotes */}
        <Route path="/products" element={user ? <Layout><Products /></Layout> : <Navigate to="/login" />} />
        <Route path="/quotes" element={user ? <Layout><Quotes /></Layout> : <Navigate to="/login" />} />
        
        {/* Protected routes - Marketing & Communication */}
        <Route path="/campaigns" element={user ? <Layout><Campaigns /></Layout> : <Navigate to="/login" />} />
        <Route path="/audiences" element={user ? <Layout><Audiences /></Layout> : <Navigate to="/login" />} />
        <Route path="/email-templates" element={user ? <Layout><EmailTemplates /></Layout> : <Navigate to="/login" />} />
        <Route path="/integrations" element={user ? <Layout><Integrations /></Layout> : <Navigate to="/login" />} />
        <Route path="/inbox" element={user ? <Layout><Inbox /></Layout> : <Navigate to="/login" />} />
        
        {/* Protected routes - Documents & Reports */}
        <Route path="/documents" element={user ? <Layout><Documents /></Layout> : <Navigate to="/login" />} />
        <Route path="/reports" element={user ? <Layout><Reports /></Layout> : <Navigate to="/login" />} />
        
        {/* Protected routes - Settings & Admin */}
        <Route path="/branches" element={user ? <Layout><Branches /></Layout> : <Navigate to="/login" />} />
        <Route path="/workflows" element={user ? <Layout><Workflows /></Layout> : <Navigate to="/login" />} />
        <Route path="/custom-fields" element={user ? <Layout><CustomFields /></Layout> : <Navigate to="/login" />} />
        <Route path="/audit-logs" element={user ? <Layout><AuditLogs /></Layout> : <Navigate to="/login" />} />
        
        {/* AI Assistant - Full Page */}
        <Route path="/mwasalat-ai" element={user ? <TrasealaAI /> : <Navigate to="/login" />} />
        
        {/* Beauty Center Routes - Use BeautyLayout */}
        <Route path="/beauty-dashboard" element={user ? <BeautyLayout><BeautyDashboard /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/appointments" element={user ? <BeautyLayout><Appointments /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/appointments/*" element={user ? <BeautyLayout><Appointments /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-services" element={user ? <Navigate to="/beauty-settings/services" /> : <Navigate to="/login" />} />
        <Route path="/beauty-services/*" element={user ? <Navigate to="/beauty-settings/services" /> : <Navigate to="/login" />} />
        <Route path="/staff-schedule" element={user ? <BeautyLayout><StaffSchedule /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/staff-schedule/*" element={user ? <BeautyLayout><StaffSchedule /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/team" element={user ? <BeautyLayout><TeamManager /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/team/*" element={user ? <BeautyLayout><TeamManager /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/loyalty" element={user ? <BeautyLayout><LoyaltyProgram /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-clients" element={user ? <BeautyLayout><BeautyClients /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-clients/*" element={user ? <BeautyLayout><BeautyClients /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-payments" element={user ? <BeautyLayout><BeautyPayments /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-payments/*" element={user ? <BeautyLayout><BeautyPayments /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-invoices" element={user ? <BeautyLayout><BeautyPayments /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-reports" element={user ? <BeautyLayout><BeautyReports /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-reports/*" element={user ? <BeautyLayout><BeautyReports /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-settings" element={user ? <BeautyLayout><BeautySettings /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/beauty-settings/*" element={user ? <BeautyLayout><BeautySettings /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/gift-cards" element={user ? <BeautyLayout><GiftCards /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/waitlists" element={user ? <BeautyLayout><Waitlists /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/packages" element={user ? <BeautyLayout><PackagesPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/memberships" element={user ? <BeautyLayout><MembershipsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/promotions" element={user ? <BeautyLayout><PromotionsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/reviews" element={user ? <BeautyLayout><ReviewsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/pos" element={user ? <BeautyLayout><POSPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/consultation-forms" element={user ? <BeautyLayout><ConsultationFormsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/group-bookings" element={user ? <BeautyLayout><GroupBookingsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/patch-tests" element={user ? <BeautyLayout><PatchTestsPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/inventory" element={user ? <BeautyLayout><InventoryPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/notifications" element={user ? <BeautyLayout><NotificationCenterPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/marketing" element={user ? <BeautyLayout><MarketingHubPage /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/app-connect" element={user ? <BeautyLayout><AppConnect /></BeautyLayout> : <Navigate to="/login" />} />
        <Route path="/tools/qr-codes" element={user ? <BeautyLayout><QrToolsPage /></BeautyLayout> : <Navigate to="/login" />} />
        
        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<SuperAdminTenants />} />
          <Route path="tenants/:id" element={<SuperAdminTenants />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
