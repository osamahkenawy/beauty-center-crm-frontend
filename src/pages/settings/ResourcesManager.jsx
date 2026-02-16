import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Box, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { Badge, Modal } from 'react-bootstrap';
import { EMPTY_RESOURCE_FORM } from './settingsConstants';
import { supportAlert } from '../../utils/supportAlert';

const RESOURCE_TYPES = [
  { value: 'room', label: 'Room', emoji: '🚪' },
  { value: 'chair', label: 'Chair / Station', emoji: '💺' },
  { value: 'equipment', label: 'Equipment', emoji: '🔧' },
  { value: 'bed', label: 'Bed', emoji: '🛏️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export default function ResourcesManager({ branches, api, showToast }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_RESOURCE_FORM });
  const [searchQ, setSearchQ] = useState('');

  const fetchResources = async () => {
    try {
      const res = await api.get('/resources');
      if (res.success) setResources(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchResources(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_RESOURCE_FORM }); setShowModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, type: r.type || 'room', branch_id: r.branch_id || '', description: r.description || '', capacity: r.capacity || 1, is_active: r.is_active !== false });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { showToast('error', 'Resource name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, type: form.type, description: form.description, quantity: form.capacity, is_active: form.is_active };
      if (editing) {
        await api.patch(`/resources/${editing.id}`, payload);
        showToast('success', 'Resource updated');
      } else {
        await api.post('/resources', payload);
        showToast('success', 'Resource created');
      }
      setShowModal(false);
      fetchResources();
    } catch (e) { showToast('error', 'Failed'); }
    setSaving(false);
  };

  const handleDelete = () => supportAlert();

  const handleToggle = async (r) => {
    try { await api.patch(`/resources/${r.id}`, { is_active: !r.is_active }); fetchResources(); } catch (e) { showToast('error', 'Failed'); }
  };

  const filtered = resources.filter(r => !searchQ || r.name?.toLowerCase().includes(searchQ.toLowerCase()));
  const typeInfo = (t) => RESOURCE_TYPES.find(x => x.value === t) || RESOURCE_TYPES[4];

  return (
    <div className="stn-page">
      <div className="stn-page-actions">
        <button className="stn-btn-primary" onClick={openCreate}><Plus size={14} /> Add resource</button>
      </div>

      <p className="stn-desc">Manage rooms, equipment and other resources required for services.</p>

      {/* Search */}
      <div className="stn-search-bar">
        <Search size={14} />
        <input placeholder="Search resources..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="stn-loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="stn-empty">
          <Box size={48} strokeWidth={1} color="#d0d5dd" />
          <h3>No resources yet</h3>
          <p>Add rooms, chairs or equipment your services need.</p>
          <button className="stn-btn-primary" onClick={openCreate}><Plus size={14} /> Add resource</button>
        </div>
      ) : (
        <div className="stn-resource-grid">
          {filtered.map(r => {
            const ti = typeInfo(r.type);
            return (
              <div className={`stn-resource-card ${!r.is_active ? 'inactive' : ''}`} key={r.id}>
                <div className="stn-resource-top">
                  <span className="stn-resource-emoji">{ti.emoji}</span>
                  <Badge bg={r.is_active ? 'success' : 'secondary'} style={{ fontSize: 9 }}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <strong>{r.name}</strong>
                <span className="stn-resource-type">{ti.label}</span>
                {r.description && <span className="stn-resource-desc">{r.description}</span>}
                <span className="stn-resource-qty">Capacity: {r.capacity || 1}</span>
                <div className="stn-resource-actions">
                  <button className="stn-btn-icon" onClick={() => handleToggle(r)}>
                    {r.is_active ? <ToggleRight size={16} color="#059669" /> : <ToggleLeft size={16} />}
                  </button>
                  <button className="stn-btn-icon" onClick={() => openEdit(r)}><Pencil size={14} /></button>
                  <button className="stn-btn-icon danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="stn-modal">
        <Modal.Header>
          <Modal.Title>{editing ? 'Edit resource' : 'New resource'}</Modal.Title>
          <button className="stn-btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
        </Modal.Header>
        <Modal.Body>
          <div className="stn-form-grid">
            <div className="stn-field span-2">
              <label>Resource name *</label>
              <input type="text" placeholder="e.g. VIP Room" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="stn-field">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <div className="stn-field">
              <label>Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="stn-field span-2">
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="stn-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="stn-btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
