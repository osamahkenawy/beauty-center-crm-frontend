import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cube, Search, Plus, EditPencil, Trash, Check, Xmark, WarningTriangle,
  Clock
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import useCurrency from '../hooks/useCurrency';
import { showContactSupport } from '../utils/supportAlert';
import './CRMPages.css';
import './BeautyPages.css';

const SERVICE_CATEGORIES = [
  { value: 'hair', label: 'Hair', icon: '💇' },
  { value: 'nails', label: 'Nails', icon: '💅' },
  { value: 'skin', label: 'Skin & Facial', icon: '💆' },
  { value: 'makeup', label: 'Makeup', icon: '💄' },
  { value: 'spa', label: 'Spa & Massage', icon: '🧖' },
  { value: 'waxing', label: 'Waxing & Hair Removal', icon: '🪒' },
  { value: 'lashes', label: 'Lashes & Brows', icon: '👁️' },
  { value: 'packages', label: 'Packages', icon: '🎁' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export default function BeautyServices() {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ total: 0, active: 0, categories: 0 });

  const emptyForm = {
    name: '', description: '', sku: '', unit_price: '', currency: '',
    category: 'hair', duration: '60', stock_quantity: 0, is_active: true,
  };
  const [formData, setFormData] = useState(emptyForm);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCategory) params.append('category', filterCategory);
      const data = await api.get(`/products?${params}`);
      if (data.success) {
        const list = data.data || [];
        setServices(list);
        const categories = new Set(list.map(s => s.category).filter(Boolean));
        setStats({
          total: list.length,
          active: list.filter(s => s.is_active).length,
          categories: categories.size,
        });
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      sku: item.sku || '',
      unit_price: item.unit_price || '',
      currency: item.currency || 'AED',
      category: item.category || 'hair',
      duration: item.duration || '60',
      stock_quantity: item.stock_quantity || 0,
      is_active: item.is_active === 1 || item.is_active === true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!formData.name || !formData.unit_price) {
        showToast('error', 'Service name and price are required');
        setSaving(false);
        return;
      }
      const payload = { ...formData, unit_price: parseFloat(formData.unit_price) };

      const data = editingItem
        ? await api.patch(`/products/${editingItem.id}`, payload)
        : await api.post('/products', payload);

      if (data.success) {
        showToast('success', data.message || 'Service saved');
        fetchServices();
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

  const handleDelete = () => showContactSupport();

  const getCategoryInfo = (cat) => SERVICE_CATEGORIES.find(c => c.value === cat) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];

  return (
    <div className="crm-page">
      <SEO page="services" />

      {toast.show && (
        <div className={`crm-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check /> : <WarningTriangle />}
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FCE4EC', color: '#E91E63' }}>
            <Cube width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Services</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>
            <Check width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Services</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>
            <Cube width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.categories}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <Search className="search-icon" width={16} height={16} />
              <input type="text" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {SERVICE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} /> Add Service
          </button>
        </div>

        <div className="crm-table-wrapper">
          {loading ? (
            <div className="crm-loading"><div className="loading-spinner"></div><p>Loading services...</p></div>
          ) : services.length === 0 ? (
            <div className="crm-empty">
              <Cube width={48} height={48} />
              <h3>No services found</h3>
              <p>Start adding your beauty services to manage bookings.</p>
              <button className="btn-create" onClick={openCreateModal}><Plus width={18} height={18} /> Add Service</button>
            </div>
          ) : (
            <div className="services-grid-cards">
              {services.map(service => {
                const catInfo = getCategoryInfo(service.category);
                return (
                  <div key={service.id} className={`service-card-item ${!service.is_active ? 'inactive' : ''}`}>
                    <div className="service-card-header">
                      <span className="service-category-icon">{catInfo.icon}</span>
                      <span className="service-category-label" style={{ background: service.is_active ? '#E8F5E9' : '#F5F5F5', color: service.is_active ? '#4CAF50' : '#999' }}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="service-card-name">{service.name}</h3>
                    <p className="service-card-desc">{service.description || 'No description'}</p>
                    <div className="service-card-meta">
                      <span className="service-price">{currency} {parseFloat(service.unit_price || 0).toFixed(0)}</span>
                      {service.duration && (
                        <span className="service-duration"><Clock width={14} height={14} /> {service.duration} min</span>
                      )}
                    </div>
                    <div className="service-card-category">{catInfo.icon} {catInfo.label}</div>
                    <div className="service-card-actions">
                      <button className="action-btn edit" onClick={() => openEditModal(service)} title="Edit">
                        <EditPencil width={14} height={14} />
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(service.id)} title="Delete">
                        <Trash width={14} height={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Service Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" required placeholder="e.g. Haircut & Blowdry" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="form-control">
                    {SERVICE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price ({currency}) *</label>
                  <input type="number" name="unit_price" value={formData.unit_price} onChange={handleInputChange} className="form-control" required min="0" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <select name="duration" value={formData.duration} onChange={handleInputChange} className="form-control">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="150">2.5 hours</option>
                    <option value="180">3 hours</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Code</label>
                  <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="form-control" placeholder="e.g. SVC-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Active</label>
                  <label className="toggle-switch">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows={3} placeholder="Describe the service..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={saving}>
                  {saving ? 'Saving...' : (editingItem ? 'Update Service' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
