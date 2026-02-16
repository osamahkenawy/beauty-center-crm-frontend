import { useState, useEffect, useCallback } from 'react';
import { 
  Building, Plus, Search, EditPencil, Trash, Eye, 
  Phone, Mail, Globe, MapPin, User, Suitcase,
  Check, Xmark, FilterList
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './Accounts.css';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [viewingAccount, setViewingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '', industry: '', website: '', phone: '', email: '',
    address: '', city: '', country: '', status: 'active'
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      
      const data = await api.get(`/accounts?${params}`);
      if (data.success) setAccounts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', industry: '', website: '', phone: '', email: '',
      address: '', city: '', country: '', status: 'active' });
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name || '', industry: account.industry || '',
      website: account.website || '', phone: account.phone || '',
      email: account.email || '', address: account.address || '',
      city: account.city || '', country: account.country || '',
      status: account.status || 'active'
    });
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const openViewModal = (account) => {
    setViewingAccount(account);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = editingAccount 
        ? await api.put(`/accounts/${editingAccount.id}`, formData)
        : await api.post('/accounts', formData);
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchAccounts();
        setTimeout(() => setShowModal(false), 1000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleDelete = () => supportAlert();

  const getStatusColor = (status) => {
    return { active: 'success', inactive: 'secondary', prospect: 'warning' }[status] || 'secondary';
  };

  // Calculate stats
  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    inactive: accounts.filter(a => a.status === 'inactive').length,
    prospects: accounts.filter(a => a.status === 'prospect').length,
    totalContacts: accounts.reduce((sum, a) => sum + (a.contact_count || 0), 0),
    totalDeals: accounts.reduce((sum, a) => sum + (a.deal_count || 0), 0)
  };

  return (
    <div className="accounts-page">
      <SEO page="accounts" noindex={true} />
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Building width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Accounts</div>
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
            <Suitcase width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.prospects}</div>
            <div className="stat-label">Prospects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <User width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalContacts}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="page-card">
        <div className="card-header">
          <div className="header-left">
            <h2>Accounts</h2>
            <span className="count-badge">{accounts.length}</span>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            <span>New Account</span>
          </button>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <Search width={18} height={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <FilterList width={16} height={16} />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Building width={48} height={48} />
              </div>
              <h3>No accounts found</h3>
              <p>Create your first account to get started</p>
              <button className="btn-create" onClick={openCreateModal}>
                <Plus width={18} height={18} />
                <span>New Account</span>
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Contacts</th>
                  <th>Deals</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="account-cell">
                        <div className="account-avatar">
                          {account.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="account-info">
                          <div className="account-name">{account.name}</div>
                          {account.website && (
                            <div className="account-website">
                              <Globe width={12} height={12} />
                              <span>{account.website}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="industry-badge">{account.industry || '-'}</span>
                    </td>
                    <td>
                      <div className="contact-info">
                        {account.phone && (
                          <div className="contact-item">
                            <Phone width={14} height={14} />
                            <span>{account.phone}</span>
                          </div>
                        )}
                        {account.email && (
                          <div className="contact-item">
                            <Mail width={14} height={14} />
                            <span>{account.email}</span>
                          </div>
                        )}
                        {!account.phone && !account.email && <span className="text-muted">-</span>}
                      </div>
                    </td>
                    <td>
                      <div className="location-cell">
                        {(account.city || account.country) ? (
                          <>
                            <MapPin width={14} height={14} />
                            <span>{[account.city, account.country].filter(Boolean).join(', ')}</span>
                          </>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${getStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td>
                      <span className="count-cell">{account.contact_count || 0}</span>
                    </td>
                    <td>
                      <span className="count-cell">{account.deal_count || 0}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn view" 
                          onClick={() => openViewModal(account)}
                          title="View Details"
                        >
                          <Eye width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn edit" 
                          onClick={() => openEditModal(account)}
                          title="Edit"
                        >
                          <EditPencil width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDelete(account.id)}
                          title="Delete"
                        >
                          <Trash width={20} height={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAccount ? 'Edit Account' : 'New Account'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {message.text && (
                  <div className={`alert alert-${message.type}`}>{message.text}</div>
                )}
                
                <div className="form-group">
                  <label className="form-label">
                    <Building width={14} height={14} />
                    Account Name *
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="Enter account name"
                    required 
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Suitcase width={14} height={14} />
                      Industry
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      placeholder="e.g. Technology"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Globe width={14} height={14} />
                      Website
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="www.example.com"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Phone width={14} height={14} />
                      Phone
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Mail width={14} height={14} />
                      Email
                    </label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <MapPin width={14} height={14} />
                    Address
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Street address"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Dubai"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      placeholder="UAE"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingAccount && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Account Details</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="view-header">
                <div className="view-avatar">
                  {viewingAccount.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="view-title">
                  <h2>{viewingAccount.name}</h2>
                  <span className={`status-badge status-${getStatusColor(viewingAccount.status)}`}>
                    {viewingAccount.status}
                  </span>
                </div>
              </div>

              <div className="view-grid">
                <div className="view-section">
                  <h4>Business Information</h4>
                  <div className="view-item">
                    <Suitcase width={16} height={16} />
                    <div>
                      <label>Industry</label>
                      <p>{viewingAccount.industry || '-'}</p>
                    </div>
                  </div>
                  <div className="view-item">
                    <Globe width={16} height={16} />
                    <div>
                      <label>Website</label>
                      <p>{viewingAccount.website || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h4>Contact Information</h4>
                  <div className="view-item">
                    <Phone width={16} height={16} />
                    <div>
                      <label>Phone</label>
                      <p>{viewingAccount.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="view-item">
                    <Mail width={16} height={16} />
                    <div>
                      <label>Email</label>
                      <p>{viewingAccount.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h4>Location</h4>
                  <div className="view-item">
                    <MapPin width={16} height={16} />
                    <div>
                      <label>Address</label>
                      <p>
                        {viewingAccount.address || '-'}<br />
                        {[viewingAccount.city, viewingAccount.country].filter(Boolean).join(', ') || ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h4>Statistics</h4>
                  <div className="stats-mini">
                    <div className="stat-mini">
                      <span className="stat-mini-value">{viewingAccount.contact_count || 0}</span>
                      <span className="stat-mini-label">Contacts</span>
                    </div>
                    <div className="stat-mini">
                      <span className="stat-mini-value">{viewingAccount.deal_count || 0}</span>
                      <span className="stat-mini-label">Deals</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => {
                setShowViewModal(false);
                openEditModal(viewingAccount);
              }}>
                <EditPencil width={16} height={16} />
                Edit Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
