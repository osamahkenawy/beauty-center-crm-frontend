import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package, Building, CheckCircle, Xmark, Search, 
  User, Mail, Phone, Suitcase, Calendar, EditPencil, Settings
} from 'iconoir-react';
import './SuperAdmin.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const SuperAdminModules = () => {
  const { t } = useTranslation();
  const [modules, setModules] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      
      // Fetch modules
      const modulesRes = await fetch(`${API_BASE_URL}/super-admin/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (modulesRes.ok) {
        const data = await modulesRes.json();
        setModules(data);
      }

      // Fetch tenants
      const tenantsRes = await fetch(`${API_BASE_URL}/super-admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModuleConfig = (tenant) => {
    setSelectedTenant(tenant);
    const currentModules = tenant.allowed_modules
      ? (typeof tenant.allowed_modules === 'string' 
          ? JSON.parse(tenant.allowed_modules) 
          : tenant.allowed_modules)
      : modules.map(m => m.id);
    setSelectedModules(currentModules);
    setShowModal(true);
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const saveModules = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('superAdminToken');
      await fetch(`${API_BASE_URL}/super-admin/tenants/${selectedTenant.id}/modules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modules: selectedModules }),
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save modules:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectAll = () => setSelectedModules(modules.map(m => m.id));
  const deselectAll = () => setSelectedModules([]);

  const groupedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {});

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'CRM': return <User size={20} />;
      case 'Sales': return <Suitcase size={20} />;
      case 'Marketing': return <Mail size={20} />;
      case 'Communication': return <Phone size={20} />;
      case 'Settings': return <Settings size={20} />;
      case 'Analytics': return <Calendar size={20} />;
      default: return <Package size={20} />;
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Module Management</h1>
          <p>Configure which modules each tenant can access</p>
        </div>
      </div>

      {/* Available Modules */}
      <div className="sa-card">
        <div className="sa-card-header">
          <h2>Available Modules ({modules.length})</h2>
        </div>
        <div className="sa-modules-overview">
          {Object.entries(groupedModules).map(([category, categoryModules]) => (
            <div key={category} className="sa-module-category">
              <div className="sa-category-header">
                {getCategoryIcon(category)}
                <h3>{category}</h3>
                <span className="sa-category-count">{categoryModules.length}</span>
              </div>
              <div className="sa-category-modules">
                {categoryModules.map(module => (
                  <div key={module.id} className="sa-module-item">
                    <CheckCircle size={16} className="success" />
                    <span>{module.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Module Configuration */}
      <div className="sa-card">
        <div className="sa-card-header">
          <h2>Tenant Module Access</h2>
        </div>
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Industry</th>
                <th>Enabled Modules</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="sa-loading-row">
                    <div className="loading-spinner"></div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="sa-empty-row">No tenants found</td>
                </tr>
              ) : (
                tenants.map(tenant => {
                  const enabledModules = tenant.allowed_modules
                    ? (typeof tenant.allowed_modules === 'string'
                        ? JSON.parse(tenant.allowed_modules)
                        : tenant.allowed_modules)
                    : modules.map(m => m.id);
                  
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div className="sa-tenant-name">
                          <div className="sa-tenant-avatar">
                            {tenant.name?.charAt(0)}
                          </div>
                          <span>{tenant.name}</span>
                        </div>
                      </td>
                      <td>{tenant.industry || '-'}</td>
                      <td>
                        <div className="sa-module-count">
                          <Package size={16} />
                          <span>{enabledModules.length} / {modules.length}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`sa-status-badge ${tenant.status === 'active' ? 'success' : 'warning'}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="sa-action-btn"
                          onClick={() => openModuleConfig(tenant)}
                          title="Configure Modules"
                        >
                          <EditPencil size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Configuration Modal */}
      {showModal && selectedTenant && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Configure Modules for {selectedTenant.name}</h3>
              <button className="sa-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-module-actions">
                <button className="sa-btn secondary" onClick={selectAll}>Select All</button>
                <button className="sa-btn secondary" onClick={deselectAll}>Deselect All</button>
                <span className="sa-selected-count">
                  {selectedModules.length} of {modules.length} selected
                </span>
              </div>
              
              {Object.entries(groupedModules).map(([category, categoryModules]) => (
                <div key={category} className="sa-config-category">
                  <h4>{category}</h4>
                  <div className="sa-config-modules">
                    {categoryModules.map(module => (
                      <label key={module.id} className="sa-module-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedModules.includes(module.id)}
                          onChange={() => toggleModule(module.id)}
                        />
                        <div className="sa-module-info">
                          <span className="sa-module-name">{module.name}</span>
                          <span className="sa-module-name-ar">{module.nameAr}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="sa-btn primary" onClick={saveModules} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminModules;


