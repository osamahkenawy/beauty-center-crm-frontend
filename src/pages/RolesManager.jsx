import { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { Shield, Plus, Edit2, RotateCcw, Users, Check, Trash2, Eye, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import './RolesManager.css';

const COLORS = ['#f2421b', '#667eea', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#ef4444'];

const ROLE_ICONS = {
  admin: '👑',
  manager: '📋',
  receptionist: '💁',
  stylist: '💇',
  staff: '👤',
};

export default function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    color: '#667eea',
    permissions: {},
  });

  // ─── Fetch ──────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, matrixRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions-matrix'),
      ]);
      if (rolesRes.success) setRoles(rolesRes.data || []);
      if (matrixRes.success) setMatrix(matrixRes.data || []);
    } catch (e) {
      console.error('Fetch roles error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // ─── Modal Open ─────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', display_name: '', description: '', color: '#667eea', permissions: {} });
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      color: role.color || '#667eea',
      permissions: role.permissions || {},
    });
    setShowModal(true);
  };

  // ─── Permission Helpers ─────────────────────────────
  const togglePerm = (module, action) => {
    setForm(prev => {
      const perms = { ...prev.permissions };
      if (!perms[module]) perms[module] = {};
      perms[module] = { ...perms[module], [action]: !perms[module][action] };
      return { ...prev, permissions: perms };
    });
  };

  const isPermChecked = (module, action) => {
    return form.permissions?.[module]?.[action] === true;
  };

  const getViewScope = (module) => {
    return form.permissions?.[module]?.view_scope || 'own';
  };

  const setViewScope = (module, scope) => {
    setForm(prev => {
      const perms = { ...prev.permissions };
      if (!perms[module]) perms[module] = {};
      perms[module] = { ...perms[module], view_scope: scope };
      return { ...prev, permissions: perms };
    });
  };

  const toggleAllForModule = (module, actions) => {
    setForm(prev => {
      const perms = { ...prev.permissions };
      const allChecked = actions.every(a => perms[module]?.[a]);
      if (allChecked) {
        perms[module] = {};
      } else {
        perms[module] = {};
        actions.forEach(a => { perms[module][a] = true; });
      }
      return { ...prev, permissions: perms };
    });
  };

  const selectAllPerms = () => {
    setForm(prev => {
      const perms = {};
      matrix.forEach(m => {
        perms[m.module] = {};
        m.actions.forEach(a => { perms[m.module][a] = true; });
      });
      return { ...prev, permissions: perms };
    });
  };

  const clearAllPerms = () => {
    setForm(prev => ({ ...prev, permissions: {} }));
  };

  // ─── Save ───────────────────────────────────────────
  const handleSave = async () => {
    if (!form.display_name?.trim()) {
      Swal.fire('Missing Info', 'Display name is required', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await api.patch(`/roles/${editing.id}`, {
          display_name: form.display_name,
          description: form.description,
          color: form.color,
          permissions: form.permissions,
        });
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Role permissions updated', timer: 1500, showConfirmButton: false });
          setShowModal(false);
          fetchRoles();
        } else {
          Swal.fire('Error', res.message || 'Failed to update', 'error');
        }
      } else {
        if (!form.name?.trim()) {
          Swal.fire('Missing Info', 'Role name is required', 'warning');
          setSaving(false);
          return;
        }
        const res = await api.post('/roles', {
          name: form.name,
          display_name: form.display_name,
          description: form.description,
          color: form.color,
          permissions: form.permissions,
        });
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Created!', text: 'New role created', timer: 1500, showConfirmButton: false });
          setShowModal(false);
          fetchRoles();
        } else {
          Swal.fire('Error', res.message || 'Failed to create', 'error');
        }
      }
    } catch (e) {
      Swal.fire('Error', 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Reset to Default ──────────────────────────────
  const handleReset = async (role) => {
    const confirm = await Swal.fire({
      title: 'Reset to Default?',
      text: `This will restore "${role.display_name}" to its default permissions.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Yes, reset it',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await api.post(`/roles/reset/${role.id}`);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Reset!', text: 'Permissions restored to default', timer: 1500, showConfirmButton: false });
        fetchRoles();
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to reset', 'error');
    }
  };

  // ─── Delete Custom Role ────────────────────────────
  const handleDelete = async (role) => {
    const confirm = await Swal.fire({
      title: 'Delete Role?',
      text: `Are you sure you want to delete "${role.display_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Delete',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await api.delete(`/roles/${role.id}`);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        fetchRoles();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to delete', 'error');
    }
  };

  // ─── Get Permission Summary ─────────────────────────
  const getPermSummary = (permissions) => {
    if (!permissions) return [];
    const items = [];
    Object.entries(permissions).forEach(([module, actions]) => {
      if (!actions || typeof actions !== 'object') return;
      const actionList = Object.keys(actions).filter(a => actions[a]);
      if (actionList.length > 0) {
        items.push({ module, count: actionList.length, hasView: actions.view, hasAll: actionList.length >= 3 });
      }
    });
    return items;
  };

  // ─── Render ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="roles-loading">
        <div className="spinner" />
        <p>Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="roles-manager">
      <div className="roles-header">
        <div>
          <h2><Shield size={24} /> Roles & Permissions</h2>
          <p>Define what each team member role can access. Changes apply immediately.</p>
        </div>
        <button className="roles-create-btn" onClick={openCreate}>
          <Plus size={16} /> Create Custom Role
        </button>
      </div>

      {/* ─── Roles Grid ────────────────────────────── */}
      <div className="roles-grid">
        {roles.map(role => {
          const permSummary = getPermSummary(role.permissions);
          const icon = ROLE_ICONS[role.name] || '🔐';
          return (
            <div className="role-card" key={role.id}>
              <div className="role-card-header">
                <div className="role-icon-wrap" style={{ background: role.color || '#667eea' }}>
                  {icon}
                </div>
                <div className="role-card-info">
                  <h3>
                    {role.display_name}
                    {role.is_system ? <span className="role-system-badge">System</span> : null}
                  </h3>
                  <p>{role.description}</p>
                </div>
                <div className="role-card-actions">
                  <button className="role-action-btn" onClick={() => openEdit(role)} title="Edit Permissions">
                    <Edit2 size={14} />
                  </button>
                  {role.is_system ? (
                    <button className="role-action-btn" onClick={() => handleReset(role)} title="Reset to Default">
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <button className="role-action-btn danger" onClick={() => handleDelete(role)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="role-card-perms">
                {permSummary.slice(0, 8).map(p => (
                  <span key={p.module} className={`perm-badge ${p.hasAll ? '' : p.hasView ? 'limited' : 'none'}`}>
                    {p.module.replace(/_/g, ' ')}
                  </span>
                ))}
                {permSummary.length > 8 && (
                  <span className="perm-more">+{permSummary.length - 8} more</span>
                )}
              </div>

              <div className="role-card-stats">
                <div className="role-stat">
                  <Users size={14} />
                  <strong>{role.member_count || 0}</strong> members
                </div>
                <div className="role-stat">
                  <Lock size={14} />
                  <strong>{permSummary.length}</strong> modules
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Edit/Create Modal ─────────────────────── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered className="role-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>
            {editing ? `Edit: ${editing.display_name}` : 'Create Custom Role'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Basic Info */}
          <div className="role-form-section">
            <h5><Shield size={16} /> Role Details</h5>
            <div className="role-form-row">
              {!editing && (
                <div className="role-form-group">
                  <label>Role Key (lowercase, no spaces)</label>
                  <input
                    placeholder="e.g. senior_stylist"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  />
                </div>
              )}
              <div className="role-form-group">
                <label>Display Name</label>
                <input
                  placeholder="e.g. Senior Stylist"
                  value={form.display_name}
                  onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="role-form-group">
              <label>Description</label>
              <input
                placeholder="Briefly describe what this role can do..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="role-form-group">
              <label>Color</label>
              <div className="role-color-picker">
                {COLORS.map(c => (
                  <div
                    key={c}
                    className={`role-color-swatch ${form.color === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="role-form-section">
            <h5><Lock size={16} /> Permissions</h5>
            <div className="perms-quick-toggles">
              <button className="perms-quick-btn" onClick={selectAllPerms}>✅ Select All</button>
              <button className="perms-quick-btn" onClick={clearAllPerms}>❌ Clear All</button>
            </div>

            <div className="perms-matrix">
              <div className="perms-matrix-header">
                <span>Module</span>
                <div className="perms-matrix-actions">
                  <span>View</span>
                  <span>Create</span>
                  <span>Edit</span>
                  <span>Delete</span>
                  <span>Other</span>
                  {matrix.some(m => m.module === 'appointments' || m.module === 'invoices') && (
                    <span style={{ minWidth: '90px', textAlign: 'center' }}>View Scope</span>
                  )}
                </div>
              </div>
              {matrix.map(m => {
                const standardActions = ['view', 'create', 'edit', 'delete'];
                const otherActions = m.actions.filter(a => !standardActions.includes(a));
                return (
                  <div className="perms-matrix-row" key={m.module}>
                    <span
                      className="perms-module-label"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleAllForModule(m.module, m.actions)}
                    >
                      {m.label}
                    </span>
                    <div className="perms-actions-row">
                      {standardActions.map(action => (
                        <div className="perm-toggle" key={action}>
                          {m.actions.includes(action) ? (
                            <div
                              className={`perm-checkbox ${isPermChecked(m.module, action) ? 'checked' : ''}`}
                              onClick={() => togglePerm(m.module, action)}
                            >
                              {isPermChecked(m.module, action) && <Check size={12} />}
                            </div>
                          ) : (
                            <span style={{ color: '#ddd', fontSize: '0.75rem' }}>—</span>
                          )}
                        </div>
                      ))}
                      <div className="perm-toggle">
                        {otherActions.length > 0 ? (
                          <div
                            className={`perm-checkbox ${otherActions.some(a => isPermChecked(m.module, a)) ? 'checked' : ''}`}
                            onClick={() => {
                              otherActions.forEach(a => togglePerm(m.module, a));
                            }}
                            title={otherActions.join(', ')}
                          >
                            {otherActions.some(a => isPermChecked(m.module, a)) && <Check size={12} />}
                          </div>
                        ) : (
                          <span style={{ color: '#ddd', fontSize: '0.75rem' }}>—</span>
                        )}
                      </div>
                      {/* View Scope dropdown for appointments and invoices */}
                      {matrix.some(m => m.module === 'appointments' || m.module === 'invoices') && (
                        <div className="perm-toggle" style={{ minWidth: '90px', textAlign: 'center' }}>
                          {(m.module === 'appointments' || m.module === 'invoices') ? (
                            isPermChecked(m.module, 'view') ? (
                              <select
                                value={getViewScope(m.module)}
                                onChange={(e) => setViewScope(m.module, e.target.value)}
                                style={{
                                  padding: '4px 6px',
                                  fontSize: '0.7rem',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  background: 'white',
                                  cursor: 'pointer',
                                  width: '100%',
                                  minWidth: '80px'
                                }}
                                title="Choose if this role can view all records or only their own"
                              >
                                <option value="own">Own Only</option>
                                <option value="all">All</option>
                              </select>
                            ) : (
                              <span style={{ color: '#ddd', fontSize: '0.75rem' }}>—</span>
                            )
                          ) : (
                            <span style={{ color: '#ddd', fontSize: '0.75rem' }}>—</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              className="perms-quick-btn"
              onClick={() => setShowModal(false)}
              style={{ padding: '12px 24px' }}
            >
              Cancel
            </button>
            <button className="role-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editing ? 'Update Role' : 'Create Role')}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
