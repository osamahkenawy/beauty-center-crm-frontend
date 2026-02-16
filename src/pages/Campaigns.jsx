import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Plus, EditPencil, Trash, Check, Search, Play, Pause, StatsUpSquare } from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import useCurrency from '../hooks/useCurrency';
import './CRMPages.css';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', type: 'email', status: 'draft', start_date: '', end_date: '', budget: '', description: ''
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
      
      const data = await api.get(`/campaigns?${params}`);
      if (data.success) setCampaigns(data.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      showToast('error', 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData({ name: '', type: 'email', status: 'draft', start_date: '', end_date: '', budget: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name, type: campaign.type || 'email', status: campaign.status || 'draft',
      start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      budget: campaign.budget || '', description: campaign.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Clean data - ensure empty strings become null for dates and numbers
      const cleanData = {
        ...formData,
        start_date: formData.start_date?.trim() || null,
        end_date: formData.end_date?.trim() || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
      };
      
      let data;
      if (editingCampaign) {
        data = await api.patch(`/campaigns/${editingCampaign.id}`, cleanData);
      } else {
        data = await api.post('/campaigns', cleanData);
      }
      
      if (data.success) {
        showToast('success', data.message || 'Campaign saved');
        fetchCampaigns();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Failed to save campaign');
      }
    } catch (error) {
      console.error('Campaign error:', error);
      showToast('error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => supportAlert();

  const getStatusColor = (status) => {
    const colors = { draft: 'secondary', scheduled: 'info', running: 'success', completed: 'primary', cancelled: 'danger' };
    return colors[status] || 'secondary';
  };

  const getTypeIcon = (type) => {
    const icons = { email: '📧', sms: '📱', whatsapp: '💬', social: '📣', other: '📢' };
    return icons[type] || '📢';
  };

  const { currency: tenantCurrency } = useCurrency();
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: tenantCurrency || 'AED', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="crm-page">
      <SEO page="campaigns" noindex={true} />
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <span>!</span>}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h1>Campaigns</h1>
          <p className="subtitle">{campaigns.length} campaigns</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Create Campaign
        </button>
      </div>

      <div className="filters-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-control filter-select">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <Megaphone size={64} />
          <h3>No campaigns found</h3>
          <p>Create your first marketing campaign</p>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="campaign-card">
              <div className="campaign-header">
                <span className="campaign-type">{getTypeIcon(campaign.type)} {campaign.type}</span>
                <span className={`badge badge-${getStatusColor(campaign.status)}`}>{campaign.status}</span>
              </div>
              <h3 className="campaign-name">{campaign.name}</h3>
              {campaign.description && <p className="campaign-desc">{campaign.description}</p>}
              <div className="campaign-stats">
                <div className="stat">
                  <div className="stat-value">{campaign.total_sent || 0}</div>
                  <div className="stat-label">Sent</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.total_opened || 0}</div>
                  <div className="stat-label">Opened</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.total_clicked || 0}</div>
                  <div className="stat-label">Clicked</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{campaign.total_converted || 0}</div>
                  <div className="stat-label">Converted</div>
                </div>
              </div>
              <div className="campaign-footer">
                <div className="campaign-meta">
                  {campaign.budget && <span>Budget: {formatCurrency(campaign.budget)}</span>}
                </div>
                <div className="campaign-actions">
                  <button onClick={() => openEditModal(campaign)}><EditPencil width={14} height={14} /></button>
                  <button onClick={() => handleDelete(campaign)}><Trash width={14} height={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Campaign Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="form-control">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="social">Social Media</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="form-control">
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="running">Running</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Budget (AED)</label>
                  <input type="number" name="budget" value={formData.budget} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows={3}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingCampaign ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .campaign-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .campaign-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .campaign-type { font-size: 12px; text-transform: uppercase; font-weight: 600; color: #6b7280; }
        .campaign-name { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0; }
        .campaign-desc { font-size: 13px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.5; }
        .campaign-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; margin-bottom: 16px; }
        .campaign-stats .stat { text-align: center; }
        .campaign-stats .stat-value { font-size: 20px; font-weight: 700; color: #244066; }
        .campaign-stats .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .campaign-footer { display: flex; justify-content: space-between; align-items: center; }
        .campaign-meta { font-size: 13px; color: #6b7280; }
        .campaign-actions { display: flex; gap: 8px; }
        .campaign-actions button { width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s; }
        .campaign-actions button:hover { background: #244066; color: white; }
      `}</style>
    </div>
  );
}

