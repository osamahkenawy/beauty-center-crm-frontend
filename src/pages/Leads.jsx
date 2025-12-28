import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flash, Search, Plus, Eye, EditPencil, Trash, Building, Phone,
  GraphUp, User, Globe, Mail
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ new: 0, contacted: 0, qualified: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLead, setViewingLead] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', company: '', job_title: '',
    email: '', phone: '', mobile: '', whatsapp: '',
    website: '', industry: '', address: '', city: '', country: 'UAE',
    source: 'website', status: 'new', rating: 'warm', score: '', notes: ''
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSource) params.append('source', filterSource);
      if (filterRating) params.append('rating', filterRating);
      
      const res = await fetch(`${API_URL}/leads?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.data || []);
        setStats(data.stats || { new: 0, contacted: 0, qualified: 0, converted: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterSource, filterRating]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData({
      first_name: '', last_name: '', company: '', job_title: '',
      email: '', phone: '', mobile: '', whatsapp: '',
      website: '', industry: '', address: '', city: '', country: 'UAE',
      source: 'website', status: 'new', rating: 'warm', score: '', notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setEditing(lead);
    setFormData({
      first_name: lead.first_name || '', last_name: lead.last_name || '',
      company: lead.company || '', job_title: lead.job_title || '',
      email: lead.email || '', phone: lead.phone || '',
      mobile: lead.mobile || '', whatsapp: lead.whatsapp || '',
      website: lead.website || '', industry: lead.industry || '',
      address: lead.address || '', city: lead.city || '', country: lead.country || 'UAE',
      source: lead.source || 'website', status: lead.status || 'new',
      rating: lead.rating || 'warm', score: lead.score || '', notes: lead.notes || ''
    });
    setShowModal(true);
  };

  const openViewModal = (lead) => {
    setViewingLead(lead);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/leads${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        showToast('success', editing ? 'Lead updated successfully!' : 'Lead created successfully!');
        fetchLeads();
      } else {
        showToast('error', data.message || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete lead "${lead.first_name} ${lead.last_name || ''}"?`)) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('success', 'Lead deleted successfully!');
        fetchLeads();
      }
    } catch (error) {
      showToast('error', 'Failed to delete lead');
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Lead status changed to ${newStatus}`);
        fetchLeads();
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    return { new: '#667eea', contacted: '#00cfe8', qualified: '#28c76f', unqualified: '#6c757d', converted: '#f2421b', lost: '#ea5455' }[status] || '#6c757d';
  };

  const getRatingColor = (rating) => {
    return { hot: '#ea5455', warm: '#ff9f43', cold: '#00cfe8' }[rating] || '#6c757d';
  };

  const getSourceIcon = (source) => {
    return { website: '🌐', whatsapp: '📱', phone: '📞', referral: '🤝', social: '📲', email: '📧', event: '🎪', import: '📥' }[source] || '📋';
  };

  return (
    <div className="crm-page">
      <style>{`
        /* Toast */
        .global-toast {
          position: fixed; top: 100px; right: 24px; z-index: 9999;
          padding: 16px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideInRight 0.3s ease; min-width: 300px;
        }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .global-toast.success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .global-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
        
        /* Stats Cards */
        .leads-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 1024px) { .leads-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .leads-stats { grid-template-columns: 1fr; } }
        .stat-card { 
          background: white; border-radius: 16px; padding: 20px 24px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 18px;
          transition: all 0.3s ease; border: 1px solid #f0f0f0;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.1); }
        .stat-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .stat-icon.new { background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.05)); color: #667eea; }
        .stat-icon.contacted { background: linear-gradient(135deg, rgba(0, 207, 232, 0.15), rgba(0, 207, 232, 0.05)); color: #00cfe8; }
        .stat-icon.qualified { background: linear-gradient(135deg, rgba(40, 199, 111, 0.15), rgba(40, 199, 111, 0.05)); color: #28c76f; }
        .stat-icon.converted { background: linear-gradient(135deg, rgba(242, 66, 27, 0.15), rgba(242, 66, 27, 0.05)); color: #f2421b; }
        .stat-value { font-size: 28px; font-weight: 800; color: #1a1a2e; line-height: 1; }
        .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        
        /* CRM Card */
        .crm-card { background: white; border-radius: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.06); overflow: hidden; }
        .crm-header { padding: 24px 28px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .crm-filters { display: flex; gap: 12px; flex-wrap: wrap; flex: 1; }
        .crm-filters input, .crm-filters select { 
          padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;
          background: #fafbfc; transition: all 0.2s;
        }
        .crm-filters input:focus, .crm-filters select:focus { border-color: #244066; outline: none; background: white; box-shadow: 0 0 0 3px rgba(36,64,102,0.1); }
        .crm-filters input { min-width: 220px; }
        .btn-create { 
          background: linear-gradient(135deg, #244066, #3a5a8a); color: white; border: none; 
          padding: 14px 24px; border-radius: 12px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 8px; transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(36, 64, 102, 0.3);
        }
        .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(36, 64, 102, 0.4); }
        
        /* Table */
        .leads-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .leads-table th { 
          background: linear-gradient(180deg, #f8f9fb, #f3f4f6); padding: 16px 20px; 
          font-weight: 700; color: #6c757d; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.8px; border-bottom: 2px solid #e9ecef; text-align: left;
        }
        .leads-table td { padding: 16px 20px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
        .leads-table tr:hover { background: linear-gradient(90deg, #f8fafc, #fafbfc); }
        .lead-name { font-weight: 700; color: #1a1a2e; font-size: 14px; }
        .lead-company { font-size: 12px; color: #6c757d; margin-top: 2px; }
        
        /* Badges */
        .badge { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: capitalize; display: inline-block; }
        
        /* Action Buttons */
        .action-buttons { display: flex; gap: 8px; }
        .action-btn { 
          width: 40px; height: 40px; border: none; background: #f5f5f5; border-radius: 10px; 
          cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; 
          justify-content: center; color: #64748b;
        }
        .action-btn:hover { transform: scale(1.1); }
        .action-btn.view:hover { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
        .action-btn.edit:hover { background: rgba(36, 64, 102, 0.15); color: #244066; }
        .action-btn.delete:hover { background: rgba(242, 66, 27, 0.15); color: #f2421b; }
        .action-btn.convert:hover { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        
        /* Modal */
        .crm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index: 1050; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
        .crm-modal-container { background: white; border-radius: 20px; max-width: 800px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.25); animation: modalSlide 0.3s ease; }
        @keyframes modalSlide { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .crm-modal-header { padding: 24px 28px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 20px 20px 0 0; }
        .crm-modal-title { font-size: 20px; font-weight: 700; margin: 0; }
        .crm-modal-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 22px; transition: all 0.2s; }
        .crm-modal-close:hover { background: rgba(255,255,255,0.3); }
        .crm-modal-body { padding: 28px; max-height: 60vh; overflow-y: auto; }
        .crm-modal-footer { padding: 20px 28px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px; background: #fafbfc; border-radius: 0 0 20px 20px; }
        
        .form-section { margin-bottom: 24px; }
        .form-section-title { font-size: 13px; font-weight: 700; color: #244066; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
        .form-group { margin-bottom: 16px; }
        .form-label { font-weight: 600; color: #495057; margin-bottom: 6px; display: block; font-size: 13px; }
        .form-control, .form-select { width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; transition: all 0.2s; }
        .form-control:focus, .form-select:focus { border-color: #244066; outline: none; box-shadow: 0 0 0 3px rgba(36,64,102,0.1); }
        textarea.form-control { min-height: 100px; resize: vertical; }
        .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
        
        .btn { padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-secondary { background: #e9ecef; color: #495057; }
        .btn-primary { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        /* View Modal */
        .view-section { margin-bottom: 24px; }
        .view-section-title { font-size: 12px; font-weight: 700; color: #244066; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .view-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .view-item { }
        .view-label { font-size: 11px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
        .view-value { font-size: 14px; color: #1a1a2e; font-weight: 600; margin-top: 2px; }
        
        /* Empty State */
        .empty-state { text-align: center; padding: 60px 20px; color: #6c757d; }
        .empty-icon { font-size: 64px; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; }
        .empty-state h4 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
        
        /* Loading */
        .loading-state { display: flex; justify-content: center; align-items: center; padding: 60px; }
        .spinner-border { width: 40px; height: 40px; border: 4px solid #e9ecef; border-top-color: #244066; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast */}
      {toast.show && (
        <div className={`global-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '!'} {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="leads-stats">
        <div className="stat-card">
          <div className="stat-icon new">🆕</div>
          <div>
            <div className="stat-value">{stats.new || 0}</div>
            <div className="stat-label">New Leads</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon contacted">📞</div>
          <div>
            <div className="stat-value">{stats.contacted || 0}</div>
            <div className="stat-label">Contacted</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon qualified">✅</div>
          <div>
            <div className="stat-value">{stats.qualified || 0}</div>
            <div className="stat-label">Qualified</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon converted">🏆</div>
          <div>
            <div className="stat-value">{stats.converted || 0}</div>
            <div className="stat-label">Converted</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <input
              type="text"
              placeholder="🔍 Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="converted">Converted</option>
            </select>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
              <option value="">All Ratings</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">⭐ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            + New Lead
          </button>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner-border"></div></div>
        ) : leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h4>No leads found</h4>
            <p>Create your first lead to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-name">{lead.first_name} {lead.last_name}</div>
                      <div className="lead-company">{lead.company || 'No company'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{lead.email || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{lead.phone || '-'}</div>
                    </td>
                    <td>
                      <span>{getSourceIcon(lead.source)} {lead.source || '-'}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${getRatingColor(lead.rating)}20`, color: getRatingColor(lead.rating) }}>
                        {lead.rating === 'hot' ? '🔥' : lead.rating === 'warm' ? '⭐' : '❄️'} {lead.rating}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${getStatusColor(lead.status)}20`, color: getStatusColor(lead.status) }}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view" onClick={() => openViewModal(lead)} title="View">
                          <Eye width={20} height={20} />
                        </button>
                        <button className="action-btn edit" onClick={() => openEditModal(lead)} title="Edit">
                          <EditPencil width={20} height={20} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(lead)} title="Delete">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h5 className="crm-modal-title">{editing ? 'Edit Lead' : 'New Lead'}</h5>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="crm-modal-body">
                <div className="form-section">
                  <div className="form-section-title">👤 Basic Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input type="text" className="form-control" name="first_name" value={formData.first_name} onChange={handleInputChange} required placeholder="First name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input type="text" className="form-control" name="last_name" value={formData.last_name} onChange={handleInputChange} placeholder="Last name" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company</label>
                      <input type="text" className="form-control" name="company" value={formData.company} onChange={handleInputChange} placeholder="Company name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Job Title</label>
                      <input type="text" className="form-control" name="job_title" value={formData.job_title} onChange={handleInputChange} placeholder="Job title" />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">📞 Contact Details</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+971 50 000 0000" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input type="text" className="form-control" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="Mobile number" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">WhatsApp</label>
                      <input type="text" className="form-control" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} placeholder="WhatsApp number" />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">📊 Lead Status</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Source</label>
                      <select className="form-select" name="source" value={formData.source} onChange={handleInputChange}>
                        <option value="website">🌐 Website</option>
                        <option value="whatsapp">📱 WhatsApp</option>
                        <option value="phone">📞 Phone</option>
                        <option value="referral">🤝 Referral</option>
                        <option value="social">📲 Social Media</option>
                        <option value="email">📧 Email</option>
                        <option value="event">🎪 Event</option>
                        <option value="import">📥 Import</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Industry</label>
                      <input type="text" className="form-control" name="industry" value={formData.industry} onChange={handleInputChange} placeholder="Industry" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Rating</label>
                      <select className="form-select" name="rating" value={formData.rating} onChange={handleInputChange}>
                        <option value="hot">🔥 Hot</option>
                        <option value="warm">⭐ Warm</option>
                        <option value="cold">❄️ Cold</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" name="status" value={formData.status} onChange={handleInputChange}>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="unqualified">Unqualified</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">📝 Additional Info</div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Additional notes..."></textarea>
                  </div>
                </div>
              </div>
              <div className="crm-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update Lead' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingLead && (
        <div className="crm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowViewModal(false); }}>
          <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h5 className="crm-modal-title">👤 {viewingLead.first_name} {viewingLead.last_name}</h5>
              <button className="crm-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="crm-modal-body">
              <div className="view-section">
                <div className="view-section-title">Basic Information</div>
                <div className="view-grid">
                  <div className="view-item"><div className="view-label">Company</div><div className="view-value">{viewingLead.company || '-'}</div></div>
                  <div className="view-item"><div className="view-label">Job Title</div><div className="view-value">{viewingLead.job_title || '-'}</div></div>
                  <div className="view-item"><div className="view-label">Industry</div><div className="view-value">{viewingLead.industry || '-'}</div></div>
                  <div className="view-item"><div className="view-label">Source</div><div className="view-value">{getSourceIcon(viewingLead.source)} {viewingLead.source || '-'}</div></div>
                </div>
              </div>
              <div className="view-section">
                <div className="view-section-title">Contact Details</div>
                <div className="view-grid">
                  <div className="view-item"><div className="view-label">Email</div><div className="view-value">{viewingLead.email || '-'}</div></div>
                  <div className="view-item"><div className="view-label">Phone</div><div className="view-value">{viewingLead.phone || '-'}</div></div>
                  <div className="view-item"><div className="view-label">Mobile</div><div className="view-value">{viewingLead.mobile || '-'}</div></div>
                  <div className="view-item"><div className="view-label">WhatsApp</div><div className="view-value">{viewingLead.whatsapp || '-'}</div></div>
                </div>
              </div>
              <div className="view-section">
                <div className="view-section-title">Status</div>
                <div className="view-grid">
                  <div className="view-item">
                    <div className="view-label">Rating</div>
                    <span className="badge" style={{ background: `${getRatingColor(viewingLead.rating)}20`, color: getRatingColor(viewingLead.rating) }}>
                      {viewingLead.rating === 'hot' ? '🔥' : viewingLead.rating === 'warm' ? '⭐' : '❄️'} {viewingLead.rating}
                    </span>
                  </div>
                  <div className="view-item">
                    <div className="view-label">Status</div>
                    <span className="badge" style={{ background: `${getStatusColor(viewingLead.status)}20`, color: getStatusColor(viewingLead.status) }}>
                      {viewingLead.status}
                    </span>
                  </div>
                </div>
              </div>
              {viewingLead.notes && (
                <div className="view-section">
                  <div className="view-section-title">Notes</div>
                  <p style={{ color: '#495057', lineHeight: 1.6 }}>{viewingLead.notes}</p>
                </div>
              )}
            </div>
            <div className="crm-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setShowViewModal(false); openEditModal(viewingLead); }}>Edit Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
