import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User, Search, Plus, Eye, EditPencil, Trash, Building, Phone, Mail,
  AtSign, Star, MapPin
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './CRMPages.css';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ total: 0, primary: 0, withEmail: 0 });

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', mobile: '', whatsapp: '',
    job_title: '', department: '', account_id: '',
    address: '', city: '', state: '', country: 'UAE', postal_code: '',
    linkedin: '', twitter: '', notes: '', is_primary: false
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterAccount) params.append('account_id', filterAccount);
      
      const data = await api.get(`/contacts?${params}`);
      if (data.success) {
        setContacts(data.data || []);
        // Calculate stats
        const contactsList = data.data || [];
        setStats({
          total: contactsList.length,
          primary: contactsList.filter(c => c.is_primary === 1).length,
          withEmail: contactsList.filter(c => c.email).length
        });
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      showToast('error', 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [search, filterAccount, showToast]);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.get('/accounts?limit=100');
      if (data.success) setAccounts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, [fetchContacts, fetchAccounts]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      first_name: '', last_name: '', email: '', phone: '', mobile: '', whatsapp: '',
      job_title: '', department: '', account_id: '',
      address: '', city: '', state: '', country: 'UAE', postal_code: '',
      linkedin: '', twitter: '', notes: '', is_primary: false
    });
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      whatsapp: contact.whatsapp || '',
      job_title: contact.job_title || '',
      department: contact.department || '',
      account_id: contact.account_id || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      country: contact.country || 'UAE',
      postal_code: contact.postal_code || '',
      linkedin: contact.linkedin || '',
      twitter: contact.twitter || '',
      notes: contact.notes || '',
      is_primary: contact.is_primary === 1
    });
    setShowModal(true);
  };

  const openViewModal = (contact) => {
    setViewingContact(contact);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.account_id === '') payload.account_id = null;

      const data = editingContact 
        ? await api.patch(`/contacts/${editingContact.id}`, payload)
        : await api.post('/contacts', payload);
      
      if (data.success) {
        showToast('success', data.message);
        fetchContacts();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      console.error('Save contact error:', error);
      showToast('error', 'An error occurred while saving the contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => supportAlert();

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="crm-page">
      <SEO page="contacts" noindex={true} />
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'}
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">⭐</div>
          <div className="stat-info">
            <div className="stat-value">{stats.primary}</div>
            <div className="stat-label">Primary Contacts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">✉️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.withEmail}</div>
            <div className="stat-label">With Email</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <span className="search-icon"><Search width={18} height={18} /></span>
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="filter-select"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} /> New Contact
          </button>
        </div>

        <div className="card-body table-responsive">
          {loading ? (
            <div className="loading-container"><div className="spinner"></div></div>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><User width={48} height={48} /></div>
              <h3>No contacts found</h3>
              <p>Create your first contact to get started</p>
              <button className="btn btn-primary" onClick={openCreateModal}><Plus width={16} height={16} /> New Contact</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Job Title</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="contact-avatar">
                          {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0) || ''}
                        </span>
                        <div>
                          <div className="contact-name">
                            {contact.first_name} {contact.last_name}
                            {contact.is_primary === 1 && <span className="badge badge-primary">Primary</span>}
                          </div>
                          {contact.department && <div className="contact-dept">{contact.department}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="email-link">{contact.email}</a>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="phone-cell">
                        {contact.phone && <span><Phone width={14} height={14} /> {contact.phone}</span>}
                        {contact.mobile && <span><Phone width={14} height={14} /> {contact.mobile}</span>}
                        {!contact.phone && !contact.mobile && '-'}
                      </div>
                    </td>
                    <td>{contact.job_title || '-'}</td>
                    <td>
                      {contact.account_name ? (
                        <span className="account-badge"><Building width={14} height={14} /> {contact.account_name}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn view" onClick={() => openViewModal(contact)} title="View">
                          <Eye width={20} height={20} />
                        </button>
                        <button className="action-btn edit" onClick={() => openEditModal(contact)} title="Edit">
                          <EditPencil width={20} height={20} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(contact)} title="Delete">
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContact ? 'Edit Contact' : 'New Contact'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-section-title">Personal Information</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input type="text" className="form-control" name="first_name" 
                      value={formData.first_name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" name="last_name" 
                      value={formData.last_name} onChange={handleInputChange} />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" name="email" 
                      value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-control" name="phone" 
                      value={formData.phone} onChange={handleInputChange} />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input type="text" className="form-control" name="mobile" 
                      value={formData.mobile} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input type="text" className="form-control" name="whatsapp" 
                      value={formData.whatsapp} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-section-title">Company Information</div>
                <div className="form-group">
                  <label className="form-label">Account</label>
                  <select className="form-control" name="account_id" 
                    value={formData.account_id} onChange={handleInputChange}>
                    <option value="">Select Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input type="text" className="form-control" name="job_title" 
                      value={formData.job_title} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input type="text" className="form-control" name="department" 
                      value={formData.department} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-section-title">Address</div>
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input type="text" className="form-control" name="address" 
                    value={formData.address} onChange={handleInputChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-control" name="city" 
                      value={formData.city} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-control" name="state" 
                      value={formData.state} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="form-control" name="country" 
                      value={formData.country} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input type="text" className="form-control" name="postal_code" 
                      value={formData.postal_code} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-section-title">Social & Notes</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">LinkedIn</label>
                    <input type="text" className="form-control" name="linkedin" 
                      value={formData.linkedin} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Twitter</label>
                    <input type="text" className="form-control" name="twitter" 
                      value={formData.twitter} onChange={handleInputChange} placeholder="@username" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" name="notes" rows="3"
                    value={formData.notes} onChange={handleInputChange}></textarea>
                </div>
                
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" name="is_primary" 
                    checked={formData.is_primary} onChange={handleInputChange} id="isPrimary" />
                  <label htmlFor="isPrimary">⭐ Mark as Primary Contact</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingContact ? 'Update Contact' : 'Create Contact')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && viewingContact && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowViewModal(false); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Contact Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="view-contact-header">
                <div className="view-avatar">
                  {viewingContact.first_name?.charAt(0)}{viewingContact.last_name?.charAt(0) || ''}
                </div>
                <div>
                  <h3>{viewingContact.first_name} {viewingContact.last_name}</h3>
                  {viewingContact.job_title && <p>{viewingContact.job_title}</p>}
                  {viewingContact.is_primary === 1 && <span className="badge badge-primary">Primary Contact</span>}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">📧 Email</span>
                    <span className="detail-value">
                      {viewingContact.email ? (
                        <a href={`mailto:${viewingContact.email}`}>{viewingContact.email}</a>
                      ) : '-'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📞 Phone</span>
                    <span className="detail-value">{viewingContact.phone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📱 Mobile</span>
                    <span className="detail-value">{viewingContact.mobile || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">💬 WhatsApp</span>
                    <span className="detail-value">{viewingContact.whatsapp || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🏢 Account</span>
                    <span className="detail-value">{viewingContact.account_name || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🏛️ Department</span>
                    <span className="detail-value">{viewingContact.department || '-'}</span>
                  </div>
                </div>

                {viewingContact.address && (
                  <div className="detail-item full-width">
                    <span className="detail-label">📍 Address</span>
                    <span className="detail-value">
                      {viewingContact.address}, {viewingContact.city}, {viewingContact.state} {viewingContact.postal_code}, {viewingContact.country}
                    </span>
                  </div>
                )}

                {viewingContact.notes && (
                  <div className="detail-item full-width">
                    <span className="detail-label">📝 Notes</span>
                    <span className="detail-value">{viewingContact.notes}</span>
                  </div>
                )}

                <div className="detail-item">
                  <span className="detail-label">📅 Created</span>
                  <span className="detail-value">{formatDate(viewingContact.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { setShowViewModal(false); openEditModal(viewingContact); }}>
                Edit Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
