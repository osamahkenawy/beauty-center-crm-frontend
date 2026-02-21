import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, X, Tags, ArrowRight, Sparkles } from 'lucide-react';
import { Badge, Modal } from 'react-bootstrap';
import { HexColorPicker } from 'react-colorful';
import { ICON_OPTIONS, renderCatIcon, EMPTY_CATEGORY_FORM } from './settingsConstants';
import { supportAlert } from '../../utils/supportAlert';

export default function CategoriesManager({
  categories, catLoading, fetchCategories, api, showToast, onNavigate
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_CATEGORY_FORM });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [categories]
  );
  const activeCount = useMemo(() => categories.filter((category) => category.is_active !== 0).length, [categories]);
  const inactiveCount = categories.length - activeCount;

  const closeModal = () => {
    setShowModal(false);
    setShowIconPicker(false);
    setShowColorPicker(false);
  };

  const openCreate = () => {
    setEditing(null);
    // Calculate next sort order based on existing categories
    const nextSortOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.sort_order || 0)) + 1
      : 1;
    setForm({ ...EMPTY_CATEGORY_FORM, sort_order: nextSortOrder });
    setShowIconPicker(false);
    setShowColorPicker(false);
    setShowModal(true);
  };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, name_ar: cat.name_ar || '', icon: cat.icon || 'sparkles', color: cat.color || '#E91E63', sort_order: cat.sort_order || 0, is_active: cat.is_active || 0 });
    setShowIconPicker(false);
    setShowColorPicker(false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { showToast('error', 'Category name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/service-categories/${editing.id}`, form);
        showToast('success', 'Category updated');
      } else {
        await api.post('/service-categories', form);
        showToast('success', 'Category created');
      }
      closeModal();
      fetchCategories();
    } catch (e) { showToast('error', e.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleDelete = () => supportAlert();

  return (
    <div className="stn-page">
      <div className="stn-cat-summary">
        <div className="stn-cat-summary-left">
          <div className="stn-cat-summary-icon"><Tags size={18} /></div>
          <div>
            <h3>Service Categories</h3>
            <p>Organize your services into clean, discoverable groups.</p>
          </div>
        </div>
        <div className="stn-cat-summary-stats">
          <span className="stn-cat-pill">Total {categories.length}</span>
          <span className="stn-cat-pill active">Active {activeCount}</span>
          {inactiveCount > 0 && <span className="stn-cat-pill muted">Inactive {inactiveCount}</span>}
        </div>
      </div>

      <div className="stn-page-actions">
        <button className="stn-btn-primary" onClick={openCreate}><Plus size={14} /> Add category</button>
      </div>

      <p className="stn-desc">Organize your services into categories. Drag to reorder.</p>

      {catLoading ? (
        <div className="stn-loading">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="stn-empty">
          <div className="stn-empty-icon"><Sparkles size={30} /></div>
          <h3>No categories yet</h3>
          <p>Create your first category to structure your service menu beautifully.</p>
          <button className="stn-btn-primary" onClick={openCreate}><Plus size={14} /> Create your first category</button>
        </div>
      ) : (
        <div className="stn-card">
          <div className="stn-card-head">
            <h3><Tags size={14} /> Category List</h3>
            <p>{categories.length} categories • Drag handles ready for reorder</p>
          </div>
          <div className="stn-card-body" style={{ padding: 0 }}>
            {sortedCategories.map((cat, index) => (
              <div className="stn-list-row" key={cat.id}>
                <div className="stn-list-left">
                  <GripVertical size={14} color="#d0d5dd" className="stn-grip" />
                  <div className="stn-cat-badge" style={{ background: cat.color ? `${cat.color}15` : '#f0f0f0', color: cat.color || '#666' }}>
                    {renderCatIcon(cat.icon, 18, cat.color)}
                  </div>
                  <div className="stn-list-info">
                    <strong>{cat.name} <span className="stn-cat-order">#{index + 1}</span></strong>
                    {cat.name_ar && <span className="stn-arabic">{cat.name_ar}</span>}
                  </div>
                </div>
                <div className="stn-list-right">
                  <Badge bg="" className={`stn-cat-status ${cat.is_active !== 0 ? 'active' : 'inactive'}`}>
                    {cat.is_active !== 0 ? 'Active' : 'Inactive'}
                  </Badge>
                  <button className="stn-btn-ghost" onClick={() => onNavigate('services')}><ArrowRight size={12} /> Services</button>
                  <button className="stn-btn-icon" onClick={() => openEdit(cat)}><Pencil size={14} /></button>
                  <button className="stn-btn-icon danger" onClick={() => handleDelete(cat.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={closeModal} centered className="stn-modal">
        <Modal.Header>
          <Modal.Title>{editing ? 'Edit category' : 'New category'}</Modal.Title>
          {/* <button className="stn-btn-icon" onClick={closeModal}><X size={18} /></button> */}
        </Modal.Header>
        <Modal.Body>
          {/* Preview */}
          <div className="stn-cat-preview" style={{ background: form.color ? `${form.color}12` : '#f5f5f5' }}>
            <div className="stn-cat-preview-icon" style={{ background: form.color ? `${form.color}22` : '#e0e0e0', color: form.color || '#666' }}>
              {renderCatIcon(form.icon, 28, form.color)}
            </div>
            <span style={{ color: form.color, fontWeight: 600 }}>{form.name || 'Category name'}</span>
          </div>

          <div className="stn-field">
            <label>Category name *</label>
            <input type="text" placeholder="e.g. Hair Styling" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="stn-field">
            <label>Arabic name</label>
            <input type="text" placeholder="الاسم بالعربية" dir="rtl" value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} />
          </div>

          {/* Icon picker */}
          <div className="stn-field">
            <label>Icon</label>
            <div className="stn-picker-trigger" onClick={() => setShowIconPicker(!showIconPicker)}>
              {renderCatIcon(form.icon, 20, form.color)}
              <span>{form.icon}</span>
            </div>
            {showIconPicker && (
              <div className="stn-icon-grid">
                {ICON_OPTIONS.map(ico => (
                  <button
                    key={ico}
                    className={`stn-icon-item ${form.icon === ico ? 'active' : ''}`}
                    onClick={() => { setForm(p => ({ ...p, icon: ico })); setShowIconPicker(false); }}
                  >
                    {renderCatIcon(ico, 18, form.color)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="stn-field">
            <label>Color</label>
            <div className="stn-picker-trigger" onClick={() => setShowColorPicker(!showColorPicker)}>
              <div className="stn-color-dot" style={{ background: form.color || '#E91E63' }} />
              <span>{form.color || '#E91E63'}</span>
            </div>
            {showColorPicker && (
              <div className="stn-color-picker">
                <HexColorPicker color={form.color || '#E91E63'} onChange={c => setForm(p => ({ ...p, color: c }))} />
                <div className="stn-color-presets">
                  {['#E91E63', '#9C27B0', '#673AB7', '#2196F3', '#009688', '#4CAF50', '#FF9800', '#F44336', '#795548', '#607D8B'].map(c => (
                    <button key={c} className="stn-color-preset" style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="stn-field">
            <label>Sort order</label>
            <input type="number" placeholder="1" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="stn-btn-outline" onClick={closeModal}>Cancel</button>
          <button className="stn-btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
