import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Badge, OverlayTrigger, Tooltip, ProgressBar } from 'react-bootstrap';
import {
  Package, Plus, Search, Filter, AlertTriangle, TrendingUp, TrendingDown,
  Box, BarChart3, Edit, Truck, ArrowDownUp, RotateCcw, Trash2, Eye,
  ShoppingCart, DollarSign, Archive, X, Check, History, Bell, ChevronDown,
  Upload, Download, Layers, Tag
} from 'lucide-react';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
import api from '../lib/api';
import Swal from 'sweetalert2';
import './Inventory.css';

export default function Inventory() {
  const { symbol, format, currency } = useCurrency();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [branches, setBranches] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Form state
  const [form, setForm] = useState({
    name: '', name_ar: '', sku: '', barcode: '', category: '', brand: '',
    description: '', cost_price: '', retail_price: '', stock_quantity: '',
    low_stock_threshold: 5, unit: 'piece', supplier: '', supplier_contact: '',
    branch_id: '', image_url: '', is_active: 1
  });
  const [stockForm, setStockForm] = useState({ type: 'purchase', quantity: '', unit_cost: '', notes: '' });
  const [editId, setEditId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      if (filterBrand) params.set('brand', filterBrand);
      if (filterStatus) params.set('status', filterStatus);
      if (showLowStock) params.set('low_stock', 'true');

      const [listRes, statsRes] = await Promise.all([
        api.get(`/inventory?${params}`),
        api.get('/inventory/stats')
      ]);

      setItems(listRes?.data || []);
      setStats(statsRes?.data || {});
      setTotalPages(listRes?.pagination?.pages || 1);
      setCategories(listRes?.filters?.categories || []);
      setBrands(listRes?.filters?.brands || []);
    } catch (err) {
      console.error('Load inventory error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterBrand, filterStatus, showLowStock]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get('/branches').then(r => setBranches(r?.data || [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({
      name: '', name_ar: '', sku: '', barcode: '', category: '', brand: '',
      description: '', cost_price: '', retail_price: '', stock_quantity: '',
      low_stock_threshold: 5, unit: 'piece', supplier: '', supplier_contact: '',
      branch_id: '', image_url: '', is_active: 1
    });
    setEditId(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '', name_ar: item.name_ar || '', sku: item.sku || '',
      barcode: item.barcode || '', category: item.category || '', brand: item.brand || '',
      description: item.description || '', cost_price: item.cost_price || '',
      retail_price: item.retail_price || '', stock_quantity: item.stock_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 5, unit: item.unit || 'piece',
      supplier: item.supplier || '', supplier_contact: item.supplier_contact || '',
      branch_id: item.branch_id || '', image_url: item.image_url || '',
      is_active: item.is_active
    });
    setEditId(item.id);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      Swal.fire('Error', 'Product name is required', 'error');
      return;
    }
    try {
      if (editId) {
        await api.patch(`/inventory/${editId}`, form);
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/inventory', form);
        Swal.fire({ icon: 'success', title: 'Created!', timer: 1500, showConfirmButton: false });
      }
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to save', 'error');
    }
  };

  const handleViewDetail = async (item) => {
    try {
      const res = await api.get(`/inventory/${item.id}`);
      setDetailData(res?.data);
      setShowDetailModal(true);
    } catch (err) {
      Swal.fire('Error', 'Failed to load details', 'error');
    }
  };

  const handleStockAdjust = (item) => {
    setSelectedItem(item);
    setStockForm({ type: 'purchase', quantity: '', unit_cost: '', notes: '' });
    setShowStockModal(true);
  };

  const handleStockSave = async () => {
    if (!stockForm.quantity || parseInt(stockForm.quantity) === 0) {
      Swal.fire('Error', 'Quantity is required', 'error');
      return;
    }
    try {
      await api.post(`/inventory/${selectedItem.id}/stock`, stockForm);
      Swal.fire({ icon: 'success', title: 'Stock Updated!', timer: 1500, showConfirmButton: false });
      setShowStockModal(false);
      loadData();
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to update stock', 'error');
    }
  };

  const handleDelete = async (item) => {
    Swal.fire({
      title: 'Deactivate Product?',
      text: 'For complete removal, please contact support at info@trasealla.com',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Deactivate'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/inventory/${item.id}`);
          Swal.fire({ icon: 'success', title: 'Done!', timer: 1500, showConfirmButton: false });
          loadData();
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  };

  const handleViewAlerts = async () => {
    try {
      const res = await api.get('/inventory/alerts');
      setAlerts(res?.data || []);
      setShowAlertsModal(true);
    } catch { /* ignore */ }
  };

  const markAlertsRead = async () => {
    try {
      await api.post('/inventory/alerts/mark-read', {});
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
      loadData();
    } catch { /* ignore */ }
  };

  const getStockBadge = (item) => {
    if (item.stock_quantity === 0) return <Badge bg="danger" className="inv-badge">Out of Stock</Badge>;
    if (item.stock_quantity <= item.low_stock_threshold) return <Badge bg="warning" className="inv-badge">Low Stock</Badge>;
    return <Badge bg="success" className="inv-badge">In Stock</Badge>;
  };

  const getStockLevel = (item) => {
    if (item.stock_quantity === 0) return 0;
    const target = Math.max(item.low_stock_threshold * 3, 20);
    return Math.min((item.stock_quantity / target) * 100, 100);
  };

  const getMargin = (item) => {
    if (!item.cost_price || !item.retail_price || item.cost_price === 0) return null;
    return (((item.retail_price - item.cost_price) / item.retail_price) * 100).toFixed(1);
  };

  return (
    <div className="inv-page">
      {/* Header */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Package size={26} /></div>
          <div>
            <h1 className="module-hero-title">Inventory & Stock</h1>
            <p className="module-hero-sub">Manage retail products, stock levels, and movements</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline" data-tooltip="Low stock alerts" onClick={handleViewAlerts} style={{ position: 'relative' }}>
            <Bell size={16} />
            {stats.unread_alerts > 0 && <span className="inv-alert-count">{stats.unread_alerts}</span>}
            Alerts
          </button>
          <button className="module-btn module-btn-primary" onClick={handleCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="inv-stats-grid">
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(242,66,27,0.1)' }}>
            <Box size={20} color="#f2421b" />
          </div>
          <div>
            <div className="inv-stat-value">{stats.total_products || 0}</div>
            <div className="inv-stat-label">Total Products</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Archive size={20} color="#10b981" />
          </div>
          <div>
            <div className="inv-stat-value">{stats.total_units || 0}</div>
            <div className="inv-stat-label">Total Units</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <div>
            <div className="inv-stat-value">{stats.low_stock || 0}</div>
            <div className="inv-stat-label">Low Stock</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <X size={20} color="#ef4444" />
          </div>
          <div>
            <div className="inv-stat-value">{stats.out_of_stock || 0}</div>
            <div className="inv-stat-label">Out of Stock</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <DollarSign size={20} color="#6366f1" />
          </div>
          <div>
            <div className="inv-stat-value"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline', fontSize: 'inherit', verticalAlign: 'baseline' }} /> {parseFloat(stats.total_retail_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="inv-stat-label">Retail Value</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <TrendingUp size={20} color="#22c55e" />
          </div>
          <div>
            <div className="inv-stat-value">{stats.purchases || 0}</div>
            <div className="inv-stat-label">Purchases (30d)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search-wrap">
          <Search size={16} className="inv-search-icon" />
          <input
            type="text"
            className="inv-search-input"
            placeholder="Search products, SKU, barcode..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="inv-filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="inv-filter-select" value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1); }}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="inv-filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button 
          className={`inv-filter-btn ${showLowStock ? 'active' : ''}`} 
          onClick={() => { setShowLowStock(!showLowStock); setPage(1); }}
        >
          <AlertTriangle size={14} /> Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="inv-empty">
            <Package size={48} strokeWidth={1} />
            <h4>No products found</h4>
            <p>Add your first retail product to get started</p>
            <button className="inv-btn-primary" onClick={handleCreate}>
              <Plus size={16} /> Add Product
            </button>
          </div>
        ) : (
          <table className="inv-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>COST</th>
                <th>PRICE</th>
                <th>MARGIN</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const margin = getMargin(item);
                return (
                  <tr key={item.id} className={item.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                    <td>
                      <div className="inv-product-cell">
                        <div className="inv-product-thumb">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <Package size={20} />
                          )}
                        </div>
                        <div>
                          <div className="inv-product-name">{item.name}</div>
                          {item.brand && <div className="inv-product-brand">{item.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="inv-sku">{item.sku || '—'}</span></td>
                    <td>{item.category || '—'}</td>
                    <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(item.cost_price || 0).toFixed(2)}</td>
                    <td className="inv-price-cell"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(item.retail_price || 0).toFixed(2)}</td>
                    <td>
                      {margin !== null ? (
                        <span className={`inv-margin ${parseFloat(margin) > 30 ? 'good' : parseFloat(margin) > 15 ? 'ok' : 'low'}`}>
                          {margin}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="inv-stock-cell">
                        <span className="inv-stock-qty">{item.stock_quantity}</span>
                        <ProgressBar 
                          now={getStockLevel(item)} 
                          className="inv-stock-bar"
                          variant={item.stock_quantity === 0 ? 'danger' : item.stock_quantity <= item.low_stock_threshold ? 'warning' : 'success'}
                        />
                      </div>
                    </td>
                    <td>{getStockBadge(item)}</td>
                    <td>
                      <div className="inv-actions">
                        <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                          <button className="inv-action-btn" data-tooltip="View details" onClick={() => handleViewDetail(item)}><Eye size={15} /></button>
                        </OverlayTrigger>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Adjust Stock</Tooltip>}>
                          <button className="inv-action-btn stock" data-tooltip="Adjust stock" onClick={() => handleStockAdjust(item)}><ArrowDownUp size={15} /></button>
                        </OverlayTrigger>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                          <button className="inv-action-btn" data-tooltip="Edit item" onClick={() => handleEdit(item)}><Edit size={15} /></button>
                        </OverlayTrigger>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Deactivate</Tooltip>}>
                          <button className="inv-action-btn danger" data-tooltip="Delete item" onClick={() => handleDelete(item)}><Trash2 size={15} /></button>
                        </OverlayTrigger>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="inv-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* ═══ Create/Edit Modal ═══ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? 'Edit Product' : 'Add New Product'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="inv-form-grid">
            <Form.Group>
              <Form.Label>Product Name *</Form.Label>
              <Form.Control value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Moroccan Oil Shampoo" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Arabic Name</Form.Label>
              <Form.Control value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} dir="rtl" />
            </Form.Group>
            <Form.Group>
              <Form.Label>SKU</Form.Label>
              <Form.Control value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="e.g. MOR-SHP-001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Barcode</Form.Label>
              <Form.Control value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Control value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Hair Care" list="inv-categories" />
              <datalist id="inv-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </Form.Group>
            <Form.Group>
              <Form.Label>Brand</Form.Label>
              <Form.Control value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. Moroccan Oil" list="inv-brands" />
              <datalist id="inv-brands">
                {brands.map(b => <option key={b} value={b} />)}
              </datalist>
            </Form.Group>
            <Form.Group>
              <Form.Label>Cost Price (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Retail Price (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={form.retail_price} onChange={e => setForm({...form, retail_price: e.target.value})} />
            </Form.Group>
            {!editId && (
              <Form.Group>
                <Form.Label>Initial Stock</Form.Label>
                <Form.Control type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} />
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>Low Stock Alert</Form.Label>
              <Form.Control type="number" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: e.target.value})} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Unit</Form.Label>
              <Form.Select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="piece">Piece</option>
                <option value="bottle">Bottle</option>
                <option value="tube">Tube</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="set">Set</option>
                <option value="ml">mL</option>
                <option value="g">Gram</option>
                <option value="kg">Kg</option>
                <option value="l">Liter</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Branch</Form.Label>
              <Form.Select value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Supplier</Form.Label>
              <Form.Control value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Supplier Contact</Form.Label>
              <Form.Control value={form.supplier_contact} onChange={e => setForm({...form, supplier_contact: e.target.value})} />
            </Form.Group>
            <Form.Group className="span-2">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="inv-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'}</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Stock Adjustment Modal ═══ */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>Adjust Stock — {selectedItem?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="inv-stock-current">
            <span>Current Stock:</span>
            <strong>{selectedItem?.stock_quantity} {selectedItem?.unit}(s)</strong>
          </div>
          <Form.Group className="mb-3">
            <Form.Label>Movement Type</Form.Label>
            <Form.Select value={stockForm.type} onChange={e => setStockForm({...stockForm, type: e.target.value})}>
              <option value="purchase">📦 Purchase (Add Stock)</option>
              <option value="sale">🛒 Sale (Remove Stock)</option>
              <option value="adjustment">📋 Adjustment (Set to Exact)</option>
              <option value="return">↩️ Return (Add Back)</option>
              <option value="damage">💔 Damage (Remove)</option>
              <option value="expired">⏰ Expired (Remove)</option>
              <option value="transfer">🔄 Transfer (Remove from Here)</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Quantity *</Form.Label>
            <Form.Control
              type="number"
              value={stockForm.quantity}
              onChange={e => setStockForm({...stockForm, quantity: e.target.value})}
              placeholder={stockForm.type === 'adjustment' ? 'New total quantity' : 'Number of units'}
            />
          </Form.Group>
          {(stockForm.type === 'purchase') && (
            <Form.Group className="mb-3">
              <Form.Label>Unit Cost (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={stockForm.unit_cost} onChange={e => setStockForm({...stockForm, unit_cost: e.target.value})} />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={stockForm.notes} onChange={e => setStockForm({...stockForm, notes: e.target.value})} placeholder="Optional reason..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button className="inv-btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleStockSave}>Update Stock</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Detail Modal ═══ */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>Product Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailData && (
            <div className="inv-detail">
              <div className="inv-detail-header">
                <div className="inv-detail-thumb">
                  {detailData.image_url ? <img src={detailData.image_url} alt={detailData.name} /> : <Package size={40} />}
                </div>
                <div>
                  <h4>{detailData.name}</h4>
                  {detailData.name_ar && <p className="text-muted">{detailData.name_ar}</p>}
                  <div className="inv-detail-meta">
                    {detailData.sku && <span><Tag size={13} /> SKU: {detailData.sku}</span>}
                    {detailData.barcode && <span>Barcode: {detailData.barcode}</span>}
                    {detailData.brand && <span>Brand: {detailData.brand}</span>}
                    {detailData.category && <span><Layers size={13} /> {detailData.category}</span>}
                  </div>
                </div>
                <div className="inv-detail-stock">
                  {getStockBadge(detailData)}
                  <div className="inv-detail-qty">{detailData.stock_quantity} {detailData.unit}(s)</div>
                </div>
              </div>

              <div className="inv-detail-prices">
                <div className="inv-detail-price">
                  <span>Cost Price</span>
                  <strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(detailData.cost_price || 0).toFixed(2)}</strong>
                </div>
                <div className="inv-detail-price">
                  <span>Retail Price</span>
                  <strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(detailData.retail_price || 0).toFixed(2)}</strong>
                </div>
                <div className="inv-detail-price">
                  <span>Margin</span>
                  <strong>{getMargin(detailData) || '—'}%</strong>
                </div>
                <div className="inv-detail-price">
                  <span>Stock Value</span>
                  <strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {(detailData.stock_quantity * (detailData.retail_price || 0)).toFixed(2)}</strong>
                </div>
              </div>

              {detailData.supplier && (
                <div className="inv-detail-supplier">
                  <Truck size={16} />
                  <span>{detailData.supplier}{detailData.supplier_contact ? ` — ${detailData.supplier_contact}` : ''}</span>
                </div>
              )}

              {detailData.description && (
                <div className="inv-detail-desc">
                  <p>{detailData.description}</p>
                </div>
              )}

              {/* Movement History */}
              <h6 className="inv-detail-section-title"><History size={16} /> Recent Stock Movements</h6>
              {detailData.movements && detailData.movements.length > 0 ? (
                <table className="inv-movements-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Before → After</th>
                      <th>By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.movements.map(m => (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleDateString()}</td>
                        <td>
                          <Badge bg={
                            m.type === 'purchase' ? 'success' : 
                            m.type === 'sale' ? 'primary' : 
                            m.type === 'return' ? 'info' :
                            m.type === 'damage' || m.type === 'expired' ? 'danger' : 'secondary'
                          }>{m.type}</Badge>
                        </td>
                        <td>{m.type === 'sale' || m.type === 'damage' || m.type === 'expired' ? '-' : '+'}{m.quantity}</td>
                        <td>{m.previous_quantity} → {m.new_quantity}</td>
                        <td>{m.staff_first_name ? `${m.staff_first_name} ${m.staff_last_name || ''}` : '—'}</td>
                        <td>{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted text-center py-3">No stock movements recorded yet</p>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ═══ Alerts Modal ═══ */}
      <Modal show={showAlertsModal} onHide={() => setShowAlertsModal(false)} centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title><Bell size={18} /> Stock Alerts</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alerts.length === 0 ? (
            <p className="text-center text-muted py-4">No alerts</p>
          ) : (
            <>
              <div className="inv-alerts-actions">
                <button className="inv-btn-sm" onClick={markAlertsRead}>Mark All as Read</button>
              </div>
              {alerts.map(a => (
                <div key={a.id} className={`inv-alert-item ${a.is_read ? 'read' : ''}`}>
                  <AlertTriangle size={16} color={a.alert_type === 'out_of_stock' ? '#ef4444' : '#f59e0b'} />
                  <div>
                    <strong>{a.product_name || 'Product'}</strong>
                    <p>{a.message}</p>
                    <small>{new Date(a.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
