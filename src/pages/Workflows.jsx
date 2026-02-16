import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Workflow, Plus, Edit, Trash2, Check, Play, Pause, Zap, Settings, History } from 'lucide-react';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', description: '', entity_type: 'lead', trigger_event: 'created', trigger_field: '',
    conditions: [], actions: [{ type: 'send_notification', config: { message: '' } }], is_active: true
  });

  const entityTypes = ['lead', 'contact', 'account', 'deal', 'activity'];
  const triggerEvents = ['created', 'updated', 'status_changed', 'stage_changed', 'field_changed', 'assigned'];
  const actionTypes = [
    { value: 'update_field', label: 'Update Field' },
    { value: 'create_activity', label: 'Create Activity' },
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'assign_owner', label: 'Assign Owner' },
    { value: 'add_tag', label: 'Add Tag' },
    { value: 'create_approval', label: 'Create Approval' },
    { value: 'webhook', label: 'Call Webhook' }
  ];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/workflows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setWorkflows(data.data || []);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (workflowId) => {
    try {
      const token = localStorage.getItem('crm_token');
      const params = workflowId ? `?workflow_id=${workflowId}` : '';
      const res = await fetch(`${API_URL}/workflows/logs${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setShowLogsModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleActionChange = (index, field, value) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      if (field === 'type') {
        newActions[index] = { type: value, config: {} };
      } else {
        newActions[index].config = { ...newActions[index].config, [field]: value };
      }
      return { ...prev, actions: newActions };
    });
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_notification', config: { message: '' } }]
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const openCreateModal = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '', description: '', entity_type: 'lead', trigger_event: 'created', trigger_field: '',
      conditions: [], actions: [{ type: 'send_notification', config: { message: '' } }], is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name, description: workflow.description || '',
      entity_type: workflow.entity_type, trigger_event: workflow.trigger_event,
      trigger_field: workflow.trigger_field || '', conditions: workflow.conditions || [],
      actions: workflow.actions || [{ type: 'send_notification', config: {} }],
      is_active: workflow.is_active === 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/workflows${editingWorkflow ? `/${editingWorkflow.id}` : ''}`, {
        method: editingWorkflow ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchWorkflows();
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

  const toggleActive = async (workflow) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: workflow.is_active === 1 ? false : true })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Workflow updated');
        fetchWorkflows();
      }
    } catch (error) {
      showToast('error', 'Failed to update');
    }
  };

  const handleDelete = () => supportAlert();

  return (
    <div className="crm-page">
      <SEO page="workflows" noindex={true} />
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <span>!</span>}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h1>Workflows</h1>
          <p className="subtitle">Automate your CRM processes</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => fetchLogs()}>
            <History size={16} /> View Logs
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Create Workflow
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : workflows.length === 0 ? (
        <div className="empty-state">
          <Workflow size={64} />
          <h3>No workflows found</h3>
          <p>Create your first automation workflow</p>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Create Workflow
          </button>
        </div>
      ) : (
        <div className="workflows-grid">
          {workflows.map(workflow => (
            <div key={workflow.id} className={`workflow-card ${workflow.is_active === 1 ? 'active' : 'inactive'}`}>
              <div className="workflow-header">
                <div className="workflow-icon"><Zap size={20} /></div>
                <div className="workflow-status">
                  <button 
                    className={`toggle-btn ${workflow.is_active === 1 ? 'on' : 'off'}`}
                    onClick={() => toggleActive(workflow)}
                    title={workflow.is_active === 1 ? 'Deactivate' : 'Activate'}
                  >
                    {workflow.is_active === 1 ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                </div>
              </div>
              <h3 className="workflow-name">{workflow.name}</h3>
              {workflow.description && <p className="workflow-desc">{workflow.description}</p>}
              <div className="workflow-trigger">
                <span className="trigger-label">When</span>
                <span className="trigger-value">{workflow.entity_type} is {workflow.trigger_event}</span>
              </div>
              <div className="workflow-actions-count">
                <Zap size={14} /> {workflow.actions?.length || 0} action(s)
              </div>
              <div className="workflow-meta">
                <span>Executed: {workflow.execution_count || 0} times</span>
              </div>
              <div className="workflow-footer">
                <button onClick={() => fetchLogs(workflow.id)} title="View logs"><History size={14} /></button>
                <button onClick={() => openEditModal(workflow)} title="Edit"><Edit size={14} /></button>
                <button onClick={() => handleDelete(workflow)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingWorkflow ? 'Edit Workflow' : 'New Workflow'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Workflow Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows={2}></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Entity Type *</label>
                    <select name="entity_type" value={formData.entity_type} onChange={handleInputChange} className="form-control">
                      {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trigger Event *</label>
                    <select name="trigger_event" value={formData.trigger_event} onChange={handleInputChange} className="form-control">
                      {triggerEvents.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                {formData.trigger_event === 'field_changed' && (
                  <div className="form-group">
                    <label>Field Name</label>
                    <input type="text" name="trigger_field" value={formData.trigger_field} onChange={handleInputChange} className="form-control" placeholder="e.g., status" />
                  </div>
                )}
                
                <div className="form-section">
                  <h4>Actions</h4>
                  {formData.actions.map((action, index) => (
                    <div key={index} className="action-item">
                      <select
                        value={action.type}
                        onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                        className="form-control"
                      >
                        {actionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {action.type === 'send_notification' && (
                        <input
                          type="text"
                          value={action.config.message || ''}
                          onChange={(e) => handleActionChange(index, 'message', e.target.value)}
                          className="form-control"
                          placeholder="Notification message..."
                        />
                      )}
                      {action.type === 'update_field' && (
                        <>
                          <input type="text" value={action.config.field || ''} onChange={(e) => handleActionChange(index, 'field', e.target.value)} className="form-control" placeholder="Field name" />
                          <input type="text" value={action.config.value || ''} onChange={(e) => handleActionChange(index, 'value', e.target.value)} className="form-control" placeholder="New value" />
                        </>
                      )}
                      {formData.actions.length > 1 && (
                        <button type="button" className="btn-icon-danger" onClick={() => removeAction(index)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn-secondary btn-sm" onClick={addAction}>
                    <Plus size={14} /> Add Action
                  </button>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} /> Active
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingWorkflow ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Workflow Execution Logs</h3>
              <button className="modal-close" onClick={() => setShowLogsModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div className="empty-state"><p>No logs found</p></div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Entity</th>
                      <th>Status</th>
                      <th>Executed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.workflow_name || 'Unknown'}</td>
                        <td>{log.entity_type} #{log.entity_id}</td>
                        <td>
                          <span className={`badge badge-${log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'secondary'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{new Date(log.executed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowLogsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .header-actions { display: flex; gap: 12px; }
        .workflows-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .workflow-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #244066; }
        .workflow-card.inactive { opacity: 0.7; border-left-color: #9ca3af; }
        .workflow-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .workflow-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .toggle-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .toggle-btn.on { background: #10b981; color: white; }
        .toggle-btn.off { background: #e5e7eb; color: #6b7280; }
        .workflow-name { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0; }
        .workflow-desc { font-size: 13px; color: #6b7280; margin: 0 0 16px 0; }
        .workflow-trigger { background: #f8f9fb; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .trigger-label { font-size: 11px; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .trigger-value { font-weight: 600; color: #374151; text-transform: capitalize; }
        .workflow-actions-count { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
        .workflow-meta { font-size: 12px; color: #9ca3af; margin-bottom: 16px; }
        .workflow-footer { display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #f3f4f6; }
        .workflow-footer button { width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s; }
        .workflow-footer button:hover { background: #244066; color: white; }
        .form-section { margin: 24px 0; padding: 16px; background: #f8f9fb; border-radius: 12px; }
        .form-section h4 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
        .action-item { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
        .action-item .form-control { flex: 1; }
        .btn-icon-danger { width: 32px; height: 32px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .btn-sm { font-size: 12px; padding: 6px 12px; }
      `}</style>
    </div>
  );
}

