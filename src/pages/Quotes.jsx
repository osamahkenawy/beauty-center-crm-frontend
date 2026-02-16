import { useState, useEffect, useCallback } from 'react';
import {
  Page, Plus, Search, EditPencil, Trash, Eye, 
  Calendar, Building, DollarCircle, Check, Xmark,
  FilterList, Send, Clock, Wallet
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import useCurrency from '../hooks/useCurrency';
import './Quotes.css';

export default function Quotes() {
  const { currency: tenantCurrency } = useCurrency();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [accounts, setAccounts] = useState([]);
  const [deals, setDeals] = useState([]);

  const [formData, setFormData] = useState({
    subject: '', deal_id: '', account_id: '', valid_until: '', status: 'draft',
    subtotal: 0, discount: 0, tax: 0, total: 0, currency: '', notes: '', terms: ''
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const data = await api.get(`/quotes?${params}`);
      if (data.success) setQuotes(data.data || []);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchRelated = useCallback(async () => {
    try {
      const [accData, dealData] = await Promise.all([
        api.get('/accounts'),
        api.get('/deals')
      ]);
      if (accData.success) setAccounts(accData.data || []);
      if (dealData.success) setDeals(dealData.data || []);
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    fetchRelated();
  }, [fetchQuotes, fetchRelated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (['subtotal', 'discount', 'tax'].includes(name)) {
        const subtotal = parseFloat(updated.subtotal) || 0;
        const discount = parseFloat(updated.discount) || 0;
        const tax = parseFloat(updated.tax) || 0;
        updated.total = subtotal - discount + tax;
      }
      return updated;
    });
  };

  const openCreateModal = () => {
    setEditingQuote(null);
    setFormData({
      subject: '', deal_id: '', account_id: '', valid_until: '', status: 'draft',
      subtotal: 0, discount: 0, tax: 0, total: 0, currency: tenantCurrency, notes: '', terms: ''
    });
    setShowModal(true);
  };

  const openEditModal = (quote) => {
    setEditingQuote(quote);
    setFormData({
      subject: quote.subject || '', deal_id: quote.deal_id || '', account_id: quote.account_id || '',
      valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
      status: quote.status || 'draft', subtotal: quote.subtotal || 0, discount: quote.discount || 0,
      tax: quote.tax || 0, total: quote.total || 0, currency: quote.currency || tenantCurrency,
      notes: quote.notes || '', terms: quote.terms || ''
    });
    setShowModal(true);
  };

  const openViewModal = (quote) => {
    setViewingQuote(quote);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        deal_id: formData.deal_id || null,
        account_id: formData.account_id || null
      };
      
      const data = editingQuote 
        ? await api.patch(`/quotes/${editingQuote.id}`, payload)
        : await api.post('/quotes', payload);

      if (data.success) {
        showToast('success', data.message);
        fetchQuotes();
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

  const filteredQuotes = quotes.filter(q =>
    q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.toLowerCase().includes(search.toLowerCase()) ||
    q.account_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount, currency) => {
    currency = currency || tenantCurrency || 'AED';
    // formatCurrency override
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    return { draft: 'secondary', sent: 'info', accepted: 'success', rejected: 'danger', revised: 'warning' }[status] || 'secondary';
  };

  // Calculate stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalValue: quotes.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0)
  };

  return (
    <div className="quotes-page">
      <SEO page="quotes" noindex={true} />
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check width={16} height={16} /> : <Xmark width={16} height={16} />}
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Page width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Quotes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.draft}</div>
            <div className="stat-label">Drafts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <Send width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.sent}</div>
            <div className="stat-label">Sent</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <Wallet width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stat-label">Total Value</div>
          </div>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="page-card">
        <div className="card-header">
          <div className="header-left">
            <h2>Quotes</h2>
            <span className="count-badge">{quotes.length}</span>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            <span>New Quote</span>
          </button>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <Search width={18} height={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search quotes..."
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
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Page width={48} height={48} />
              </div>
              <h3>No quotes found</h3>
              <p>Create your first quote to get started</p>
              <button className="btn-create" onClick={openCreateModal}>
                <Plus width={18} height={18} />
                <span>New Quote</span>
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <div className="quote-cell">
                        <div className="quote-avatar">
                          <Page width={18} height={18} />
                        </div>
                        <div className="quote-info">
                          <div className="quote-number">{quote.quote_number}</div>
                          <div className="quote-subject">{quote.subject || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {quote.account_name ? (
                        <div className="account-link">
                          <Building width={14} height={14} />
                          <span>{quote.account_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="amount-cell">
                        <span className="amount">{formatCurrency(quote.total, quote.currency)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        {quote.valid_until ? (
                          <>
                            <Calendar width={14} height={14} />
                            <span>{new Date(quote.valid_until).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn view" 
                          onClick={() => openViewModal(quote)}
                          title="View Details"
                        >
                          <Eye width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn edit" 
                          onClick={() => openEditModal(quote)}
                          title="Edit"
                        >
                          <EditPencil width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDelete(quote)}
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
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingQuote ? 'Edit Quote' : 'New Quote'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Page width={14} height={14} />
                      Subject
                    </label>
                    <input 
                      type="text" 
                      name="subject" 
                      className="form-input" 
                      value={formData.subject} 
                      onChange={handleInputChange}
                      placeholder="Quote subject"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      name="status" 
                      className="form-input" 
                      value={formData.status} 
                      onChange={handleInputChange}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="revised">Revised</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Building width={14} height={14} />
                      Account
                    </label>
                    <select 
                      name="account_id" 
                      className="form-input" 
                      value={formData.account_id} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <DollarCircle width={14} height={14} />
                      Deal
                    </label>
                    <select 
                      name="deal_id" 
                      className="form-input" 
                      value={formData.deal_id} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select Deal</option>
                      {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Calendar width={14} height={14} />
                      Valid Until
                    </label>
                    <input 
                      type="date" 
                      name="valid_until" 
                      className="form-input" 
                      value={formData.valid_until} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select 
                      name="currency" 
                      className="form-input" 
                      value={formData.currency} 
                      onChange={handleInputChange}
                    >
                      <option value={tenantCurrency}>{tenantCurrency} (Default)</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Pricing</h4>
                  <div className="pricing-grid">
                    <div className="form-group">
                      <label className="form-label">Subtotal</label>
                      <input 
                        type="number" 
                        name="subtotal" 
                        className="form-input" 
                        value={formData.subtotal} 
                        onChange={handleInputChange} 
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discount</label>
                      <input 
                        type="number" 
                        name="discount" 
                        className="form-input" 
                        value={formData.discount} 
                        onChange={handleInputChange} 
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tax</label>
                      <input 
                        type="number" 
                        name="tax" 
                        className="form-input" 
                        value={formData.tax} 
                        onChange={handleInputChange} 
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total</label>
                      <input 
                        type="number" 
                        name="total" 
                        className="form-input total-input" 
                        value={formData.total} 
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea 
                    name="notes" 
                    className="form-input" 
                    value={formData.notes} 
                    onChange={handleInputChange} 
                    rows={2}
                    placeholder="Internal notes..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Terms & Conditions</label>
                  <textarea 
                    name="terms" 
                    className="form-input" 
                    value={formData.terms} 
                    onChange={handleInputChange} 
                    rows={2}
                    placeholder="Quote terms and conditions..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingQuote ? 'Update Quote' : 'Create Quote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingQuote && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quote Details</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="view-header">
                <div className="view-avatar">
                  <Page width={28} height={28} />
                </div>
                <div className="view-title">
                  <h2>{viewingQuote.quote_number}</h2>
                  <span className={`status-badge status-${getStatusColor(viewingQuote.status)}`}>
                    {viewingQuote.status}
                  </span>
                </div>
              </div>

              <div className="view-grid">
                <div className="view-section">
                  <h4>Quote Information</h4>
                  <div className="view-item">
                    <Page width={16} height={16} />
                    <div>
                      <label>Subject</label>
                      <p>{viewingQuote.subject || '-'}</p>
                    </div>
                  </div>
                  <div className="view-item">
                    <Building width={16} height={16} />
                    <div>
                      <label>Account</label>
                      <p>{viewingQuote.account_name || '-'}</p>
                    </div>
                  </div>
                  <div className="view-item">
                    <Calendar width={16} height={16} />
                    <div>
                      <label>Valid Until</label>
                      <p>{viewingQuote.valid_until ? new Date(viewingQuote.valid_until).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="view-section">
                  <h4>Pricing Details</h4>
                  <div className="pricing-summary">
                    <div className="price-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(viewingQuote.subtotal, viewingQuote.currency)}</span>
                    </div>
                    <div className="price-row discount">
                      <span>Discount</span>
                      <span>-{formatCurrency(viewingQuote.discount, viewingQuote.currency)}</span>
                    </div>
                    <div className="price-row">
                      <span>Tax</span>
                      <span>{formatCurrency(viewingQuote.tax, viewingQuote.currency)}</span>
                    </div>
                    <div className="price-row total">
                      <span>Total</span>
                      <span>{formatCurrency(viewingQuote.total, viewingQuote.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {(viewingQuote.notes || viewingQuote.terms) && (
                <div className="view-notes">
                  {viewingQuote.notes && (
                    <div className="note-block">
                      <h4>Notes</h4>
                      <p>{viewingQuote.notes}</p>
                    </div>
                  )}
                  {viewingQuote.terms && (
                    <div className="note-block">
                      <h4>Terms & Conditions</h4>
                      <p>{viewingQuote.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => {
                setShowViewModal(false);
                openEditModal(viewingQuote);
              }}>
                <EditPencil width={16} height={16} />
                Edit Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
