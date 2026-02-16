import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Building2, Plus, Edit, Trash2, Check, MapPin, Phone, Mail, Star } from 'lucide-react';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import useCurrency from '../hooks/useCurrency';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Branches() {
  const { currency: tenantCurrency } = useCurrency();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [staffMembers, setStaffMembers] = useState([]);

  const [formData, setFormData] = useState({
    name: '', name_ar: '', code: '', address: '', city: '', country: 'UAE',
    phone: '', email: '', manager_id: '', is_headquarters: false, is_active: true, timezone: 'Asia/Dubai', currency: ''
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBranches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/staff`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStaffMembers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, [fetchBranches, fetchStaff]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '', name_ar: '', code: '', address: '', city: '', country: 'UAE',
      phone: '', email: '', manager_id: '', is_headquarters: false, is_active: true, timezone: 'Asia/Dubai', currency: tenantCurrency
    });
    setShowModal(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name, name_ar: branch.name_ar || '', code: branch.code || '',
      address: branch.address || '', city: branch.city || '', country: branch.country || 'UAE',
      phone: branch.phone || '', email: branch.email || '', manager_id: branch.manager_id || '',
      is_headquarters: branch.is_headquarters === 1, is_active: branch.is_active === 1,
      timezone: branch.timezone || 'Asia/Dubai', currency: branch.currency || tenantCurrency
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/branches${editingBranch ? `/${editingBranch.id}` : ''}`, {
        method: editingBranch ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, manager_id: formData.manager_id || null })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchBranches();
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

  const handleDelete = () => supportAlert();

  return (
    <div className="crm-page">
      <SEO page="branches" noindex={true} />
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <span>!</span>}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h1>Branches</h1>
          <p className="subtitle">Manage your office locations</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Add Branch
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : branches.length === 0 ? (
        <div className="empty-state">
          <Building2 size={64} />
          <h3>No branches found</h3>
          <p>Add your first branch location</p>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Add Branch
          </button>
        </div>
      ) : (
        <div className="branches-grid">
          {branches.map(branch => (
            <div key={branch.id} className={`branch-card ${branch.is_headquarters === 1 ? 'headquarters' : ''}`}>
              {branch.is_headquarters === 1 && (
                <div className="hq-badge"><Star size={12} /> Headquarters</div>
              )}
              <div className="branch-header">
                <h3 className="branch-name">{branch.name}</h3>
                {branch.name_ar && <div className="branch-name-ar">{branch.name_ar}</div>}
                {branch.code && <code className="branch-code">{branch.code}</code>}
              </div>
              <div className="branch-details">
                {branch.address && (
                  <div className="detail-item"><MapPin size={14} /> {branch.city}, {branch.country}</div>
                )}
                {branch.phone && <div className="detail-item"><Phone size={14} /> {branch.phone}</div>}
                {branch.email && <div className="detail-item"><Mail size={14} /> {branch.email}</div>}
                {branch.manager_name && <div className="detail-item">Manager: {branch.manager_name}</div>}
              </div>
              <div className="branch-footer">
                <span className={`badge ${branch.is_active === 1 ? 'badge-success' : 'badge-secondary'}`}>
                  {branch.is_active === 1 ? 'Active' : 'Inactive'}
                </span>
                <div className="branch-actions">
                  <button onClick={() => openEditModal(branch)}><Edit size={14} /></button>
                  <button onClick={() => handleDelete(branch)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBranch ? 'Edit Branch' : 'New Branch'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Branch Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label>Arabic Name</label>
                    <input type="text" name="name_ar" value={formData.name_ar} onChange={handleInputChange} className="form-control" dir="rtl" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Code</label>
                    <input type="text" name="code" value={formData.code} onChange={handleInputChange} className="form-control" placeholder="e.g., DXB-001" />
                  </div>
                  <div className="form-group">
                    <label>Manager</label>
                    <select name="manager_id" value={formData.manager_id} onChange={handleInputChange} className="form-control">
                      <option value="">Select Manager</option>
                      {staffMembers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-control" rows={2}></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select name="timezone" value={formData.timezone} onChange={handleInputChange} className="form-control">
                      <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select name="currency" value={formData.currency} onChange={handleInputChange} className="form-control">
                      <option value={tenantCurrency}>{tenantCurrency} (Default)</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="is_headquarters" checked={formData.is_headquarters} onChange={handleInputChange} />
                      <Star size={14} /> Set as Headquarters
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} /> Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingBranch ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .branches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        .branch-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: relative; border: 2px solid transparent; transition: all 0.2s; }
        .branch-card:hover { border-color: #244066; }
        .branch-card.headquarters { border-color: #f59e0b; }
        .hq-badge { position: absolute; top: -8px; right: 16px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .branch-header { margin-bottom: 16px; }
        .branch-name { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
        .branch-name-ar { font-size: 14px; color: #6b7280; direction: rtl; margin-top: 4px; }
        .branch-code { font-size: 12px; margin-top: 8px; display: inline-block; }
        .branch-details { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .detail-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; }
        .branch-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f3f4f6; }
        .branch-actions { display: flex; gap: 8px; }
        .branch-actions button { width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s; }
        .branch-actions button:hover { background: #244066; color: white; }
      `}</style>
    </div>
  );
}

