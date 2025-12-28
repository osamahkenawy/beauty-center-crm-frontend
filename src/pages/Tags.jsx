import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Label as TagIcon, Plus, EditPencil, Trash, Check } from 'iconoir-react';
import './CRMPages.css';

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({ name: '', color: '#667eea', entity_type: '' });

  const colors = [
    '#244066', '#f2421b', '#667eea', '#28c76f', '#ff9f43', 
    '#00cfe8', '#7367f0', '#ea5455', '#82868b', '#1e3a5f'
  ];
  
  const entityTypes = [
    { value: '', label: 'All Entities' },
    { value: 'lead', label: 'Leads' },
    { value: 'contact', label: 'Contacts' },
    { value: 'account', label: 'Accounts' },
    { value: 'deal', label: 'Deals' },
    { value: 'activity', label: 'Activities' }
  ];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/tags');
      if (data.success) setTags(data.data || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      showToast('error', 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#244066', entity_type: '' });
    setShowModal(true);
  };

  const openEditModal = (tag) => {
    setEditingTag(tag);
    setFormData({ 
      name: tag.name, 
      color: tag.color || '#667eea', 
      entity_type: tag.entity_type || '' 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Tag name is required');
      return;
    }
    
    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        entity_type: formData.entity_type || null 
      };
      
      const data = editingTag
        ? await api.patch(`/tags/${editingTag.id}`, payload)
        : await api.post('/tags', payload);
        
      if (data.success) {
        showToast('success', data.message || (editingTag ? 'Tag updated' : 'Tag created'));
        fetchTags();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Operation failed');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"? This action cannot be undone.`)) return;
    try {
      const data = await api.delete(`/tags/${tag.id}`);
      if (data.success) {
        showToast('success', 'Tag deleted successfully');
        fetchTags();
      } else {
        showToast('error', data.message || 'Failed to delete');
      }
    } catch (error) {
      showToast('error', 'Failed to delete tag');
    }
  };

  // Filter tags based on search and type
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || tag.entity_type === filterType;
    return matchesSearch && matchesType;
  });

  // Group tags by entity type
  const groupedTags = filteredTags.reduce((acc, tag) => {
    const type = tag.entity_type || 'general';
    if (!acc[type]) acc[type] = [];
    acc[type].push(tag);
    return acc;
  }, {});

  const getEntityLabel = (type) => {
    const found = entityTypes.find(e => e.value === type);
    return found ? found.label : 'General';
  };

  return (
    <div className="crm-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'}
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(36, 64, 102, 0.1)', color: '#244066' }}>
            <TagIcon width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{tags.length}</div>
            <div className="stat-label">Total Tags</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(40, 199, 111, 0.1)', color: '#28c76f' }}>
            <TagIcon width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{tags.filter(t => t.entity_type === 'lead').length}</div>
            <div className="stat-label">Lead Tags</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(242, 66, 27, 0.1)', color: '#f2421b' }}>
            <TagIcon width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{tags.filter(t => t.entity_type === 'deal').length}</div>
            <div className="stat-label">Deal Tags</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(115, 103, 240, 0.1)', color: '#7367f0' }}>
            <TagIcon width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{tags.filter(t => !t.entity_type).length}</div>
            <div className="stat-label">General Tags</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              {entityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            Add Tag
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : filteredTags.length === 0 ? (
          <div className="empty-state">
            <TagIcon width={64} height={64} className="empty-icon" />
            <h3>No tags found</h3>
            <p>{searchTerm || filterType ? 'Try adjusting your filters' : 'Create your first tag to organize records'}</p>
            {!searchTerm && !filterType && (
              <button className="btn-create" onClick={openCreateModal} style={{ marginTop: '16px' }}>
                <Plus width={18} height={18} />
                Create Tag
              </button>
            )}
          </div>
        ) : (
          <div className="tags-container">
            {Object.entries(groupedTags).map(([type, typeTags]) => (
              <div key={type} className="tag-group">
                <h4 className="tag-group-title">{getEntityLabel(type)}</h4>
                <div className="tags-grid">
                  {typeTags.map(tag => (
                    <div key={tag.id} className="tag-card">
                      <div className="tag-color-bar" style={{ background: tag.color || '#667eea' }}></div>
                      <div className="tag-content">
                        <div className="tag-badge" style={{ 
                          background: tag.color || '#667eea',
                          color: 'white'
                        }}>
                          <TagIcon width={14} height={14} />
                          {tag.name}
                        </div>
                        {tag.entity_type && (
                          <span className="tag-entity-type">{tag.entity_type}</span>
                        )}
                      </div>
                      <div className="tag-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => openEditModal(tag)}
                          title="Edit tag"
                        >
                          <EditPencil width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDelete(tag)}
                          title="Delete tag"
                        >
                          <Trash width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTag ? 'Edit Tag' : 'Create New Tag'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tag Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                    placeholder="e.g., VIP, Hot Lead, Priority"
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-picker-grid">
                    {colors.map(color => (
                      <div
                        key={color}
                        className={`color-option ${formData.color === color ? 'selected' : ''}`}
                        style={{ background: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      >
                        {formData.color === color && <Check width={16} height={16} color="white" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Apply To (optional)</label>
                  <select 
                    name="entity_type" 
                    value={formData.entity_type} 
                    onChange={handleInputChange} 
                    className="form-control"
                  >
                    {entityTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <small className="form-hint">Leave empty to use this tag across all entities</small>
                </div>

                {/* Preview */}
                <div className="form-group">
                  <label className="form-label">Preview</label>
                  <div className="tag-preview">
                    <span 
                      className="preview-badge"
                      style={{ 
                        background: formData.color,
                        color: 'white',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <TagIcon width={14} height={14} />
                      {formData.name || 'Tag Name'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingTag ? 'Update Tag' : 'Create Tag')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .tags-container {
          padding: 20px;
        }
        .tag-group {
          margin-bottom: 24px;
        }
        .tag-group-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-600);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--gray-200);
        }
        .tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .tag-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--gray-50);
          padding: 14px 16px;
          border-radius: 12px;
          transition: all 0.2s;
          border: 1px solid var(--gray-100);
        }
        .tag-card:hover {
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .tag-color-bar {
          width: 4px;
          height: 40px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .tag-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
          width: fit-content;
        }
        .tag-entity-type {
          font-size: 11px;
          color: var(--gray-500);
          text-transform: capitalize;
        }
        .tag-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tag-card:hover .tag-actions {
          opacity: 1;
        }
        .color-picker-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .color-option {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }
        .color-option:hover {
          transform: scale(1.1);
        }
        .color-option.selected {
          border-color: white;
          box-shadow: 0 0 0 2px currentColor;
          transform: scale(1.1);
        }
        .modal-sm {
          max-width: 420px;
        }
        .form-hint {
          display: block;
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 4px;
        }
        .tag-preview {
          padding: 16px;
          background: var(--gray-100);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .tags-grid {
            grid-template-columns: 1fr;
          }
          .tag-actions {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
