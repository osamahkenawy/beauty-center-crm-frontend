import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Badge, OverlayTrigger, Tooltip, ProgressBar } from 'react-bootstrap';
import {
  Package, Plus, Search, AlertTriangle, TrendingUp,
  Box, BarChart3, Edit, Truck, ArrowDownUp, Trash2, Eye,
  DollarSign, Archive, X, Check, History, Bell,
  Layers, Tag, Building2, ClipboardList, RefreshCw, Boxes, Clock
} from 'lucide-react';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
import LocationPicker from './settings/LocationPicker';
import api from '../lib/api';
import Swal from 'sweetalert2';
import './Inventory.css';

const PO_STATUS_COLOR = {
  draft: 'secondary', ordered: 'primary', partial: 'warning',
  received: 'success', cancelled: 'danger'
};

export default function Inventory() {
  const { symbol, format, currency } = useCurrency();
  const [activeTab, setActiveTab] = useState('products');

  // ── Products state ─────────────────────────────────────────────────────
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

  // Product modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const emptyForm = {
    name: '', name_ar: '', sku: '', barcode: '', category: '', brand: '',
    description: '', cost_price: '', retail_price: '', stock_quantity: '',
    low_stock_threshold: 5, unit: 'piece', supplier: '', supplier_contact: '',
    supplier_id: '', branch_id: '', image_url: '', is_active: 1,
    expiry_date: '', batch_number: '', reorder_point: 0, reorder_quantity: 0
  };
  const [form, setForm] = useState(emptyForm);
  const [stockForm, setStockForm] = useState({ type: 'purchase', quantity: '', unit_cost: '', notes: '' });
  const [editId, setEditId] = useState(null);

  // ── Suppliers state ─────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [suppSearch, setSuppSearch] = useState('');
  const [suppLoading, setSuppLoading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editSuppId, setEditSuppId] = useState(null);
  const emptySuppForm = { name: '', contact_name: '', email: '', phone: '', address: '', city: '', country: '', payment_terms: 'net_30', notes: '', latitude: '', longitude: '' };
  const [suppForm, setSuppForm] = useState(emptySuppForm);

  // ── Purchase Orders state ───────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [poLoading, setPOLoading] = useState(false);
  const [filterPOStatus, setFilterPOStatus] = useState('');
  const [showPOModal, setShowPOModal] = useState(false);
  const [showPODetail, setShowPODetail] = useState(false);
  const [poDetail, setPODetail] = useState(null);
  const emptyPOForm = {
    supplier_id: '', ordered_at: new Date().toISOString().slice(0, 10),
    expected_at: '', tax_amount: 0, shipping_cost: 0, notes: '',
    items: [{ inventory_id: '', quantity_ordered: 1, unit_cost: '', batch_number: '', expiry_date: '', notes: '' }]
  };
  const [poForm, setPOForm] = useState(emptyPOForm);

  // ── Reports state ───────────────────────────────────────────────────────
  const [reportTab, setReportTab] = useState('valuation');
  const [reportLoading, setReportLoading] = useState(false);
  const [valuation, setValuation] = useState(null);
  const [turnover, setTurnover] = useState([]);
  const [aging, setAging] = useState([]);
  const [reorderList, setReorderList] = useState([]);
  const [turnoverDays, setTurnoverDays] = useState(30);

  // ── Data loaders ───────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
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

  const loadSuppliers = useCallback(async () => {
    try {
      setSuppLoading(true);
      const params = suppSearch ? `?search=${encodeURIComponent(suppSearch)}` : '';
      const res = await api.get(`/inventory/suppliers${params}`);
      setSuppliers(res?.data || []);
    } catch (err) { console.error('Load suppliers error:', err); } finally { setSuppLoading(false); }
  }, [suppSearch]);

  const loadOrders = useCallback(async () => {
    try {
      setPOLoading(true);
      const params = filterPOStatus ? `?status=${filterPOStatus}` : '';
      const res = await api.get(`/inventory/purchase-orders${params}`);
      setOrders(res?.data || []);
    } catch (err) { console.error('Load POs error:', err); } finally { setPOLoading(false); }
  }, [filterPOStatus]);

  const loadValuation = async () => {
    try { const res = await api.get('/inventory/reports/valuation'); setValuation(res?.data || null); }
    catch (err) { console.error('Valuation error:', err); }
  };
  const loadTurnover = async () => {
    try { const res = await api.get(`/inventory/reports/turnover?days=${turnoverDays}`); setTurnover(res?.data || []); }
    catch (err) { console.error('Turnover error:', err); }
  };
  const loadAging = async () => {
    try { const res = await api.get('/inventory/reports/aging'); setAging(res?.data || []); }
    catch (err) { console.error('Aging error:', err); }
  };
  const loadReorderList = async () => {
    try { const res = await api.get('/inventory/reorder-suggestions'); setReorderList(res?.data || []); }
    catch (err) { console.error('Reorder error:', err); }
  };
  const loadReports = async () => {
    setReportLoading(true);
    await Promise.all([loadValuation(), loadTurnover(), loadAging(), loadReorderList()]);
    setReportLoading(false);
  };

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { api.get('/branches').then(r => setBranches(r?.data || [])).catch(() => {}); }, []);
  useEffect(() => { loadSuppliers(); }, []); // always load suppliers so product form dropdown works
  useEffect(() => { if (activeTab === 'suppliers') loadSuppliers(); }, [activeTab, loadSuppliers]);
  useEffect(() => { if (activeTab === 'purchase-orders') { loadSuppliers(); loadOrders(); } }, [activeTab, loadOrders]);
  useEffect(() => { if (activeTab === 'reports') loadReports(); }, [activeTab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'reports' && reportTab === 'turnover') loadTurnover(); }, [turnoverDays]);

  // ── Product handlers ────────────────────────────────────────────────────
  const resetForm = () => { setForm(emptyForm); setEditId(null); };
  const handleCreate = () => { resetForm(); setShowCreateModal(true); };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '', name_ar: item.name_ar || '', sku: item.sku || '',
      barcode: item.barcode || '', category: item.category || '', brand: item.brand || '',
      description: item.description || '', cost_price: item.cost_price || '',
      retail_price: item.retail_price || '', stock_quantity: item.stock_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 5, unit: item.unit || 'piece',
      supplier: item.supplier || '', supplier_contact: item.supplier_contact || '',
      supplier_id: item.supplier_id ? String(item.supplier_id) : '', branch_id: item.branch_id || '',
      image_url: item.image_url || '', is_active: item.is_active,
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      batch_number: item.batch_number || '',
      reorder_point: item.reorder_point || 0, reorder_quantity: item.reorder_quantity || 0
    });
    setEditId(item.id);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { Swal.fire('Error', 'Product name is required', 'error'); return; }
    try {
      if (editId) {
        await api.patch(`/inventory/${editId}`, form);
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/inventory', form);
        Swal.fire({ icon: 'success', title: 'Created!', timer: 1500, showConfirmButton: false });
      }
      setShowCreateModal(false); resetForm(); loadProducts();
    } catch (err) { Swal.fire('Error', err.message || 'Failed to save', 'error'); }
  };

  const handleViewDetail = async (item) => {
    try {
      const res = await api.get(`/inventory/${item.id}`);
      setDetailData(res?.data); setShowDetailModal(true);
    } catch (err) { Swal.fire('Error', 'Failed to load details', 'error'); }
  };

  const handleStockAdjust = (item) => {
    setSelectedItem(item);
    setStockForm({ type: 'purchase', quantity: '', unit_cost: '', notes: '' });
    setShowStockModal(true);
  };

  const handleStockSave = async () => {
    if (!stockForm.quantity || parseInt(stockForm.quantity) === 0) {
      Swal.fire('Error', 'Quantity is required', 'error'); return;
    }
    try {
      await api.post(`/inventory/${selectedItem.id}/stock`, stockForm);
      Swal.fire({ icon: 'success', title: 'Stock Updated!', timer: 1500, showConfirmButton: false });
      setShowStockModal(false); loadProducts();
    } catch (err) { Swal.fire('Error', err.message || 'Failed to update stock', 'error'); }
  };

  const handleDelete = async (item) => {
    Swal.fire({
      title: 'Deactivate Product?',
      text: 'For complete removal, please contact support at info@trasealla.com',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#f2421b', confirmButtonText: 'Deactivate'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/inventory/${item.id}`);
          Swal.fire({ icon: 'success', title: 'Done!', timer: 1500, showConfirmButton: false });
          loadProducts();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    });
  };

  const handleViewAlerts = async () => {
    try { const res = await api.get('/inventory/alerts'); setAlerts(res?.data || []); setShowAlertsModal(true); }
    catch { /* ignore */ }
  };

  const markAlertsRead = async () => {
    try {
      await api.post('/inventory/alerts/mark-read', {});
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
      loadProducts();
    } catch { /* ignore */ }
  };

  // ── Supplier handlers ────────────────────────────────────────────────────
  const handleCreateSupplier = () => { setSuppForm(emptySuppForm); setEditSuppId(null); setShowSupplierModal(true); };

  const handleEditSupplier = (s) => {
    setSuppForm({ name: s.name || '', contact_name: s.contact_name || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '', city: s.city || '',
      country: s.country || '', payment_terms: s.payment_terms || 'net_30', notes: s.notes || '',
      latitude: s.latitude || '', longitude: s.longitude || '' });
    setEditSuppId(s.id); setShowSupplierModal(true);
  };

  const handleSaveSupplier = async () => {
    if (!suppForm.name) { Swal.fire('Error', 'Supplier name is required', 'error'); return; }
    try {
      if (editSuppId) {
        await api.patch(`/inventory/suppliers/${editSuppId}`, suppForm);
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/inventory/suppliers', suppForm);
        Swal.fire({ icon: 'success', title: 'Created!', timer: 1500, showConfirmButton: false });
      }
      setShowSupplierModal(false); loadSuppliers();
    } catch (err) { Swal.fire('Error', err.message || 'Failed to save', 'error'); }
  };

  const handleDeleteSupplier = async (s) => {
    Swal.fire({ title: `Deactivate ${s.name}?`, icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#f2421b', confirmButtonText: 'Deactivate' })
    .then(async (r) => {
      if (r.isConfirmed) {
        try { await api.delete(`/inventory/suppliers/${s.id}`);
          Swal.fire({ icon: 'success', title: 'Done!', timer: 1500, showConfirmButton: false });
          loadSuppliers();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    });
  };

  // ── Purchase Order handlers ───────────────────────────────────────────────
  const handleCreatePO = () => { setPOForm(emptyPOForm); setShowPOModal(true); };

  const addPOLine = () => setPOForm(f => ({
    ...f, items: [...f.items, { inventory_id: '', quantity_ordered: 1, unit_cost: '', batch_number: '', expiry_date: '', notes: '' }]
  }));

  const removePOLine = (idx) => setPOForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updatePOLine = (idx, field, value) => {
    setPOForm(f => {
      const its = [...f.items];
      its[idx] = { ...its[idx], [field]: value };
      if (field === 'inventory_id') {
        const prod = items.find(p => p.id === parseInt(value));
        if (prod) its[idx].unit_cost = prod.cost_price || '';
      }
      return { ...f, items: its };
    });
  };

  const poSubtotal = poForm.items.reduce((s, i) =>
    s + (parseFloat(i.unit_cost || 0) * parseInt(i.quantity_ordered || 0)), 0);
  const poTotal = poSubtotal + parseFloat(poForm.tax_amount || 0) + parseFloat(poForm.shipping_cost || 0);

  const handleSavePO = async () => {
    if (!poForm.supplier_id) { Swal.fire('Error', 'Select a supplier', 'error'); return; }
    if (poForm.items.some(i => !i.inventory_id || !i.unit_cost)) {
      Swal.fire('Error', 'All lines need a product and unit cost', 'error'); return;
    }
    try {
      await api.post('/inventory/purchase-orders', poForm);
      Swal.fire({ icon: 'success', title: 'Purchase Order Created!', timer: 1800, showConfirmButton: false });
      setShowPOModal(false); loadOrders(); loadProducts();
    } catch (err) { Swal.fire('Error', err.message || 'Failed to create PO', 'error'); }
  };

  const handleViewPO = async (po) => {
    try { const res = await api.get(`/inventory/purchase-orders/${po.id}`); setPODetail(res?.data); setShowPODetail(true); }
    catch (err) { Swal.fire('Error', 'Failed to load PO details', 'error'); }
  };

  const handleReceivePO = async (po) => {
    Swal.fire({ title: `Receive PO ${po.po_number}?`, icon: 'question',
      text: 'This will add all outstanding quantities to your stock.',
      showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'Receive All'
    }).then(async (r) => {
      if (r.isConfirmed) {
        try { await api.post(`/inventory/purchase-orders/${po.id}/receive`, {});
          Swal.fire({ icon: 'success', title: 'Stock Updated!', timer: 1800, showConfirmButton: false });
          loadOrders(); loadProducts();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    });
  };

  const handleCancelPO = async (po) => {
    Swal.fire({ title: `Cancel PO ${po.po_number}?`, icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#f2421b', confirmButtonText: 'Cancel PO' })
    .then(async (r) => {
      if (r.isConfirmed) {
        try { await api.post(`/inventory/purchase-orders/${po.id}/cancel`, {});
          Swal.fire({ icon: 'success', title: 'PO Cancelled', timer: 1500, showConfirmButton: false });
          loadOrders();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
      }
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      {/* Header */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Package size={26} /></div>
          <div>
            <h1 className="module-hero-title">Inventory & Stock</h1>
            <p className="module-hero-sub">Manage products, suppliers, purchase orders and stock insights</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline" onClick={handleViewAlerts} style={{ position: 'relative' }}>
            <Bell size={16} />
            {stats.unread_alerts > 0 && <span className="inv-alert-count">{stats.unread_alerts}</span>}
            Alerts
          </button>
          <button className="module-btn module-btn-outline" onClick={handleCreateSupplier}>
            <Building2 size={16} /> Add Supplier
          </button>
          {activeTab === 'products' && (
            <button className="module-btn module-btn-primary" onClick={handleCreate}><Plus size={16} /> Add Product</button>
          )}
          {activeTab === 'suppliers' && (
            <button className="module-btn module-btn-primary" onClick={handleCreateSupplier}><Plus size={16} /> Add Supplier</button>
          )}
          {activeTab === 'purchase-orders' && (
            <button className="module-btn module-btn-primary" onClick={handleCreatePO}><Plus size={16} /> New PO</button>
          )}
          {activeTab === 'reports' && (
            <button className="module-btn module-btn-outline" onClick={loadReports}><RefreshCw size={16} /> Refresh</button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="inv-stats-grid">
        {[
          { label: 'Total Products', icon: Box, iconColor: '#f2421b', iconBg: 'rgba(242,66,27,0.1)',
            val: stats.total_products || 0, sub: `${stats.active_products || 0} active` },
          { label: 'Total Units', icon: Archive, iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.1)',
            val: stats.total_units || 0, sub: `${stats.total_categories || 0} categories` },
          { label: 'Low Stock', icon: AlertTriangle, iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.1)',
            val: stats.low_stock || 0, sub: `${stats.out_of_stock || 0} out of stock` },
          { label: 'Out of Stock', icon: X, iconColor: '#ef4444', iconBg: 'rgba(239,68,68,0.1)',
            val: stats.out_of_stock || 0, sub: 'Need restocking' },
          { label: 'Retail Value', icon: DollarSign, iconColor: '#6366f1', iconBg: 'rgba(99,102,241,0.1)',
            isCurrency: true, val: stats.total_retail_value || 0, sub: 'Stock value' },
          { label: 'Purchases (30d)', icon: TrendingUp, iconColor: '#22c55e', iconBg: 'rgba(34,197,94,0.1)',
            val: stats.purchases || 0, sub: 'Restocks this month' },
        ].map((s, i) => (
          <div className="inv-stat-card" key={i}>
            <div className="inv-stat-card-row">
              <div className="inv-stat-icon" style={{ background: s.iconBg }}>
                <s.icon size={22} color={s.iconColor} />
              </div>
              <div className="inv-stat-body">
                <span className="inv-stat-val">
                  {s.isCurrency ? (
                    <><CurrencySymbol currency={currency} symbol={symbol} style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 2 }} />{Number(s.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                  ) : s.val}
                </span>
                <span className="inv-stat-lbl">{s.label}</span>
              </div>
            </div>
            <span className="inv-stat-count">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="inv-tabs-bar">
        {[
          { id: 'products', label: 'Products', icon: <Package size={15} /> },
          { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={15} /> },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: <ClipboardList size={15} /> },
          { id: 'reports', label: 'Reports & Insights', icon: <BarChart3 size={15} /> },
        ].map(tab => (
          <button key={tab.id} className={`inv-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ PRODUCTS TAB ═══ */}
      {activeTab === 'products' && (
        <>
          <div className="inv-filters">
            <div className="inv-search-wrap">
              <Search size={16} className="inv-search-icon" />
              <input type="text" className="inv-search-input" placeholder="Search products, SKU, barcode..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
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
            <button className={`inv-filter-btn ${showLowStock ? 'active' : ''}`}
              onClick={() => { setShowLowStock(!showLowStock); setPage(1); }}>
              <AlertTriangle size={14} /> Low Stock
            </button>
          </div>
          <div className="inv-table-wrap">
            {loading ? (
              <div className="inv-loading">Loading inventory...</div>
            ) : items.length === 0 ? (
              <div className="inv-empty">
                <Package size={48} strokeWidth={1} />
                <h4>No products found</h4>
                <p>Add your first retail product to get started</p>
                <button className="inv-btn-primary" onClick={handleCreate}><Plus size={16} /> Add Product</button>
              </div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>COST</th><th>PRICE</th><th>MARGIN</th><th>STOCK</th><th>STATUS</th><th>ACTIONS</th></tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const margin = getMargin(item);
                    return (
                      <tr key={item.id} className={item.stock_quantity === 0 ? 'out-of-stock-row' : ''}>
                        <td>
                          <div className="inv-product-cell">
                            <div className="inv-product-thumb">
                              {item.image_url ? <img src={item.image_url} alt={item.name} /> : <Package size={20} />}
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
                            <span className={`inv-margin ${parseFloat(margin) > 30 ? 'good' : parseFloat(margin) > 15 ? 'ok' : 'low'}`}>{margin}%</span>
                          ) : '—'}
                        </td>
                        <td>
                          <div className="inv-stock-cell">
                            <span className="inv-stock-qty">{item.stock_quantity}</span>
                            <ProgressBar now={getStockLevel(item)} className="inv-stock-bar"
                              variant={item.stock_quantity === 0 ? 'danger' : item.stock_quantity <= item.low_stock_threshold ? 'warning' : 'success'} />
                          </div>
                        </td>
                        <td>{getStockBadge(item)}</td>
                        <td>
                          <div className="inv-actions">
                            <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                              <button className="inv-action-btn" onClick={() => handleViewDetail(item)}><Eye size={15} /></button>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Adjust Stock</Tooltip>}>
                              <button className="inv-action-btn stock" onClick={() => handleStockAdjust(item)}><ArrowDownUp size={15} /></button>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                              <button className="inv-action-btn" onClick={() => handleEdit(item)}><Edit size={15} /></button>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip>Deactivate</Tooltip>}>
                              <button className="inv-action-btn danger" onClick={() => handleDelete(item)}><Trash2 size={15} /></button>
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
          {totalPages > 1 && (
            <div className="inv-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* ═══ SUPPLIERS TAB ═══ */}
      {activeTab === 'suppliers' && (
        <>
          <div className="inv-filters">
            <div className="inv-search-wrap">
              <Search size={16} className="inv-search-icon" />
              <input type="text" className="inv-search-input" placeholder="Search suppliers..."
                value={suppSearch} onChange={e => setSuppSearch(e.target.value)} />
            </div>
          </div>
          <div className="inv-table-wrap">
            {suppLoading ? (
              <div className="inv-loading">Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
              <div className="inv-empty">
                <Building2 size={48} strokeWidth={1} />
                <h4>No suppliers yet</h4>
                <p>Add your product suppliers to link them to purchase orders</p>
                <button className="inv-btn-primary" onClick={handleCreateSupplier}><Plus size={16} /> Add Supplier</button>
              </div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr><th>SUPPLIER</th><th>CONTACT</th><th>CITY/COUNTRY</th><th>PAYMENT TERMS</th><th>PRODUCTS</th><th>TOTAL ORDERED</th><th>ACTIONS</th></tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="inv-product-name">{s.name}</div>
                        {s.email && <div className="inv-product-brand">{s.email}</div>}
                      </td>
                      <td>{s.contact_name || '—'}{s.phone && <div className="inv-product-brand">{s.phone}</div>}</td>
                      <td>{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                      <td><Badge bg="info" className="inv-badge">{(s.payment_terms || 'net_30').replace('_', ' ')}</Badge></td>
                      <td>{s.product_count || 0}</td>
                      <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(s.total_ordered || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <div className="inv-actions">
                          <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                            <button className="inv-action-btn" onClick={() => handleEditSupplier(s)}><Edit size={15} /></button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Deactivate</Tooltip>}>
                            <button className="inv-action-btn danger" onClick={() => handleDeleteSupplier(s)}><Trash2 size={15} /></button>
                          </OverlayTrigger>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ PURCHASE ORDERS TAB ═══ */}
      {activeTab === 'purchase-orders' && (
        <>
          <div className="inv-filters">
            <select className="inv-filter-select" value={filterPOStatus} onChange={e => setFilterPOStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="inv-table-wrap">
            {poLoading ? (
              <div className="inv-loading">Loading purchase orders...</div>
            ) : orders.length === 0 ? (
              <div className="inv-empty">
                <ClipboardList size={48} strokeWidth={1} />
                <h4>No purchase orders yet</h4>
                <p>Create a purchase order to track supplier orders and automatically update stock on receipt</p>
                <button className="inv-btn-primary" onClick={handleCreatePO}><Plus size={16} /> New PO</button>
              </div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr><th>PO NUMBER</th><th>SUPPLIER</th><th>ITEMS</th><th>TOTAL</th><th>ORDERED</th><th>EXPECTED</th><th>STATUS</th><th>ACTIONS</th></tr>
                </thead>
                <tbody>
                  {orders.map(po => (
                    <tr key={po.id}>
                      <td><span className="inv-sku">{po.po_number}</span></td>
                      <td>
                        <div className="inv-product-name">{po.supplier_name || 'N/A'}</div>
                        {po.supplier_email && <div className="inv-product-brand">{po.supplier_email}</div>}
                      </td>
                      <td>{po.item_count || 0} items</td>
                      <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(po.total_amount || 0).toFixed(2)}</td>
                      <td>{po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : '—'}</td>
                      <td>{po.expected_at ? new Date(po.expected_at).toLocaleDateString() : '—'}</td>
                      <td><Badge bg={PO_STATUS_COLOR[po.status] || 'secondary'} className="inv-badge">{po.status}</Badge></td>
                      <td>
                        <div className="inv-actions">
                          <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                            <button className="inv-action-btn" onClick={() => handleViewPO(po)}><Eye size={15} /></button>
                          </OverlayTrigger>
                          {(po.status === 'ordered' || po.status === 'partial') && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Receive Stock</Tooltip>}>
                              <button className="inv-action-btn stock" onClick={() => handleReceivePO(po)}><Check size={15} /></button>
                            </OverlayTrigger>
                          )}
                          {(po.status === 'ordered' || po.status === 'draft') && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Cancel PO</Tooltip>}>
                              <button className="inv-action-btn danger" onClick={() => handleCancelPO(po)}><X size={15} /></button>
                            </OverlayTrigger>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {activeTab === 'reports' && (
        <div className="inv-reports">
          <div className="inv-subtabs">
            {[
              { id: 'valuation', label: 'Valuation', icon: <DollarSign size={14} /> },
              { id: 'turnover', label: 'Turnover', icon: <TrendingUp size={14} /> },
              { id: 'aging', label: 'Slow Movers', icon: <Clock size={14} /> },
              { id: 'reorder', label: 'Reorder Needed', icon: <AlertTriangle size={14} /> },
            ].map(t => (
              <button key={t.id} className={`inv-subtab-btn ${reportTab === t.id ? 'active' : ''}`}
                onClick={() => setReportTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {reportLoading ? (
            <div className="inv-loading">Loading reports...</div>
          ) : (
            <>
              {reportTab === 'valuation' && valuation && (
                <div className="inv-report-section">
                  <div className="inv-valuation-totals">
                    <div className="inv-val-card"><div className="inv-val-label">Total Products</div><div className="inv-val-value">{valuation.totals?.total_products || 0}</div></div>
                    <div className="inv-val-card"><div className="inv-val-label">Total Units</div><div className="inv-val-value">{parseFloat(valuation.totals?.total_units || 0).toLocaleString()}</div></div>
                    <div className="inv-val-card highlight">
                      <div className="inv-val-label">Cost Value</div>
                      <div className="inv-val-value"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(valuation.totals?.total_cost_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="inv-val-card highlight">
                      <div className="inv-val-label">Retail Value</div>
                      <div className="inv-val-value"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(valuation.totals?.total_retail_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="inv-val-card success">
                      <div className="inv-val-label">Potential Profit</div>
                      <div className="inv-val-value"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(valuation.totals?.potential_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <h6 className="inv-report-section-title">By Category</h6>
                  <table className="inv-table">
                    <thead><tr><th>CATEGORY</th><th>PRODUCTS</th><th>UNITS</th><th>COST VALUE</th><th>RETAIL VALUE</th><th>AVG MARGIN</th></tr></thead>
                    <tbody>
                      {(valuation.byCategory || []).map((c, i) => (
                        <tr key={i}>
                          <td><strong>{c.category}</strong></td>
                          <td>{c.product_count}</td>
                          <td>{parseFloat(c.total_units || 0).toLocaleString()}</td>
                          <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(c.cost_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(c.retail_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{c.avg_margin_pct != null ? <span className={`inv-margin ${parseFloat(c.avg_margin_pct) > 30 ? 'good' : parseFloat(c.avg_margin_pct) > 15 ? 'ok' : 'low'}`}>{parseFloat(c.avg_margin_pct).toFixed(1)}%</span> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportTab === 'turnover' && (
                <div className="inv-report-section">
                  <div className="inv-report-controls">
                    <label>Period:</label>
                    <select className="inv-filter-select" value={turnoverDays} onChange={e => setTurnoverDays(parseInt(e.target.value))}>
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                  <table className="inv-table">
                    <thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>CURRENT STOCK</th><th>UNITS SOLD</th><th>COGS</th><th>LOSSES</th></tr></thead>
                    <tbody>
                      {turnover.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">No movement data for this period</td></tr>
                      ) : turnover.map(row => (
                        <tr key={row.id}>
                          <td><div className="inv-product-name">{row.name}</div>{row.brand && <div className="inv-product-brand">{row.brand}</div>}</td>
                          <td>{row.category || '—'}</td>
                          <td><span className={row.stock_quantity === 0 ? 'text-danger' : row.stock_quantity <= (row.low_stock_threshold || 5) ? 'text-warning' : ''}>{row.stock_quantity}</span></td>
                          <td><strong>{row.units_sold || 0}</strong></td>
                          <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(row.cogs || 0).toFixed(2)}</td>
                          <td>{row.losses > 0 ? <span className="text-danger">{row.losses}</span> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportTab === 'aging' && (
                <div className="inv-report-section">
                  <p className="inv-report-desc">Products with stock on hand sorted by days since last sale. Investigate items with high inventory age to free up capital.</p>
                  <table className="inv-table">
                    <thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>STOCK QTY</th><th>TIED-UP CAPITAL</th><th>LAST SOLD</th><th>DAYS IDLE</th></tr></thead>
                    <tbody>
                      {aging.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">No aging data available</td></tr>
                      ) : aging.map(row => (
                        <tr key={row.id} className={row.days_since_last_sale > 60 ? 'inv-row-warn' : ''}>
                          <td><div className="inv-product-name">{row.name}</div><div className="inv-product-brand">{row.sku || ''}</div></td>
                          <td>{row.category || '—'}</td>
                          <td>{row.stock_quantity}</td>
                          <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(row.tied_up_capital || 0).toFixed(2)}</td>
                          <td>{row.last_sold_at ? new Date(row.last_sold_at).toLocaleDateString() : 'Never'}</td>
                          <td><span className={!row.days_since_last_sale ? 'text-danger' : row.days_since_last_sale > 60 ? 'text-warning' : ''}>{row.days_since_last_sale != null ? `${row.days_since_last_sale}d` : 'Never sold'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportTab === 'reorder' && (
                <div className="inv-report-section">
                  <p className="inv-report-desc">Items where current stock is at or below the reorder point. Click "New PO" to create a purchase order for these items.</p>
                  {reorderList.length === 0 ? (
                    <div className="inv-empty" style={{ padding: '3rem 0' }}>
                      <Check size={48} strokeWidth={1} color="#10b981" />
                      <h4>Stock levels look good!</h4>
                      <p>No items are currently below their reorder point.</p>
                    </div>
                  ) : (
                    <table className="inv-table">
                      <thead><tr><th>PRODUCT</th><th>SUPPLIER</th><th>CURRENT STOCK</th><th>REORDER POINT</th><th>REORDER QTY</th><th>SOLD LAST 30D</th></tr></thead>
                      <tbody>
                        {reorderList.map(row => (
                          <tr key={row.id}>
                            <td><div className="inv-product-name">{row.name}</div>{row.sku && <div className="inv-product-brand">{row.sku}</div>}</td>
                            <td>{row.supplier_name || row.supplier || '—'}</td>
                            <td><span className="text-danger fw-bold">{row.stock_quantity}</span></td>
                            <td>{row.reorder_point}</td>
                            <td>{row.reorder_quantity || '—'}</td>
                            <td>{row.sold_last_30d || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Create/Edit Product Modal ═══ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="xl" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? 'Edit Product' : 'Add New Product'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="inv-form-grid">
            <Form.Group><Form.Label>Product Name *</Form.Label>
              <Form.Control value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Moroccan Oil Shampoo" />
            </Form.Group>
            <Form.Group><Form.Label>Arabic Name</Form.Label>
              <Form.Control value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} dir="rtl" />
            </Form.Group>
            <Form.Group><Form.Label>SKU</Form.Label>
              <Form.Control value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="e.g. MOR-SHP-001" />
            </Form.Group>
            <Form.Group><Form.Label>Barcode</Form.Label>
              <Form.Control value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Category</Form.Label>
              <Form.Control value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Hair Care" list="inv-categories" />
              <datalist id="inv-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </Form.Group>
            <Form.Group><Form.Label>Brand</Form.Label>
              <Form.Control value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. Moroccan Oil" list="inv-brands" />
              <datalist id="inv-brands">{brands.map(b => <option key={b} value={b} />)}</datalist>
            </Form.Group>
            <Form.Group><Form.Label>Cost Price (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Retail Price (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={form.retail_price} onChange={e => setForm({...form, retail_price: e.target.value})} />
            </Form.Group>
            {!editId && (
              <Form.Group><Form.Label>Initial Stock</Form.Label>
                <Form.Control type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} />
              </Form.Group>
            )}
            <Form.Group><Form.Label>Low Stock Alert</Form.Label>
              <Form.Control type="number" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Reorder Point</Form.Label>
              <Form.Control type="number" value={form.reorder_point} onChange={e => setForm({...form, reorder_point: e.target.value})} placeholder="Min qty to trigger reorder" />
            </Form.Group>
            <Form.Group><Form.Label>Reorder Quantity</Form.Label>
              <Form.Control type="number" value={form.reorder_quantity} onChange={e => setForm({...form, reorder_quantity: e.target.value})} placeholder="How many to order" />
            </Form.Group>
            <Form.Group><Form.Label>Unit</Form.Label>
              <Form.Select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="piece">Piece</option><option value="bottle">Bottle</option>
                <option value="tube">Tube</option><option value="box">Box</option>
                <option value="pack">Pack</option><option value="set">Set</option>
                <option value="ml">mL</option><option value="g">Gram</option>
                <option value="kg">Kg</option><option value="l">Liter</option>
              </Form.Select>
            </Form.Group>
            <Form.Group><Form.Label>Branch</Form.Label>
              <Form.Select value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group><Form.Label>Supplier</Form.Label>
              <Form.Select value={String(form.supplier_id ?? '')} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group><Form.Label>Batch Number</Form.Label>
              <Form.Control value={form.batch_number} onChange={e => setForm({...form, batch_number: e.target.value})} placeholder="Lot/batch #" />
            </Form.Group>
            <Form.Group><Form.Label>Expiry Date</Form.Label>
              <Form.Control type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
            </Form.Group>
            <Form.Group className="span-2"><Form.Label>Description</Form.Label>
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
        <Modal.Header closeButton><Modal.Title>Adjust Stock — {selectedItem?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="inv-stock-current"><span>Current Stock:</span><strong>{selectedItem?.stock_quantity} {selectedItem?.unit}(s)</strong></div>
          <Form.Group className="mb-3"><Form.Label>Movement Type</Form.Label>
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
          <Form.Group className="mb-3"><Form.Label>Quantity *</Form.Label>
            <Form.Control type="number" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})}
              placeholder={stockForm.type === 'adjustment' ? 'New total quantity' : 'Number of units'} />
          </Form.Group>
          {stockForm.type === 'purchase' && (
            <Form.Group className="mb-3"><Form.Label>Unit Cost (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</Form.Label>
              <Form.Control type="number" step="0.01" value={stockForm.unit_cost} onChange={e => setStockForm({...stockForm, unit_cost: e.target.value})} />
            </Form.Group>
          )}
          <Form.Group className="mb-3"><Form.Label>Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={stockForm.notes} onChange={e => setStockForm({...stockForm, notes: e.target.value})} placeholder="Optional reason..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button className="inv-btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleStockSave}>Update Stock</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Product Detail Modal ═══ */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton><Modal.Title>Product Details</Modal.Title></Modal.Header>
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
                    {detailData.batch_number && <span>Batch: {detailData.batch_number}</span>}
                    {detailData.expiry_date && <span>Expiry: {new Date(detailData.expiry_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="inv-detail-stock">
                  {getStockBadge(detailData)}
                  <div className="inv-detail-qty">{detailData.stock_quantity} {detailData.unit}(s)</div>
                </div>
              </div>
              <div className="inv-detail-prices">
                <div className="inv-detail-price"><span>Cost Price</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(detailData.cost_price || 0).toFixed(2)}</strong></div>
                <div className="inv-detail-price"><span>Retail Price</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(detailData.retail_price || 0).toFixed(2)}</strong></div>
                <div className="inv-detail-price"><span>Margin</span><strong>{getMargin(detailData) || '—'}%</strong></div>
                <div className="inv-detail-price"><span>Stock Value</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {(detailData.stock_quantity * (detailData.retail_price || 0)).toFixed(2)}</strong></div>
                <div className="inv-detail-price"><span>Reorder Point</span><strong>{detailData.reorder_point || 0}</strong></div>
                <div className="inv-detail-price"><span>Reorder Qty</span><strong>{detailData.reorder_quantity || 0}</strong></div>
              </div>
              {detailData.supplier && (
                <div className="inv-detail-supplier"><Truck size={16} /><span>{detailData.supplier}{detailData.supplier_contact ? ` — ${detailData.supplier_contact}` : ''}</span></div>
              )}
              {detailData.description && <div className="inv-detail-desc"><p>{detailData.description}</p></div>}
              <h6 className="inv-detail-section-title"><History size={16} /> Recent Stock Movements</h6>
              {detailData.movements && detailData.movements.length > 0 ? (
                <table className="inv-movements-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Before → After</th><th>By</th><th>Notes</th></tr></thead>
                  <tbody>
                    {detailData.movements.map(m => (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleDateString()}</td>
                        <td><Badge bg={m.type === 'purchase' ? 'success' : m.type === 'sale' ? 'primary' : m.type === 'return' ? 'info' : m.type === 'damage' || m.type === 'expired' ? 'danger' : 'secondary'}>{m.type}</Badge></td>
                        <td>{m.type === 'sale' || m.type === 'damage' || m.type === 'expired' ? '-' : '+'}{m.quantity}</td>
                        <td>{m.previous_quantity} → {m.new_quantity}</td>
                        <td>{m.staff_name || '—'}</td>
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
        <Modal.Header closeButton><Modal.Title><Bell size={18} /> Stock Alerts</Modal.Title></Modal.Header>
        <Modal.Body>
          {alerts.length === 0 ? (
            <p className="text-center text-muted py-4">No alerts</p>
          ) : (
            <>
              <div className="inv-alerts-actions"><button className="inv-btn-sm" onClick={markAlertsRead}>Mark All as Read</button></div>
              {alerts.map(a => (
                <div key={a.id} className={`inv-alert-item ${a.is_read ? 'read' : ''}`}>
                  <AlertTriangle size={16} color={a.alert_type === 'out_of_stock' ? '#ef4444' : '#f59e0b'} />
                  <div><strong>{a.product_name || 'Product'}</strong><p>{a.message}</p><small>{new Date(a.created_at).toLocaleString()}</small></div>
                </div>
              ))}
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* ═══ Supplier Modal ═══ */}
      <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editSuppId ? 'Edit Supplier' : 'Add New Supplier'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="inv-form-grid">
            <Form.Group><Form.Label>Supplier Name *</Form.Label>
              <Form.Control value={suppForm.name} onChange={e => setSuppForm({...suppForm, name: e.target.value})} placeholder="e.g. Beauty Wholesale Ltd." />
            </Form.Group>
            <Form.Group><Form.Label>Contact Name</Form.Label>
              <Form.Control value={suppForm.contact_name} onChange={e => setSuppForm({...suppForm, contact_name: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Email</Form.Label>
              <Form.Control type="email" value={suppForm.email} onChange={e => setSuppForm({...suppForm, email: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Phone</Form.Label>
              <Form.Control value={suppForm.phone} onChange={e => setSuppForm({...suppForm, phone: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>City</Form.Label>
              <Form.Control value={suppForm.city} onChange={e => setSuppForm({...suppForm, city: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Country</Form.Label>
              <Form.Control value={suppForm.country} onChange={e => setSuppForm({...suppForm, country: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Payment Terms</Form.Label>
              <Form.Select value={suppForm.payment_terms} onChange={e => setSuppForm({...suppForm, payment_terms: e.target.value})}>
                <option value="immediate">Immediate</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="span-2"><Form.Label>Address</Form.Label>
              <Form.Control value={suppForm.address} onChange={e => setSuppForm({...suppForm, address: e.target.value})} />
            </Form.Group>
            <div className="span-2">
              <Form.Label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Location (Lat / Lng)</Form.Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, color: '#6b7280' }}>Latitude</Form.Label>
                  <Form.Control type="number" step="any" placeholder="e.g. 25.2048"
                    value={suppForm.latitude}
                    onChange={e => setSuppForm({...suppForm, latitude: e.target.value})} />
                </Form.Group>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, color: '#6b7280' }}>Longitude</Form.Label>
                  <Form.Control type="number" step="any" placeholder="e.g. 55.2708"
                    value={suppForm.longitude}
                    onChange={e => setSuppForm({...suppForm, longitude: e.target.value})} />
                </Form.Group>
              </div>
              <LocationPicker
                latitude={suppForm.latitude ? parseFloat(suppForm.latitude) : null}
                longitude={suppForm.longitude ? parseFloat(suppForm.longitude) : null}
                height={260}
                onLocationSelect={(lat, lng, name) => {
                  setSuppForm(f => ({
                    ...f, latitude: lat, longitude: lng,
                    address: f.address || name || f.address
                  }));
                }}
              />
            </div>
            <Form.Group className="span-2"><Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={suppForm.notes} onChange={e => setSuppForm({...suppForm, notes: e.target.value})} />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="inv-btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleSaveSupplier}>{editSuppId ? 'Update' : 'Create'}</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Create Purchase Order Modal ═══ */}
      <Modal show={showPOModal} onHide={() => setShowPOModal(false)} size="xl" centered className="inv-modal">
        <Modal.Header closeButton><Modal.Title>New Purchase Order</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="inv-form-grid mb-4">
            <Form.Group><Form.Label>Supplier *</Form.Label>
              <Form.Select value={poForm.supplier_id} onChange={e => setPOForm({...poForm, supplier_id: e.target.value})}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group><Form.Label>Order Date</Form.Label>
              <Form.Control type="date" value={poForm.ordered_at} onChange={e => setPOForm({...poForm, ordered_at: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Expected Delivery</Form.Label>
              <Form.Control type="date" value={poForm.expected_at} onChange={e => setPOForm({...poForm, expected_at: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Tax Amount</Form.Label>
              <Form.Control type="number" step="0.01" value={poForm.tax_amount} onChange={e => setPOForm({...poForm, tax_amount: e.target.value})} />
            </Form.Group>
            <Form.Group><Form.Label>Shipping Cost</Form.Label>
              <Form.Control type="number" step="0.01" value={poForm.shipping_cost} onChange={e => setPOForm({...poForm, shipping_cost: e.target.value})} />
            </Form.Group>
            <Form.Group className="span-2"><Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={1} value={poForm.notes} onChange={e => setPOForm({...poForm, notes: e.target.value})} />
            </Form.Group>
          </div>
          <h6 className="inv-detail-section-title"><Boxes size={16} /> Order Lines</h6>
          <table className="inv-po-lines-table">
            <thead><tr><th>PRODUCT</th><th>QTY</th><th>UNIT COST</th><th>LINE TOTAL</th><th>BATCH #</th><th>EXPIRY</th><th></th></tr></thead>
            <tbody>
              {poForm.items.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <Form.Select value={line.inventory_id} onChange={e => updatePOLine(idx, 'inventory_id', e.target.value)}>
                      <option value="">Select product...</option>
                      {items.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                    </Form.Select>
                  </td>
                  <td><Form.Control type="number" min="1" value={line.quantity_ordered} onChange={e => updatePOLine(idx, 'quantity_ordered', e.target.value)} style={{ width: 80 }} /></td>
                  <td><Form.Control type="number" step="0.01" value={line.unit_cost} onChange={e => updatePOLine(idx, 'unit_cost', e.target.value)} style={{ width: 100 }} /></td>
                  <td className="fw-bold"><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {(parseFloat(line.unit_cost || 0) * parseInt(line.quantity_ordered || 0)).toFixed(2)}</td>
                  <td><Form.Control value={line.batch_number} onChange={e => updatePOLine(idx, 'batch_number', e.target.value)} placeholder="Optional" style={{ width: 110 }} /></td>
                  <td><Form.Control type="date" value={line.expiry_date} onChange={e => updatePOLine(idx, 'expiry_date', e.target.value)} style={{ width: 140 }} /></td>
                  <td>{poForm.items.length > 1 && <button className="inv-action-btn danger" onClick={() => removePOLine(idx)}><X size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="inv-btn-sm mt-2" onClick={addPOLine}><Plus size={14} /> Add Line</button>
          <div className="inv-po-totals">
            <div><span>Subtotal:</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {poSubtotal.toFixed(2)}</strong></div>
            <div><span>Tax:</span><strong>+<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(poForm.tax_amount || 0).toFixed(2)}</strong></div>
            <div><span>Shipping:</span><strong>+<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(poForm.shipping_cost || 0).toFixed(2)}</strong></div>
            <div className="po-total-row"><span>Total:</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {poTotal.toFixed(2)}</strong></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="inv-btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handleSavePO}>Create Purchase Order</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ PO Detail Modal ═══ */}
      <Modal show={showPODetail} onHide={() => setShowPODetail(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>PO Details — {poDetail?.po_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {poDetail && (
            <div>
              <div className="inv-detail-prices mb-3">
                <div className="inv-detail-price"><span>Supplier</span><strong>{poDetail.supplier_name || '—'}</strong></div>
                <div className="inv-detail-price"><span>Status</span><strong><Badge bg={PO_STATUS_COLOR[poDetail.status] || 'secondary'}>{poDetail.status}</Badge></strong></div>
                <div className="inv-detail-price"><span>Ordered</span><strong>{poDetail.ordered_at ? new Date(poDetail.ordered_at).toLocaleDateString() : '—'}</strong></div>
                <div className="inv-detail-price"><span>Expected</span><strong>{poDetail.expected_at ? new Date(poDetail.expected_at).toLocaleDateString() : '—'}</strong></div>
                <div className="inv-detail-price"><span>Total</span><strong><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(poDetail.total_amount || 0).toFixed(2)}</strong></div>
              </div>
              <h6 className="inv-detail-section-title">Line Items</h6>
              <table className="inv-movements-table">
                <thead><tr><th>Product</th><th>Ordered</th><th>Received</th><th>Unit Cost</th><th>Total</th></tr></thead>
                <tbody>
                  {(poDetail.items || []).map(line => (
                    <tr key={line.id}>
                      <td>{line.product_name || `#${line.inventory_id}`}</td>
                      <td>{line.quantity_ordered}</td>
                      <td><span className={line.quantity_received >= line.quantity_ordered ? 'text-success' : 'text-warning'}>{line.quantity_received}</span></td>
                      <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(line.unit_cost || 0).toFixed(2)}</td>
                      <td><CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {parseFloat(line.total_cost || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {poDetail.notes && <p className="text-muted mt-3"><small>Notes: {poDetail.notes}</small></p>}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {poDetail && (poDetail.status === 'ordered' || poDetail.status === 'partial') && (
            <button className="inv-btn-primary" onClick={() => { setShowPODetail(false); handleReceivePO(poDetail); }}>
              <Check size={15} /> Receive Stock
            </button>
          )}
          <button className="inv-btn-secondary" onClick={() => setShowPODetail(false)}>Close</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
