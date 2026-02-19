import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Badge } from 'react-bootstrap';
import { FileText, Plus, Edit2, Trash2, Eye, Copy, ToggleLeft, ToggleRight, GripVertical, X, Save, ChevronDown, ChevronUp, Search, Layers, ClipboardList } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import './ConsultationForms.css';

const FORM_TYPES = [
  { key: 'intake', label: 'Intake Form', color: '#4361ee' },
  { key: 'medical', label: 'Medical History', color: '#e63946' },
  { key: 'consent', label: 'Consent Form', color: '#2a9d8f' },
  { key: 'patch_test', label: 'Patch Test', color: '#f77f00' },
  { key: 'custom', label: 'Custom Form', color: '#6c757d' },
];

const FIELD_TYPES = [
  { key: 'text', label: 'Short Text', icon: '✏️' },
  { key: 'textarea', label: 'Long Text', icon: '📝' },
  { key: 'select', label: 'Dropdown', icon: '📋' },
  { key: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { key: 'radio', label: 'Radio Buttons', icon: '🔘' },
  { key: 'date', label: 'Date', icon: '📅' },
  { key: 'signature', label: 'Signature', icon: '🖊️' },
  { key: 'heading', label: 'Section Header', icon: '📌' },
  { key: 'paragraph', label: 'Info Text', icon: '💬' },
];

export default function ConsultationForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [showResponses, setShowResponses] = useState(null);
  const [responses, setResponses] = useState([]);
  const [editingForm, setEditingForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', form_type: 'custom', is_required: false, fields: [], is_active: true
  });

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/consultation-forms');
      if (res.success) setForms(res.data || []);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load forms', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const filteredForms = forms.filter(f => {
    if (!searchTerm) return true;
    return f.name?.toLowerCase().includes(searchTerm.toLowerCase()) || f.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const openBuilder = (form = null) => {
    if (form) {
      setEditingForm(form);
      setFormData({
        name: form.name || '', description: form.description || '',
        form_type: form.form_type || 'custom', is_required: !!form.is_required,
        fields: form.fields || [], is_active: form.is_active !== false
      });
    } else {
      setEditingForm(null);
      setFormData({ name: '', description: '', form_type: 'custom', is_required: false, fields: [], is_active: true });
    }
    setShowBuilder(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Swal.fire({ icon: 'warning', title: 'Missing Name', text: 'Please enter a form name', confirmButtonColor: '#f2421b' });
      return;
    }
    try {
      if (editingForm) {
        await api.patch(`/consultation-forms/${editingForm.id}`, formData);
        Swal.fire({ icon: 'success', title: 'Form Updated!', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/consultation-forms', formData);
        Swal.fire({ icon: 'success', title: 'Form Created!', timer: 2000, showConfirmButton: false });
      }
      setShowBuilder(false);
      fetchForms();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save form', confirmButtonColor: '#f2421b' });
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Cannot Delete',
      html: `<p style="margin:0;color:#666;">For complete removal, please contact support:</p><p style="margin:8px 0 0;"><strong>📧 info@trasealla.com</strong></p>`,
      icon: 'info',
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'OK'
    });
  };

  const addField = (type) => {
    const newField = {
      id: Date.now(),
      type,
      label: '',
      required: false,
      placeholder: '',
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [],
      description: ''
    };
    setFormData(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateField = (idx, updates) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === idx ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (idx) => {
    Swal.fire({
      title: 'Remove Field?',
      text: 'This field will be removed from the form',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Remove'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormData(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }));
      }
    });
  };

  const moveField = (idx, direction) => {
    setFormData(prev => {
      const fields = [...prev.fields];
      const target = idx + direction;
      if (target < 0 || target >= fields.length) return prev;
      [fields[idx], fields[target]] = [fields[target], fields[idx]];
      return { ...prev, fields };
    });
  };

  const openResponses = async (form) => {
    try {
      const res = await api.get(`/consultation-forms/${form.id}/responses`);
      if (res.success) setResponses(res.data || []);
    } catch (e) { console.error(e); }
    setShowResponses(form);
  };

  const toggleActive = async (form) => {
    try {
      await api.patch(`/consultation-forms/${form.id}`, { is_active: !form.is_active });
      Swal.fire({
        icon: 'success',
        title: form.is_active ? 'Deactivated' : 'Activated',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      fetchForms();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status', confirmButtonColor: '#f2421b' });
    }
  };

  const getTypeInfo = (key) => FORM_TYPES.find(t => t.key === key) || FORM_TYPES[4];

  return (
    <div className="cf-page">
      {/* Header */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><ClipboardList size={26} /></div>
          <div>
            <h1 className="module-hero-title">Consultation Forms</h1>
            <p className="module-hero-sub">Create & manage intake forms, consent forms, and medical questionnaires</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" onClick={() => openBuilder()}>
            <Plus size={16} /> New Form
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cf-stats-grid">
        <div className="cf-stat-card">
          <div className="cf-stat-icon" style={{ background: 'rgba(242,66,27,0.1)' }}>
            <FileText size={20} color="#f2421b" />
          </div>
          <div>
            <div className="cf-stat-value">{forms.length}</div>
            <div className="cf-stat-label">Total Forms</div>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <ToggleRight size={20} color="#22c55e" />
          </div>
          <div>
            <div className="cf-stat-value" style={{ color: '#22c55e' }}>{forms.filter(f => f.is_active).length}</div>
            <div className="cf-stat-label">Active</div>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Layers size={20} color="#ef4444" />
          </div>
          <div>
            <div className="cf-stat-value" style={{ color: '#ef4444' }}>{forms.filter(f => f.is_required).length}</div>
            <div className="cf-stat-label">Required</div>
          </div>
        </div>
        {FORM_TYPES.map(t => (
          <div key={t.key} className="cf-stat-card">
            <div className="cf-stat-icon" style={{ background: `${t.color}15` }}>
              <FileText size={18} color={t.color} />
            </div>
            <div>
              <div className="cf-stat-value" style={{ color: t.color }}>{forms.filter(f => f.form_type === t.key).length}</div>
              <div className="cf-stat-label">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="cf-toolbar">
        <div className="cf-search-wrap">
          <Search size={15} className="cf-search-icon" />
          <input
            type="text"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="cf-search-input"
          />
        </div>
      </div>

      {/* Form Cards */}
      <div className="cf-grid">
        {filteredForms.map(form => {
          const typeInfo = getTypeInfo(form.form_type);
          return (
            <div key={form.id} className={`cf-card ${!form.is_active ? 'inactive' : ''}`}>
              <div className="cf-card-header" style={{ '--card-accent': typeInfo.color }}>
                <Badge bg="" style={{ background: typeInfo.color, fontSize: 10, padding: '3px 10px', borderRadius: 12 }}>{typeInfo.label}</Badge>
                <div className="cf-card-actions">
                  <button onClick={() => toggleActive(form)} title={form.is_active ? 'Deactivate' : 'Activate'}>
                    {form.is_active ? <ToggleRight size={18} color="#28a745" /> : <ToggleLeft size={18} color="#999" />}
                  </button>
                </div>
              </div>
              <h4 className="cf-card-title">{form.name}</h4>
              {form.description && <p className="cf-card-desc">{form.description}</p>}
              <div className="cf-card-meta">
                <span className="cf-field-count">{(form.fields || []).length} fields</span>
                {form.is_required && <Badge bg="" style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10 }}>Required</Badge>}
              </div>
              <div className="cf-card-footer">
                <button onClick={() => setShowPreview(form)} className="cf-card-btn" data-tooltip="Preview form"><Eye size={14} /> Preview</button>
                <button onClick={() => openResponses(form)} className="cf-card-btn" data-tooltip="View responses"><FileText size={14} /> Responses</button>
                  <button onClick={() => openBuilder(form)} className="cf-card-btn" data-tooltip="Edit form"><Edit2 size={14} /> Edit</button>
                <button onClick={() => handleDelete(form.id)} className="cf-card-btn danger" data-tooltip="Delete form"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}

        {/* Add Card */}
        <div className="cf-add-card" onClick={() => openBuilder()}>
          <div className="cf-add-card-icon">
            <Plus size={28} strokeWidth={1.5} />
          </div>
          <span>Create New Form</span>
        </div>

        {forms.length === 0 && !loading && (
          <div className="cf-empty">
            <FileText size={48} strokeWidth={1} />
            <h4>No forms yet</h4>
            <p>Create your first consultation form to collect client information.</p>
            <button className="cf-add-btn" onClick={() => openBuilder()}>
              <Plus size={16} /> Create Form
            </button>
          </div>
        )}
      </div>

      {/* ═══ Form Builder Modal ═══ */}
      <Modal show={showBuilder} onHide={() => setShowBuilder(false)} size="xl" centered>
        <Modal.Header closeButton className="cf-modal-header">
          <Modal.Title><FileText size={18} /> {editingForm ? 'Edit Form' : 'New Form'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', padding: 24 }}>
          <div className="cf-builder">
            <div className="cf-builder-settings">
              <div className="cf-builder-row">
                <Form.Group className="flex-fill">
                  <Form.Label>Form Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. New Client Intake Form" />
                </Form.Group>
                <Form.Group style={{ width: 200 }}>
                  <Form.Label>Form Type</Form.Label>
                  <Form.Select value={formData.form_type} onChange={e => setFormData(p => ({ ...p, form_type: e.target.value }))}>
                    {FORM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this form" />
              </Form.Group>
              <div className="cf-builder-toggles">
                <label className="cf-toggle-label">
                  <input type="checkbox" checked={formData.is_required} onChange={e => setFormData(p => ({ ...p, is_required: e.target.checked }))} />
                  Required before appointment
                </label>
                <label className="cf-toggle-label">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                  Active
                </label>
              </div>
            </div>

            {/* Fields */}
            <div className="cf-builder-fields">
              <h5>Form Fields ({formData.fields.length})</h5>
              {formData.fields.map((field, idx) => (
                <div key={field.id || idx} className="cf-field-item">
                  <div className="cf-field-header">
                    <GripVertical size={14} className="cf-field-drag" />
                    <span className="cf-field-type-badge">{FIELD_TYPES.find(t => t.key === field.type)?.icon} {FIELD_TYPES.find(t => t.key === field.type)?.label || field.type}</span>
                    <div className="cf-field-actions">
                      <button data-tooltip="Move up" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></button>
                      <button data-tooltip="Move down" onClick={() => moveField(idx, 1)} disabled={idx === formData.fields.length - 1}><ChevronDown size={14} /></button>
                      <button data-tooltip="Remove field" onClick={() => removeField(idx)} className="cf-field-remove"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="cf-field-body">
                    <Form.Control placeholder="Field label" value={field.label}
                      onChange={e => updateField(idx, { label: e.target.value })} className="mb-2" />
                    {(field.type === 'text' || field.type === 'textarea') && (
                      <Form.Control placeholder="Placeholder text" value={field.placeholder || ''}
                        onChange={e => updateField(idx, { placeholder: e.target.value })} size="sm" />
                    )}
                    {(field.type === 'select' || field.type === 'radio') && (
                      <div className="cf-field-options">
                        {(field.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="cf-option-row">
                            <Form.Control size="sm" value={opt}
                              onChange={e => {
                                const opts = [...(field.options || [])];
                                opts[oIdx] = e.target.value;
                                updateField(idx, { options: opts });
                              }} />
                            <button onClick={() => {
                              const opts = (field.options || []).filter((_, i) => i !== oIdx);
                              updateField(idx, { options: opts });
                            }}><X size={12} /></button>
                          </div>
                        ))}
                        <button className="cf-add-option" onClick={() => updateField(idx, { options: [...(field.options || []), ''] })}>
                          <Plus size={12} /> Add option
                        </button>
                      </div>
                    )}
                    {field.type === 'heading' && (
                      <Form.Control placeholder="Section description (optional)" value={field.description || ''}
                        onChange={e => updateField(idx, { description: e.target.value })} size="sm" />
                    )}
                    <label className="cf-field-required">
                      <input type="checkbox" checked={field.required || false}
                        onChange={e => updateField(idx, { required: e.target.checked })} />
                      Required
                    </label>
                  </div>
                </div>
              ))}

              <div className="cf-add-field-section">
                <span className="cf-add-field-label">Add field:</span>
                <div className="cf-field-type-buttons">
                  {FIELD_TYPES.map(t => (
                    <button key={t.key} className="cf-field-type-btn" onClick={() => addField(t.key)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="cf-modal-footer">
          <button className="cf-btn-secondary" onClick={() => setShowBuilder(false)}>Cancel</button>
          <button className="cf-btn-primary" onClick={handleSave} disabled={!formData.name}>
            <Save size={14} /> {editingForm ? 'Update Form' : 'Create Form'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Preview Modal ═══ */}
      <Modal show={!!showPreview} onHide={() => setShowPreview(null)} size="lg" centered>
        <Modal.Header closeButton className="cf-modal-header">
          <Modal.Title><Eye size={18} /> Form Preview: {showPreview?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 24 }}>
          {showPreview && (
            <div className="cf-preview">
              {showPreview.description && <p className="cf-preview-desc">{showPreview.description}</p>}
              {(showPreview.fields || []).map((field, idx) => (
                <div key={idx} className="cf-preview-field">
                  {field.type === 'heading' ? (
                    <>
                      <h5 className="cf-preview-heading">{field.label}</h5>
                      {field.description && <p className="cf-preview-sub">{field.description}</p>}
                    </>
                  ) : field.type === 'paragraph' ? (
                    <p className="cf-preview-para">{field.label}</p>
                  ) : field.type === 'signature' ? (
                    <div className="cf-preview-sig">
                      <label>{field.label} {field.required && <span className="text-danger">*</span>}</label>
                      <div className="cf-sig-pad">Sign here</div>
                    </div>
                  ) : (
                    <Form.Group className="mb-3">
                      <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
                      {field.type === 'text' && <Form.Control placeholder={field.placeholder} disabled />}
                      {field.type === 'textarea' && <Form.Control as="textarea" rows={3} placeholder={field.placeholder} disabled />}
                      {field.type === 'date' && <Form.Control type="date" disabled />}
                      {field.type === 'checkbox' && <Form.Check label={field.label} disabled />}
                      {field.type === 'select' && (
                        <Form.Select disabled>
                          <option>Select...</option>
                          {(field.options || []).map((o, i) => <option key={i}>{o}</option>)}
                        </Form.Select>
                      )}
                      {field.type === 'radio' && (field.options || []).map((o, i) => (
                        <Form.Check key={i} type="radio" label={o} disabled name={`preview-${idx}`} />
                      ))}
                    </Form.Group>
                  )}
                </div>
              ))}
              {(showPreview.fields || []).length === 0 && <p className="text-muted text-center py-4">No fields defined yet.</p>}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ═══ Responses Modal ═══ */}
      <Modal show={!!showResponses} onHide={() => setShowResponses(null)} size="lg" centered>
        <Modal.Header closeButton className="cf-modal-header">
          <Modal.Title><FileText size={18} /> Responses: {showResponses?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto', padding: 24 }}>
          {responses.length > 0 ? (
            <table className="cf-responses-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Submitted</th>
                  <th>Signed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map(r => (
                  <tr key={r.id}>
                    <td>{r.customer_first_name} {r.customer_last_name}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`cf-signed-badge ${r.signed_at ? 'yes' : 'no'}`}>
                        {r.signed_at ? '✓ Signed' : '— Unsigned'}
                      </span>
                    </td>
                    <td><button className="cf-view-response-btn"><Eye size={14} /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="cf-empty-responses">
              <FileText size={40} strokeWidth={1} color="#ccc" />
              <p>No responses yet</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
