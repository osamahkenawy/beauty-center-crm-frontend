import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, EditPencil, Trash, Check, Xmark,
  Text, Calendar, List, CheckCircle, Mail, Phone, 
  Link as LinkIcon, ColorWheel, Hashtag, Drag
} from 'iconoir-react';
import api from '../lib/api';
import './CustomFields.css';

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterEntity, setFilterEntity] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    entity_type: 'lead', field_name: '', field_label: '', field_label_ar: '',
    field_type: 'text', options: '', default_value: '', placeholder: '',
    section: '', sort_order: 0, is_required: false, is_active: true, description: ''
  });

  const entityTypes = [
    { value: 'lead', label: 'Lead', color: '#f59e0b' },
    { value: 'contact', label: 'Contact', color: '#3b82f6' },
    { value: 'account', label: 'Account', color: '#8b5cf6' },
    { value: 'deal', label: 'Deal', color: '#22c55e' },
    { value: 'activity', label: 'Activity', color: '#ec4899' }
  ];

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: Text },
    { value: 'textarea', label: 'Textarea', icon: Text },
    { value: 'number', label: 'Number', icon: Hashtag },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'datetime', label: 'DateTime', icon: Calendar },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'multiselect', label: 'Multi-Select', icon: List },
    { value: 'checkbox', label: 'Checkbox', icon: CheckCircle },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'url', label: 'URL', icon: LinkIcon },
    { value: 'color', label: 'Color', icon: ColorWheel }
  ];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterEntity ? `?entity_type=${filterEntity}` : '';
      const data = await api.get(`/custom-fields${params}`);
      if (data.success) setFields(data.data || []);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setLoading(false);
    }
  }, [filterEntity]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateModal = () => {
    setEditingField(null);
    setFormData({
      entity_type: filterEntity || 'lead', field_name: '', field_label: '', field_label_ar: '',
      field_type: 'text', options: '', default_value: '', placeholder: '',
      section: '', sort_order: 0, is_required: false, is_active: true, description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (field) => {
    setEditingField(field);
    setFormData({
      entity_type: field.entity_type, field_name: field.field_name,
      field_label: field.field_label, field_label_ar: field.field_label_ar || '',
      field_type: field.field_type || 'text',
      options: field.options ? field.options.join(', ') : '',
      default_value: field.default_value || '', placeholder: field.placeholder || '',
      section: field.section || '', sort_order: field.sort_order || 0,
      is_required: field.is_required === 1, is_active: field.is_active === 1,
      description: field.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        options: formData.options ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : null
      };
      
      const data = editingField 
        ? await api.patch(`/custom-fields/${editingField.id}`, payload)
        : await api.post('/custom-fields', payload);

      if (data.success) {
        showToast('success', data.message || 'Field saved successfully');
        fetchFields();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field) => {
    if (!confirm(`Deactivate field "${field.field_label}"?`)) return;
    try {
      const data = await api.delete(`/custom-fields/${field.id}`);
      if (data.success) {
        showToast('success', 'Field deactivated');
        fetchFields();
      }
    } catch (error) {
      showToast('error', 'Failed to deactivate');
    }
  };

  // Group fields by entity type
  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.entity_type]) acc[field.entity_type] = [];
    acc[field.entity_type].push(field);
    return acc;
  }, {});

  // Calculate stats
  const stats = {
    total: fields.length,
    active: fields.filter(f => f.is_active === 1).length,
    required: fields.filter(f => f.is_required === 1).length,
    entities: Object.keys(groupedFields).length
  };

  const getEntityColor = (entityType) => {
    return entityTypes.find(e => e.value === entityType)?.color || '#64748b';
  };

  const getFieldTypeIcon = (fieldType) => {
    const type = fieldTypes.find(t => t.value === fieldType);
    return type ? type.icon : Text;
  };

  return (
    <div className="custom-fields-page">
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check width={16} height={16} /> : <Xmark width={16} height={16} />}
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Settings width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Fields</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <Check width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <CheckCircle width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.required}</div>
            <div className="stat-label">Required</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <List width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.entities}</div>
            <div className="stat-label">Entities</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="page-card">
        <div className="card-header">
          <div className="header-left">
            <h2>Custom Fields</h2>
            <span className="count-badge">{fields.length}</span>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            <span>Add Field</span>
          </button>
        </div>

        <div className="filters-bar">
          <div className="entity-tabs">
            <button 
              className={`entity-tab ${filterEntity === '' ? 'active' : ''}`}
              onClick={() => setFilterEntity('')}
            >
              All
            </button>
            {entityTypes.map(entity => (
              <button
                key={entity.value}
                className={`entity-tab ${filterEntity === entity.value ? 'active' : ''}`}
                onClick={() => setFilterEntity(entity.value)}
                style={{ '--entity-color': entity.color }}
              >
                {entity.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading fields...</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Settings width={48} height={48} />
              </div>
              <h3>No custom fields found</h3>
              <p>Create custom fields to extend your CRM data model</p>
              <button className="btn-create" onClick={openCreateModal}>
                <Plus width={18} height={18} />
                <span>Add Field</span>
              </button>
            </div>
          ) : (
            <div className="fields-container">
              {Object.entries(groupedFields).map(([entityType, entityFields]) => (
                <div key={entityType} className="entity-section">
                  <div className="entity-header" style={{ '--entity-color': getEntityColor(entityType) }}>
                    <div className="entity-indicator"></div>
                    <h3>{entityType}</h3>
                    <span className="entity-count">{entityFields.length} fields</span>
                  </div>
                  <div className="fields-list">
                    {entityFields.map(field => {
                      const FieldIcon = getFieldTypeIcon(field.field_type);
                      return (
                        <div 
                          key={field.id} 
                          className={`field-card ${field.is_active === 1 ? '' : 'inactive'}`}
                        >
                          <div className="field-drag">
                            <Drag width={16} height={16} />
                          </div>
                          <div className="field-type-icon" style={{ '--entity-color': getEntityColor(entityType) }}>
                            <FieldIcon width={16} height={16} />
                          </div>
                          <div className="field-info">
                            <div className="field-label">
                              {field.field_label}
                              {field.is_required === 1 && <span className="required-mark">*</span>}
                            </div>
                            <div className="field-meta">
                              <span className="field-name-badge">{field.field_name}</span>
                              <span className="field-type-badge">{field.field_type}</span>
                              {field.section && <span className="field-section-badge">{field.section}</span>}
                            </div>
                          </div>
                          <div className="field-actions">
                            <button 
                              className="action-btn edit" 
                              onClick={() => openEditModal(field)}
                              title="Edit Field"
                            >
                              <EditPencil width={20} height={20} />
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDelete(field)}
                              title="Deactivate Field"
                            >
                              <Trash width={20} height={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingField ? 'Edit Field' : 'New Custom Field'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <List width={14} height={14} />
                      Entity Type *
                    </label>
                    <select 
                      name="entity_type" 
                      className="form-input" 
                      value={formData.entity_type} 
                      onChange={handleInputChange}
                      disabled={!!editingField}
                    >
                      {entityTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Settings width={14} height={14} />
                      Field Type *
                    </label>
                    <select 
                      name="field_type" 
                      className="form-input" 
                      value={formData.field_type} 
                      onChange={handleInputChange}
                    >
                      {fieldTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Field Name * (lowercase, no spaces)</label>
                    <input
                      type="text"
                      name="field_name"
                      className="form-input code-input"
                      value={formData.field_name}
                      onChange={handleInputChange}
                      required
                      pattern="[a-z_]+"
                      placeholder="e.g., custom_status"
                      disabled={!!editingField}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display Label *</label>
                    <input 
                      type="text" 
                      name="field_label" 
                      className="form-input" 
                      value={formData.field_label} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Custom Status"
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Arabic Label</label>
                    <input 
                      type="text" 
                      name="field_label_ar" 
                      className="form-input" 
                      value={formData.field_label_ar} 
                      onChange={handleInputChange} 
                      dir="rtl"
                      placeholder="التسمية العربية"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input 
                      type="text" 
                      name="section" 
                      className="form-input" 
                      value={formData.section} 
                      onChange={handleInputChange} 
                      placeholder="e.g., Basic Info, Details" 
                    />
                  </div>
                </div>

                {['select', 'multiselect', 'radio'].includes(formData.field_type) && (
                  <div className="form-group">
                    <label className="form-label">
                      <List width={14} height={14} />
                      Options (comma separated)
                    </label>
                    <input 
                      type="text" 
                      name="options" 
                      className="form-input" 
                      value={formData.options} 
                      onChange={handleInputChange} 
                      placeholder="Option 1, Option 2, Option 3" 
                    />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Value</label>
                    <input 
                      type="text" 
                      name="default_value" 
                      className="form-input" 
                      value={formData.default_value} 
                      onChange={handleInputChange}
                      placeholder="Default value when empty"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Placeholder</label>
                    <input 
                      type="text" 
                      name="placeholder" 
                      className="form-input" 
                      value={formData.placeholder} 
                      onChange={handleInputChange}
                      placeholder="Placeholder text"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    name="description" 
                    className="form-input" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    rows={2}
                    placeholder="Help text for this field..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sort Order</label>
                    <input 
                      type="number" 
                      name="sort_order" 
                      className="form-input" 
                      value={formData.sort_order} 
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group checkbox-options">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        name="is_required" 
                        checked={formData.is_required} 
                        onChange={handleInputChange} 
                      />
                      <span className="checkmark"></span>
                      Required
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        name="is_active" 
                        checked={formData.is_active} 
                        onChange={handleInputChange} 
                      />
                      <span className="checkmark"></span>
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingField ? 'Update Field' : 'Create Field')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
