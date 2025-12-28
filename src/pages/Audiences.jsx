import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Plus, EditPencil, Trash, Eye, RefreshDouble, UserPlus } from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

export default function Audiences() {
  const { t } = useTranslation();
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', description: '', type: 'static'
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchAudiences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/audiences');
      if (data.success) setAudiences(data.data || []);
    } catch (error) {
      console.error('Failed to fetch audiences:', error);
      showToast('error', 'Failed to fetch audiences');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAudiences();
  }, [fetchAudiences]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData({ name: '', description: '', type: 'static' });
    setShowModal(true);
  };

  const openEditModal = (audience) => {
    setEditing(audience);
    setFormData({
      name: audience.name || '',
      description: audience.description || '',
      type: audience.type || 'static'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      let data;
      if (editing) {
        data = await api.patch(`/audiences/${editing.id}`, formData);
      } else {
        data = await api.post('/audiences', formData);
      }
      if (data.success) {
        showToast('success', data.message || 'Audience saved');
        fetchAudiences();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Failed to save audience');
      }
    } catch (error) {
      showToast('error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (audience) => {
    if (!confirm(`Delete audience "${audience.name}"?`)) return;
    try {
      const data = await api.delete(`/audiences/${audience.id}`);
      if (data.success) {
        showToast('success', 'Audience deleted');
        fetchAudiences();
      }
    } catch (error) {
      showToast('error', 'Failed to delete audience');
    }
  };

  const handleSync = async (audience) => {
    try {
      const data = await api.post(`/audiences/${audience.id}/sync`);
      if (data.success) {
        showToast('success', data.message);
        fetchAudiences();
      }
    } catch (error) {
      showToast('error', 'Failed to sync audience');
    }
  };

  return (
    <div className="crm-page">
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1><Group width={28} height={28} /> Audiences</h1>
          <p className="subtitle">Manage your marketing audiences and segments</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus width={18} height={18} /> New Audience
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="crm-card">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : audiences.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Group width={48} height={48} /></div>
            <h3>No audiences found</h3>
            <p>Create your first audience to start targeting your marketing</p>
            <button className="btn-primary" onClick={openCreateModal}>
              <Plus width={16} height={16} /> New Audience
            </button>
          </div>
        ) : (
          <div className="audiences-grid">
            {audiences.map(audience => (
              <div key={audience.id} className="audience-card">
                <div className="audience-header">
                  <h3>{audience.name}</h3>
                  <span className={`badge badge-${audience.type}`}>{audience.type}</span>
                </div>
                <p className="audience-desc">{audience.description || 'No description'}</p>
                <div className="audience-stats">
                  <div className="stat">
                    <span className="stat-value">{audience.member_count || 0}</span>
                    <span className="stat-label">Members</span>
                  </div>
                  {audience.last_synced_at && (
                    <div className="stat">
                      <span className="stat-label">Last Synced</span>
                      <span className="stat-value">{new Date(audience.last_synced_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="audience-actions">
                  {audience.type === 'dynamic' && (
                    <button className="action-btn" onClick={() => handleSync(audience)} title="Sync">
                      <RefreshDouble width={16} height={16} />
                    </button>
                  )}
                  <button className="action-btn edit" onClick={() => openEditModal(audience)} title="Edit">
                    <EditPencil width={16} height={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(audience)} title="Delete">
                    <Trash width={16} height={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Audience' : 'New Audience'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Newsletter Subscribers"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-control"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="static">Static (Manual)</option>
                    <option value="dynamic">Dynamic (Auto-sync)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe this audience..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .audiences-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .audience-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .audience-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .audience-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .audience-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .audience-desc {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 15px;
          line-height: 1.5;
        }
        .audience-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .audience-stats .stat {
          text-align: center;
        }
        .audience-stats .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #244066;
        }
        .audience-stats .stat-label {
          font-size: 12px;
          color: #6b7280;
        }
        .audience-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .badge-static { background: #dbeafe; color: #1e40af; }
        .badge-dynamic { background: #d1fae5; color: #065f46; }
      `}</style>
    </div>
  );
}


