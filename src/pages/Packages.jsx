import { useState, useEffect } from 'react';
import { Package, Plus, Edit3, Trash2, Users, ShoppingBag, DollarSign, Clock, ChevronRight, X, Star } from 'lucide-react';
import api from '../lib/api';
import Swal from 'sweetalert2';
import useCurrency from '../hooks/useCurrency';
import { supportAlert } from '../utils/supportAlert';
import './Packages.css';

export default function Packages() {
  const { currency } = useCurrency();
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [editingPkg, setEditingPkg] = useState(null);
  const [formData, setFormData] = useState({
    name: '', name_ar: '', description: '', price: '', currency: '',
    validity_days: 365, max_uses: 0, is_active: 1, items: []
  });
  const [sellData, setSellData] = useState({ customer_id: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pkgRes, statRes, svcRes, custRes] = await Promise.all([
        api.get('/packages'),
        api.get('/packages/stats'),
        api.get('/products?active=true'),
        api.get('/contacts'),
      ]);
      setPackages(pkgRes.data || []);
      setStats(statRes.data || {});
      setServices(svcRes.data || []);
      setCustomers(custRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingPkg(null);
    setFormData({ name: '', name_ar: '', description: '', price: '', currency: currency, validity_days: 365, max_uses: 0, is_active: 1, items: [] });
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name, name_ar: pkg.name_ar || '', description: pkg.description || '',
      price: pkg.price, currency: pkg.currency || currency, validity_days: pkg.validity_days || 365,
      max_uses: pkg.max_uses || 0, is_active: pkg.is_active, items: pkg.items || []
    });
    setShowModal(true);
  };

  const openDetail = async (pkg) => {
    try {
      const res = await api.get(`/packages/${pkg.id}`);
      setSelectedPkg(res.data);
      setShowDetailModal(true);
    } catch(e) { console.error(e); }
  };

  const addServiceToPackage = () => {
    setFormData(p => ({ ...p, items: [...p.items, { service_id: '', quantity: 1 }] }));
  };

  const updateItem = (idx, field, value) => {
    setFormData(p => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...p, items };
    });
  };

  const removeItem = (idx) => {
    setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        validity_days: parseInt(formData.validity_days),
        max_uses: parseInt(formData.max_uses),
        items: formData.items.filter(i => i.service_id).map(i => ({ service_id: parseInt(i.service_id), quantity: parseInt(i.quantity) || 1 }))
      };
      if (editingPkg) {
        await api.patch(`/packages/${editingPkg.id}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      Swal.fire({ icon: 'success', title: editingPkg ? 'Updated!' : 'Created!', timer: 1500, showConfirmButton: false });
      setShowModal(false);
      fetchAll();
    } catch (e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
  };

  const handleSell = async (pkg) => {
    setSelectedPkg(pkg);
    setSellData({ customer_id: '' });
    setShowSellModal(true);
  };

  const submitSell = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/packages/${selectedPkg.id}/sell`, { customer_id: parseInt(sellData.customer_id) });
      Swal.fire({ icon: 'success', title: 'Package Sold!', text: `${selectedPkg.name} assigned to client`, timer: 2000, showConfirmButton: false });
      setShowSellModal(false);
      fetchAll();
    } catch (e) { Swal.fire({ icon: 'error', title: 'Error', text: e.message }); }
  };

  const handleDelete = () => supportAlert();

  if (loading) return <div className="pkg-loading"><div className="pkg-spinner" /></div>;

  const totalValue = formData.items.reduce((sum, item) => {
    const svc = services.find(s => s.id === parseInt(item.service_id));
    return sum + (svc?.unit_price || 0) * (item.quantity || 1);
  }, 0);
  const savings = totalValue - (parseFloat(formData.price) || 0);

  return (
    <div className="pkg-page">
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Package size={26} /></div>
          <div>
            <h1 className="module-hero-title">Packages</h1>
            <p className="module-hero-sub">Create service bundles at discounted prices</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" onClick={openCreate}><Plus size={18} /> Create Package</button>
        </div>
      </div>

      {/* Stats */}
      <div className="pkg-stats">
        <div className="pkg-stat"><Package size={20} /><div><span className="pkg-stat-num">{stats.total_packages || 0}</span><span className="pkg-stat-lbl">Total</span></div></div>
        <div className="pkg-stat"><Star size={20} /><div><span className="pkg-stat-num">{stats.active_packages || 0}</span><span className="pkg-stat-lbl">Active</span></div></div>
        <div className="pkg-stat"><ShoppingBag size={20} /><div><span className="pkg-stat-num">{stats.total_sold || 0}</span><span className="pkg-stat-lbl">Sold</span></div></div>
        <div className="pkg-stat"><Users size={20} /><div><span className="pkg-stat-num">{stats.active_subscriptions || 0}</span><span className="pkg-stat-lbl">Active Buyers</span></div></div>
        <div className="pkg-stat"><DollarSign size={20} /><div><span className="pkg-stat-num">{parseFloat(stats.total_revenue || 0).toLocaleString()}</span><span className="pkg-stat-lbl">Revenue</span></div></div>
      </div>

      {/* Packages grid */}
      {packages.length === 0 ? (
        <div className="pkg-empty">
          <Package size={48} strokeWidth={1} />
          <h3>No packages yet</h3>
          <p>Create service bundles to offer your clients better value</p>
          <button className="pkg-btn-primary" onClick={openCreate}><Plus size={16} /> Create First Package</button>
        </div>
      ) : (
        <div className="pkg-grid">
          {packages.map(pkg => (
            <div key={pkg.id} className={`pkg-card ${!pkg.is_active ? 'pkg-inactive' : ''}`}>
              <div className="pkg-card-header">
                <div className="pkg-card-badge">{pkg.item_count || 0} services</div>
                {!pkg.is_active && <span className="pkg-card-inactive">Inactive</span>}
              </div>
              <h3 className="pkg-card-name">{pkg.name}</h3>
              {pkg.description && <p className="pkg-card-desc">{pkg.description}</p>}
              <div className="pkg-card-price">
                <span className="pkg-price-amount">{pkg.currency} {parseFloat(pkg.price).toLocaleString()}</span>
                <span className="pkg-price-validity">{pkg.validity_days} days</span>
              </div>
              {pkg.items && pkg.items.length > 0 && (
                <div className="pkg-card-items">
                  {pkg.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="pkg-card-item">
                      <span>{item.service_name}</span>
                      <span className="pkg-item-qty">×{item.quantity}</span>
                    </div>
                  ))}
                  {pkg.items.length > 3 && <div className="pkg-card-more">+{pkg.items.length - 3} more</div>}
                </div>
              )}
              <div className="pkg-card-footer">
                <span className="pkg-buyers">{pkg.active_buyers || 0} active buyers</span>
                <div className="pkg-card-actions">
                  <button className="pkg-icon-btn" onClick={() => openDetail(pkg)}><ChevronRight size={16} /></button>
                  <button className="pkg-icon-btn pkg-sell-btn" onClick={() => handleSell(pkg)}><ShoppingBag size={16} /></button>
                  <button className="pkg-icon-btn" onClick={() => openEdit(pkg)}><Edit3 size={16} /></button>
                  <button className="pkg-icon-btn pkg-del-btn" onClick={() => handleDelete(pkg)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="pkg-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pkg-modal" onClick={e => e.stopPropagation()}>
            <div className="pkg-modal-header">
              <h2>{editingPkg ? 'Edit Package' : 'Create Package'}</h2>
              <button className="pkg-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="pkg-form-section">
                <h4>Package Details</h4>
                <div className="pkg-form-grid">
                  <div className="pkg-field"><label>Name *</label><input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required /></div>
                  <div className="pkg-field"><label>Name (Arabic)</label><input value={formData.name_ar} onChange={e => setFormData(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
                  <div className="pkg-field pkg-field-full"><label>Description</label><textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
                  <div className="pkg-field"><label>Price *</label><input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} required /></div>
                  <div className="pkg-field"><label>Validity (days)</label><input type="number" value={formData.validity_days} onChange={e => setFormData(p => ({ ...p, validity_days: e.target.value }))} /></div>
                  <div className="pkg-field"><label>Max Uses (0=unlimited)</label><input type="number" value={formData.max_uses} onChange={e => setFormData(p => ({ ...p, max_uses: e.target.value }))} /></div>
                  <div className="pkg-field"><label>Status</label>
                    <select value={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: parseInt(e.target.value) }))}>
                      <option value={1}>Active</option><option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pkg-form-section">
                <div className="pkg-section-header">
                  <h4>Included Services</h4>
                  <button type="button" className="pkg-btn-small" onClick={addServiceToPackage}><Plus size={14} /> Add Service</button>
                </div>
                {formData.items.length === 0 ? (
                  <p className="pkg-hint">No services added. Click "Add Service" to include services in this package.</p>
                ) : (
                  <div className="pkg-items-list">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="pkg-item-row">
                        <select value={item.service_id} onChange={e => updateItem(idx, 'service_id', e.target.value)}>
                          <option value="">Select service...</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.currency} {s.unit_price})</option>)}
                        </select>
                        <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} style={{ width: 70 }} />
                        <button type="button" className="pkg-item-remove" onClick={() => removeItem(idx)}><X size={16} /></button>
                      </div>
                    ))}
                    {totalValue > 0 && (
                      <div className="pkg-savings-bar">
                        <span>Total value: {totalValue.toLocaleString()}</span>
                        {savings > 0 && <span className="pkg-savings">Customer saves {savings.toLocaleString()}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pkg-modal-actions">
                <button type="button" className="pkg-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="pkg-btn-primary">{editingPkg ? 'Save' : 'Create Package'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedPkg && (
        <div className="pkg-modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="pkg-modal pkg-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Sell Package</h2>
            <p style={{ color: '#666', margin: '8px 0 20px' }}>Assign <b>{selectedPkg.name}</b> ({selectedPkg.currency} {parseFloat(selectedPkg.price).toLocaleString()}) to a client</p>
            <form onSubmit={submitSell}>
              <div className="pkg-field">
                <label>Select Client *</label>
                <select value={sellData.customer_id} onChange={e => setSellData({ customer_id: e.target.value })} required>
                  <option value="">Choose client...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="pkg-modal-actions">
                <button type="button" className="pkg-btn-outline" onClick={() => setShowSellModal(false)}>Cancel</button>
                <button type="submit" className="pkg-btn-primary"><ShoppingBag size={16} /> Sell Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPkg && (
        <div className="pkg-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="pkg-modal" onClick={e => e.stopPropagation()}>
            <div className="pkg-modal-header">
              <h2>{selectedPkg.name}</h2>
              <button className="pkg-modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>
            <div className="pkg-detail-price">{selectedPkg.currency} {parseFloat(selectedPkg.price).toLocaleString()}</div>
            {selectedPkg.description && <p className="pkg-detail-desc">{selectedPkg.description}</p>}

            <h4>Included Services ({selectedPkg.items?.length || 0})</h4>
            <div className="pkg-detail-items">
              {(selectedPkg.items || []).map((item, i) => (
                <div key={i} className="pkg-detail-item">
                  <span>{item.service_name}</span>
                  <span>×{item.quantity} — {item.duration} min — {selectedPkg.currency} {parseFloat(item.unit_price || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {selectedPkg.buyers && selectedPkg.buyers.length > 0 && (
              <>
                <h4 style={{ marginTop: 20 }}>Active Buyers ({selectedPkg.buyers.length})</h4>
                <div className="pkg-detail-items">
                  {selectedPkg.buyers.map((b, i) => (
                    <div key={i} className="pkg-detail-item">
                      <span>{b.first_name} {b.last_name}</span>
                      <span className={`pkg-buyer-status ${b.status}`}>{b.status} — {b.used_sessions} used</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
