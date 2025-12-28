import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SendMail, Plus, EditPencil, Trash, Copy, Eye, Check, Xmark } from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

const CATEGORIES = [
  { id: 'welcome', name: 'Welcome', icon: '👋' },
  { id: 'follow_up', name: 'Follow Up', icon: '📧' },
  { id: 'newsletter', name: 'Newsletter', icon: '📰' },
  { id: 'promotion', name: 'Promotion', icon: '🎉' },
  { id: 'notification', name: 'Notification', icon: '🔔' },
  { id: 'transactional', name: 'Transactional', icon: '💼' },
  { id: 'other', name: 'Other', icon: '📋' },
];

const PLACEHOLDERS = [
  { key: '{{first_name}}', desc: 'Contact first name' },
  { key: '{{last_name}}', desc: 'Contact last name' },
  { key: '{{full_name}}', desc: 'Contact full name' },
  { key: '{{email}}', desc: 'Contact email' },
  { key: '{{company}}', desc: 'Company name' },
  { key: '{{deal_name}}', desc: 'Deal name' },
  { key: '{{deal_value}}', desc: 'Deal value' },
  { key: '{{current_date}}', desc: 'Current date' },
  { key: '{{sender_name}}', desc: 'Your name' },
];

export default function EmailTemplates() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', subject: '', body: '', category: 'other', is_active: true
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.append('category', filter);
      const data = await api.get(`/email-templates?${params}`);
      if (data.success) setTemplates(data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      showToast('error', 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const insertPlaceholder = (placeholder) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + placeholder
    }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData({ name: '', subject: '', body: '', category: 'other', is_active: true });
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditing(template);
    setFormData({
      name: template.name || '',
      subject: template.subject || '',
      body: template.body || '',
      category: template.category || 'other',
      is_active: template.is_active === 1 || template.is_active === true
    });
    setShowModal(true);
  };

  const openPreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      showToast('error', 'Name, subject, and body are required');
      return;
    }
    setSaving(true);
    try {
      let data;
      if (editing) {
        data = await api.patch(`/email-templates/${editing.id}`, formData);
      } else {
        data = await api.post('/email-templates', formData);
      }
      if (data.success) {
        showToast('success', data.message || 'Template saved');
        fetchTemplates();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Failed to save template');
      }
    } catch (error) {
      showToast('error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      const data = await api.delete(`/email-templates/${template.id}`);
      if (data.success) {
        showToast('success', 'Template deleted');
        fetchTemplates();
      }
    } catch (error) {
      showToast('error', 'Failed to delete template');
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const data = await api.post('/email-templates', {
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        category: template.category,
        is_active: false
      });
      if (data.success) {
        showToast('success', 'Template duplicated');
        fetchTemplates();
      }
    } catch (error) {
      showToast('error', 'Failed to duplicate template');
    }
  };

  const handleToggle = async (template) => {
    try {
      const data = await api.patch(`/email-templates/${template.id}`, {
        is_active: !template.is_active
      });
      if (data.success) {
        showToast('success', `Template ${template.is_active ? 'deactivated' : 'activated'}`);
        fetchTemplates();
      }
    } catch (error) {
      showToast('error', 'Failed to update template');
    }
  };

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || { name: categoryId, icon: '📋' };
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
          <h1><SendMail width={28} height={28} /> Email Templates</h1>
          <p className="subtitle">Create and manage reusable email templates</p>
        </div>
        <div className="header-actions">
          <select 
            className="form-control" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 150 }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus width={18} height={18} /> New Template
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="crm-card">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><SendMail width={48} height={48} /></div>
            <h3>No templates found</h3>
            <p>Create your first email template to speed up your communications</p>
            <button className="btn-primary" onClick={openCreateModal}>
              <Plus width={16} height={16} /> New Template
            </button>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map(template => {
              const category = getCategoryInfo(template.category);
              return (
                <div key={template.id} className={`template-card ${template.is_active ? 'active' : 'inactive'}`}>
                  <div className="template-header">
                    <span className="template-category">{category.icon} {category.name}</span>
                    <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="template-name">{template.name}</h3>
                  <p className="template-subject">{template.subject}</p>
                  <div className="template-preview">
                    {template.body?.substring(0, 100)}...
                  </div>
                  <div className="template-actions">
                    <button className="action-btn view" onClick={() => openPreview(template)} title="Preview">
                      <Eye width={16} height={16} />
                    </button>
                    <button className="action-btn" onClick={() => handleDuplicate(template)} title="Duplicate">
                      <Copy width={16} height={16} />
                    </button>
                    <button className="action-btn toggle" onClick={() => handleToggle(template)} title="Toggle">
                      {template.is_active ? <Xmark width={16} height={16} /> : <Check width={16} height={16} />}
                    </button>
                    <button className="action-btn edit" onClick={() => openEditModal(template)} title="Edit">
                      <EditPencil width={16} height={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(template)} title="Delete">
                      <Trash width={16} height={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Template' : 'New Template'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Template Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Welcome Email"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-control"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Line *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g., Welcome to {{company}}!"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Body *</label>
                  <div className="placeholders-bar">
                    <span className="placeholders-label">Insert:</span>
                    {PLACEHOLDERS.map(p => (
                      <button 
                        key={p.key} 
                        type="button" 
                        className="placeholder-btn"
                        onClick={() => insertPlaceholder(p.key)}
                        title={p.desc}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="form-control"
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    rows={10}
                    placeholder="Write your email content here..."
                    required
                  />
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
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Preview: {previewTemplate.name}</h2>
              <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="email-preview">
                <div className="preview-subject">
                  <strong>Subject:</strong> {previewTemplate.subject}
                </div>
                <div className="preview-body">
                  {previewTemplate.body}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
              <button className="btn-primary" onClick={() => { setShowPreview(false); openEditModal(previewTemplate); }}>
                <EditPencil width={16} height={16} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          padding: 20px;
        }
        .template-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .template-card.inactive { opacity: 0.7; }
        .template-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .template-category {
          font-size: 12px;
          color: #6b7280;
        }
        .status-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        .status-badge.active { background: #d1fae5; color: #065f46; }
        .status-badge.inactive { background: #f3f4f6; color: #6b7280; }
        .template-name {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .template-subject {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #374151;
        }
        .template-preview {
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
          margin-bottom: 16px;
          min-height: 60px;
        }
        .template-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
        }
        .action-btn.view { color: #3b82f6; }
        .action-btn.toggle { color: #f59e0b; }
        
        .modal-lg { max-width: 700px; }
        
        .placeholders-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 8px;
          align-items: center;
        }
        .placeholders-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }
        .placeholder-btn {
          padding: 4px 8px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
          cursor: pointer;
          transition: all 0.2s;
        }
        .placeholder-btn:hover {
          border-color: #244066;
          background: #eff6ff;
        }
        
        .email-preview {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .preview-subject {
          padding: 12px 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .preview-body {
          padding: 20px;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          min-height: 200px;
        }
      `}</style>
    </div>
  );
}


