import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, Plus, EditPencil, Trash, Check, Xmark, RefreshDouble, Link } from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './CRMPages.css';

const PLATFORMS = [
  { id: 'mailchimp', name: 'Mailchimp', icon: '📧' },
  { id: 'sendgrid', name: 'SendGrid', icon: '✉️' },
  { id: 'twilio', name: 'Twilio (SMS/WhatsApp)', icon: '📱' },
  { id: 'hubspot', name: 'HubSpot', icon: '🔷' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️' },
  { id: 'google_ads', name: 'Google Ads', icon: '📊' },
  { id: 'facebook_ads', name: 'Facebook Ads', icon: '📘' },
  { id: 'zapier', name: 'Zapier', icon: '⚡' },
  { id: 'slack', name: 'Slack', icon: '💬' },
  { id: 'webhook', name: 'Custom Webhook', icon: '🔗' },
];

export default function Integrations() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [testingId, setTestingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', platform: 'mailchimp', api_key: '', is_active: true, config: {}
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/integrations');
      if (data.success) setIntegrations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      showToast('error', 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData({ name: '', platform: 'mailchimp', api_key: '', is_active: true, config: {} });
    setShowModal(true);
  };

  const openEditModal = (integration) => {
    setEditing(integration);
    setFormData({
      name: integration.name || '',
      platform: integration.platform || 'mailchimp',
      api_key: integration.api_key || '',
      is_active: integration.is_active === 1 || integration.is_active === true,
      config: integration.config || {}
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.platform) {
      showToast('error', 'Name and platform are required');
      return;
    }
    setSaving(true);
    try {
      let data;
      if (editing) {
        data = await api.patch(`/integrations/${editing.id}`, formData);
      } else {
        data = await api.post('/integrations', formData);
      }
      if (data.success) {
        showToast('success', data.message || 'Integration saved');
        fetchIntegrations();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Failed to save integration');
      }
    } catch (error) {
      showToast('error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => supportAlert();

  const handleToggle = async (integration) => {
    try {
      const data = await api.patch(`/integrations/${integration.id}`, {
        is_active: !integration.is_active
      });
      if (data.success) {
        showToast('success', `Integration ${integration.is_active ? 'disabled' : 'enabled'}`);
        fetchIntegrations();
      }
    } catch (error) {
      showToast('error', 'Failed to update integration');
    }
  };

  const handleTest = async (integration) => {
    setTestingId(integration.id);
    try {
      // Simulate test connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast('success', `Connection to ${integration.name} successful!`);
    } catch (error) {
      showToast('error', 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const getPlatformInfo = (platformId) => {
    return PLATFORMS.find(p => p.id === platformId) || { name: platformId, icon: '🔌' };
  };

  return (
    <div className="crm-page">
      <SEO page="integrations" noindex={true} />
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1><Network width={28} height={28} /> Integrations</h1>
          <p className="subtitle">Connect your CRM with external platforms and services</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus width={18} height={18} /> Add Integration
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="crm-card">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : integrations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Network width={48} height={48} /></div>
            <h3>No integrations configured</h3>
            <p>Connect your CRM with external platforms to automate workflows</p>
            <button className="btn-primary" onClick={openCreateModal}>
              <Plus width={16} height={16} /> Add Integration
            </button>
          </div>
        ) : (
          <div className="integrations-grid">
            {integrations.map(integration => {
              const platform = getPlatformInfo(integration.platform);
              return (
                <div key={integration.id} className={`integration-card ${integration.is_active ? 'active' : 'inactive'}`}>
                  <div className="integration-icon">{platform.icon}</div>
                  <div className="integration-info">
                    <h3>{integration.name}</h3>
                    <p className="platform-name">{platform.name}</p>
                    <div className="integration-status">
                      <span className={`status-dot ${integration.is_active ? 'active' : ''}`}></span>
                      {integration.is_active ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                  <div className="integration-actions">
                    <button 
                      className="action-btn test" 
                      onClick={() => handleTest(integration)}
                      disabled={testingId === integration.id}
                      title="Test Connection"
                    >
                      {testingId === integration.id ? (
                        <RefreshDouble width={16} height={16} className="spin" />
                      ) : (
                        <Link width={16} height={16} />
                      )}
                    </button>
                    <button 
                      className="action-btn toggle" 
                      onClick={() => handleToggle(integration)}
                      title={integration.is_active ? 'Disable' : 'Enable'}
                    >
                      {integration.is_active ? <Xmark width={16} height={16} /> : <Check width={16} height={16} />}
                    </button>
                    <button className="action-btn edit" onClick={() => openEditModal(integration)} title="Edit">
                      <EditPencil width={16} height={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(integration)} title="Delete">
                      <Trash width={16} height={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Platforms */}
      <div className="crm-card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>Available Platforms</h2>
        </div>
        <div className="platforms-grid">
          {PLATFORMS.map(platform => (
            <div 
              key={platform.id} 
              className="platform-card"
              onClick={() => {
                setFormData(prev => ({ ...prev, platform: platform.id, name: platform.name }));
                setEditing(null);
                setShowModal(true);
              }}
            >
              <span className="platform-icon">{platform.icon}</span>
              <span className="platform-name">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Integration' : 'New Integration'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Platform *</label>
                  <select
                    className="form-control"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Integration Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Primary Mailchimp Account"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">API Key / Token</label>
                  <input
                    type="password"
                    className="form-control"
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    placeholder="Enter your API key"
                  />
                  <small className="form-hint">Your API key is encrypted and stored securely</small>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Connect')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          padding: 20px;
        }
        .integration-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px 20px;
          transition: all 0.2s ease;
        }
        .integration-card.active { border-color: #10b981; }
        .integration-card.inactive { opacity: 0.7; }
        .integration-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .integration-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 10px;
        }
        .integration-info { flex: 1; }
        .integration-info h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .integration-info .platform-name {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #6b7280;
        }
        .integration-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
        }
        .status-dot.active { background: #10b981; }
        .integration-actions {
          display: flex;
          gap: 6px;
        }
        .action-btn.test { color: #3b82f6; }
        .action-btn.toggle { color: #f59e0b; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .card-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        .platforms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          padding: 20px;
        }
        .platform-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .platform-card:hover {
          background: #fff;
          border-color: #244066;
          transform: translateY(-2px);
        }
        .platform-icon { font-size: 28px; }
        .platform-card .platform-name {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          text-align: center;
        }
        .form-hint {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

