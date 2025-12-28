import { useState, useEffect, useCallback } from 'react';
import { EditPencil, Trash } from 'iconoir-react';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [stats, setStats] = useState({ open_deals: 0, pipeline_value: 0, weighted_value: 0, won_value: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', account_id: '', amount: '', currency: 'AED',
    expected_close_date: '', description: '', stage_id: ''
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (selectedPipeline) params.append('pipeline_id', selectedPipeline);
      
      const res = await fetch(`${API_URL}/deals?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeals(data.data || []);
        setPipelines(data.pipelines || []);
        setStats(data.stats || { open_deals: 0, pipeline_value: 0, weighted_value: 0, won_value: 0 });
        if (!selectedPipeline && data.pipelines?.length > 0) {
          setSelectedPipeline(data.pipelines[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline]);

  const fetchAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/accounts?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAccounts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchAccounts();
  }, [fetchDeals, fetchAccounts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = (stageId = null) => {
    setEditing(null);
    setFormData({
      name: '', account_id: '', amount: '', currency: 'AED',
      expected_close_date: '', description: '', stage_id: stageId || ''
    });
    setShowModal(true);
  };

  const openEditModal = (deal) => {
    setEditing(deal);
    setFormData({
      name: deal.name || '', account_id: deal.account_id || '',
      amount: deal.amount || '', currency: deal.currency || 'AED',
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
      description: deal.description || '', stage_id: deal.stage_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const payload = { ...formData, pipeline_id: selectedPipeline };
      
      const res = await fetch(`${API_URL}/deals${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        showToast('success', editing ? 'Deal updated!' : 'Deal created!');
        fetchDeals();
      } else {
        showToast('error', data.message || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (dealId, newStageId) => {
    try {
      const token = localStorage.getItem('crm_token');
      await fetch(`${API_URL}/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stage_id: newStageId }),
      });
      fetchDeals();
    } catch (error) {
      console.error('Stage update failed:', error);
    }
  };

  const handleDelete = async (deal) => {
    if (!confirm(`Delete deal "${deal.name}"?`)) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/deals/${deal.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('success', 'Deal deleted');
        fetchDeals();
      }
    } catch (error) {
      showToast('error', 'Failed to delete deal');
    }
  };

  const formatCurrency = (value, currency = 'AED') => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value || 0);
  };

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);
  const stages = currentPipeline?.stages || [];

  const getDealsForStage = (stageId) => deals.filter(d => d.stage_id === stageId);

  // Drag and Drop
  const onDragStart = (e, deal) => {
    e.dataTransfer.setData('dealId', deal.id);
    e.target.style.opacity = '0.5';
  };

  const onDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.background = 'rgba(36, 64, 102, 0.05)';
  };

  const onDragLeave = (e) => {
    e.currentTarget.style.background = '';
  };

  const onDrop = (e, stageId) => {
    e.preventDefault();
    e.currentTarget.style.background = '';
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      handleStageChange(parseInt(dealId), stageId);
    }
  };

  return (
    <div className="crm-page">
      <style>{`
        /* Toast */
        .deal-toast {
          position: fixed; top: 100px; right: 24px; z-index: 9999;
          padding: 16px 24px; border-radius: 12px; font-weight: 600;
          animation: slideIn 0.3s ease; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .deal-toast.success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .deal-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Header */
        .deals-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .pipeline-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .pipeline-tab { padding: 10px 20px; border-radius: 10px; border: 2px solid #e9ecef; background: white; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .pipeline-tab.active { border-color: #244066; background: #244066; color: white; }
        .pipeline-tab:hover:not(.active) { border-color: #244066; }
        .view-toggle { display: flex; gap: 5px; }
        .view-btn { padding: 8px 15px; border: 2px solid #e9ecef; background: white; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .view-btn.active { background: #244066; color: white; border-color: #244066; }
        .btn-create { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
        .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(36, 64, 102, 0.3); }
        
        /* Stats */
        .deals-stats { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat-item { background: white; border-radius: 12px; padding: 16px 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .stat-value { font-size: 24px; font-weight: 700; color: #244066; }
        .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
        
        /* Kanban Board */
        .kanban-board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 20px; min-height: 600px; }
        .kanban-column { min-width: 300px; max-width: 320px; flex-shrink: 0; background: #f8f9fb; border-radius: 12px; display: flex; flex-direction: column; }
        .column-header { padding: 16px; border-bottom: 3px solid; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-radius: 12px 12px 0 0; }
        .column-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .column-count { background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px; }
        .column-amount { font-size: 12px; color: #6c757d; width: 100%; }
        .column-cards { padding: 12px; flex: 1; overflow-y: auto; min-height: 200px; transition: background 0.2s; }
        
        .deal-card { background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); cursor: grab; transition: all 0.2s; }
        .deal-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .deal-card:active { cursor: grabbing; }
        .deal-title { font-weight: 600; color: #1a1a2e; margin-bottom: 6px; }
        .deal-account { font-size: 13px; color: #6c757d; margin-bottom: 8px; }
        .deal-amount { font-weight: 700; color: #244066; font-size: 15px; }
        .deal-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .deal-date { font-size: 11px; color: #999; }
        .deal-actions { display: flex; gap: 5px; }
        .deal-actions button { width: 26px; height: 26px; border: none; background: #f0f0f0; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
        .deal-actions button:hover { background: #244066; color: white; }
        .deal-actions button.delete:hover { background: #ea5455; }
        .add-deal-btn { width: 100%; padding: 10px; border: 2px dashed #ccc; background: none; border-radius: 8px; color: #999; cursor: pointer; margin-top: 10px; transition: all 0.2s; }
        .add-deal-btn:hover { border-color: #244066; color: #244066; }
        
        /* Won/Lost styling */
        .column-won .column-header { background: rgba(40, 199, 111, 0.1); border-color: #28c76f; }
        .column-lost .column-header { background: rgba(234, 84, 85, 0.1); border-color: #ea5455; }
        
        /* Modal */
        .crm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .crm-modal-container { background: white; border-radius: 16px; max-width: 500px; width: 95%; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25); animation: modalSlide 0.3s ease; }
        @keyframes modalSlide { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .crm-modal-header { padding: 20px 25px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; display: flex; justify-content: space-between; align-items: center; }
        .crm-modal-title { font-size: 18px; font-weight: 700; margin: 0; }
        .crm-modal-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 20px; }
        .crm-modal-body { padding: 25px; max-height: 60vh; overflow-y: auto; }
        .crm-modal-footer { padding: 20px 25px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 10px; background: #fafafa; }
        
        .form-group { margin-bottom: 14px; }
        .form-label { font-weight: 600; color: #495057; margin-bottom: 5px; display: block; font-size: 13px; }
        .form-control, .form-select { width: 100%; padding: 10px 14px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; }
        .form-control:focus, .form-select:focus { border-color: #244066; outline: none; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-secondary { background: #e9ecef; color: #495057; }
        .btn-primary { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        /* Table View */
        .deals-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .deals-table th { background: #f8f9fa; padding: 14px 16px; font-weight: 700; color: #6c757d; font-size: 11px; text-transform: uppercase; text-align: left; }
        .deals-table td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
        .deals-table tr:hover { background: #fafafa; }
        
        /* Loading & Empty */
        .loading-state { display: flex; justify-content: center; align-items: center; padding: 60px; }
        .spinner-border { width: 40px; height: 40px; border: 4px solid #e9ecef; border-top-color: #244066; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 60px; }
        .empty-icon { font-size: 64px; margin-bottom: 15px; display: flex; justify-content: center; }
      `}</style>

      {/* Toast */}
      {toast.show && (
        <div className={`deal-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '!'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="deals-header">
        <div className="pipeline-tabs">
          {pipelines.map(p => (
            <button 
              key={p.id}
              className={`pipeline-tab ${selectedPipeline === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPipeline(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>📋 Board</button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>📃 List</button>
          </div>
          <button className="btn-create" onClick={() => openCreateModal()}>+ Add Deal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="deals-stats">
        <div className="stat-item">
          <div className="stat-value">{stats.open_deals || 0}</div>
          <div className="stat-label">Open Deals</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatCurrency(stats.pipeline_value)}</div>
          <div className="stat-label">Pipeline Value</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatCurrency(stats.weighted_value)}</div>
          <div className="stat-label">Weighted Value</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatCurrency(stats.won_value)}</div>
          <div className="stat-label">Won Revenue</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner-border"></div></div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="kanban-board">
          {stages.map(stage => {
            const stageDeals = getDealsForStage(stage.id);
            const stageTotal = stageDeals.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            
            return (
              <div 
                key={stage.id}
                className={`kanban-column ${stage.is_won ? 'column-won' : ''} ${stage.is_lost ? 'column-lost' : ''}`}
              >
                <div className="column-header" style={{ borderColor: stage.color || '#667eea' }}>
                  <div>
                    <div className="column-title">
                      <span style={{ color: stage.color || '#667eea' }}>{stage.name}</span>
                      <span className="column-count">{stageDeals.length}</span>
                    </div>
                    <div className="column-amount">{formatCurrency(stageTotal)}</div>
                  </div>
                </div>
                <div 
                  className="column-cards"
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, stage.id)}
                >
                  {stageDeals.map(deal => (
                    <div 
                      key={deal.id}
                      className="deal-card"
                      draggable
                      onDragStart={(e) => onDragStart(e, deal)}
                      onDragEnd={onDragEnd}
                    >
                      <div className="deal-title">{deal.name}</div>
                      {deal.account_name && <div className="deal-account">🏢 {deal.account_name}</div>}
                      <div className="deal-amount">{formatCurrency(deal.amount, deal.currency)}</div>
                      <div className="deal-meta">
                        {deal.expected_close_date && (
                          <span className="deal-date">📅 {deal.expected_close_date.split('T')[0]}</span>
                        )}
                        <div className="deal-actions">
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(deal); }} title="Edit">
                            <EditPencil width={18} height={18} />
                          </button>
                          <button className="delete" onClick={(e) => { e.stopPropagation(); handleDelete(deal); }} title="Delete">
                            <Trash width={18} height={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="add-deal-btn" onClick={() => openCreateModal(stage.id)}>+ Add Deal</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {deals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <h4>No deals found</h4>
              <p>Create your first deal to get started</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="deals-table">
                <thead>
                  <tr>
                    <th>Deal Name</th>
                    <th>Amount</th>
                    <th>Stage</th>
                    <th>Account</th>
                    <th>Close Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td><strong>{deal.name}</strong></td>
                      <td style={{ fontWeight: 700, color: '#244066' }}>{formatCurrency(deal.amount)}</td>
                      <td>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: `${deal.stage_color || '#667eea'}20`, color: deal.stage_color || '#667eea' }}>
                          {deal.stage_name || 'No stage'}
                        </span>
                      </td>
                      <td>{deal.account_name || '-'}</td>
                      <td>{deal.expected_close_date?.split('T')[0] || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn edit" onClick={() => openEditModal(deal)} title="Edit">
                            <EditPencil width={20} height={20} />
                          </button>
                          <button className="action-btn delete" onClick={() => handleDelete(deal)} title="Delete">
                            <Trash width={20} height={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h5 className="crm-modal-title">{editing ? 'Edit Deal' : 'New Deal'}</h5>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="crm-modal-body">
                <div className="form-group">
                  <label className="form-label">Deal Name *</label>
                  <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Enter deal name" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Account</label>
                  <select className="form-select" name="account_id" value={formData.account_id} onChange={handleInputChange}>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input type="number" className="form-control" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" name="currency" value={formData.currency} onChange={handleInputChange}>
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stage</label>
                    <select className="form-select" name="stage_id" value={formData.stage_id} onChange={handleInputChange}>
                      <option value="">Select stage</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Close Date</label>
                    <input type="date" className="form-control" name="expected_close_date" value={formData.expected_close_date} onChange={handleInputChange} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Deal details..."></textarea>
                </div>
              </div>
              <div className="crm-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update Deal' : 'Create Deal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
