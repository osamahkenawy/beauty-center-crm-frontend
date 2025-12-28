import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Package, Plus, EditPencil, Trash, Check, Dollar } from 'iconoir-react';
import './CRMPages.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', description: '', sku: '', unit_price: '', currency: 'AED', category: '', is_active: true
  });

  const categories = ['Software', 'Hardware', 'Service', 'Subscription', 'Consulting', 'Training', 'Support', 'Other'];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/products');
      if (data.success) setProducts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showToast('error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', sku: '', unit_price: '', currency: 'AED', category: '', is_active: true });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      sku: product.sku || '',
      unit_price: product.unit_price || '',
      currency: product.currency || 'AED',
      category: product.category || '',
      is_active: product.is_active === 1 || product.is_active === true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Product name is required');
      return;
    }
    
    setSaving(true);
    try {
      const data = editingProduct
        ? await api.patch(`/products/${editingProduct.id}`, formData)
        : await api.post('/products', formData);
        
      if (data.success) {
        showToast('success', data.message || (editingProduct ? 'Product updated' : 'Product created'));
        fetchProducts();
        setShowModal(false);
      } else {
        showToast('error', data.message || 'Operation failed');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    try {
      const data = await api.delete(`/products/${product.id}`);
      if (data.success) {
        showToast('success', 'Product deleted successfully');
        fetchProducts();
      } else {
        showToast('error', data.message || 'Failed to delete');
      }
    } catch (error) {
      showToast('error', 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount, currency = 'AED') => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0);
  };

  // Get unique categories from products
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Stats
  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.unit_price) || 0), 0);
  const activeProducts = products.filter(p => p.is_active === 1 || p.is_active === true).length;

  return (
    <div className="crm-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'}
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(36, 64, 102, 0.1)', color: '#244066' }}>
            <Package width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Total Products</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(40, 199, 111, 0.1)', color: '#28c76f' }}>
            <Check width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{activeProducts}</div>
            <div className="stat-label">Active Products</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(242, 66, 27, 0.1)', color: '#f2421b' }}>
            <Dollar width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(totalValue)}</div>
            <div className="stat-label">Total Value</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(115, 103, 240, 0.1)', color: '#7367f0' }}>
            <Package width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{uniqueCategories.length}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            Add Product
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <Package width={64} height={64} className="empty-icon" />
            <h3>No products found</h3>
            <p>{search || categoryFilter ? 'Try adjusting your filters' : 'Add your first product to get started'}</p>
            {!search && !categoryFilter && (
              <button className="btn-create" onClick={openCreateModal} style={{ marginTop: '16px' }}>
                <Plus width={18} height={18} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-info">
                        <div className="product-icon" style={{ 
                          background: product.is_active ? 'rgba(36, 64, 102, 0.1)' : 'rgba(130, 134, 139, 0.1)',
                          color: product.is_active ? '#244066' : '#82868b'
                        }}>
                          <Package width={20} height={20} />
                        </div>
                        <div>
                          <div className="product-name">{product.name}</div>
                          {product.description && (
                            <div className="product-desc">{product.description.substring(0, 50)}{product.description.length > 50 ? '...' : ''}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><code className="sku-code">{product.sku || '-'}</code></td>
                    <td className="price-cell">{formatCurrency(product.unit_price, product.currency)}</td>
                    <td>
                      {product.category ? (
                        <span className="category-badge">{product.category}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${product.is_active === 1 || product.is_active === true ? 'active' : 'inactive'}`}>
                        {product.is_active === 1 || product.is_active === true ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button 
                          className="action-btn edit" 
                          onClick={() => openEditModal(product)}
                          title="Edit product"
                        >
                          <EditPencil width={20} height={20} />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDelete(product)}
                          title="Delete product"
                        >
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    required 
                    placeholder="Enter product name"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    rows={3}
                    placeholder="Product description..."
                  ></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU</label>
                    <input 
                      type="text" 
                      name="sku" 
                      value={formData.sku} 
                      onChange={handleInputChange} 
                      className="form-control"
                      placeholder="e.g., PROD-001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      name="category" 
                      value={formData.category} 
                      onChange={handleInputChange} 
                      className="form-control"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price *</label>
                    <input 
                      type="number" 
                      name="unit_price" 
                      value={formData.unit_price} 
                      onChange={handleInputChange} 
                      className="form-control" 
                      required 
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select 
                      name="currency" 
                      value={formData.currency} 
                      onChange={handleInputChange} 
                      className="form-control"
                    >
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={formData.is_active} 
                      onChange={handleInputChange} 
                    />
                    <span>Active Product</span>
                  </label>
                  <small className="form-hint">Inactive products won't appear in quotes and deals</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .product-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .product-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .product-name {
          font-weight: 600;
          color: var(--gray-900);
        }
        .product-desc {
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 2px;
        }
        .sku-code {
          background: var(--gray-100);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: var(--gray-700);
        }
        .price-cell {
          font-weight: 600;
          color: var(--gray-900);
        }
        .category-badge {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(115, 103, 240, 0.1);
          color: #7367f0;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.active {
          background: rgba(40, 199, 111, 0.15);
          color: #28c76f;
        }
        .status-badge.inactive {
          background: rgba(130, 134, 139, 0.15);
          color: #82868b;
        }
        .table-responsive {
          overflow-x: auto;
          padding: 0 20px 20px;
        }
        .form-hint {
          display: block;
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 4px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
