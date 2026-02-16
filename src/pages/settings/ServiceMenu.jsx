import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Search, Building2,
  Clock, X, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Badge, Modal } from 'react-bootstrap';
import CurrencyInput from 'react-currency-input-field';
import {
  CURRENCIES, getCurrencySymbol, DURATION_OPTIONS, formatDuration,
  EMPTY_SERVICE_FORM, renderCatIcon
} from './settingsConstants';
import useCurrency from '../../hooks/useCurrency';
import { showContactSupport } from '../../utils/supportAlert';

export default function ServiceMenu({
  services, serviceLoading, fetchServices,
  categories, branches, api, showToast
}) {
  const { currency: tenantCurrency } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_SERVICE_FORM });
  const [step, setStep] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [activeCatId, setActiveCatId] = useState(null);

  const grouped = useMemo(() => {
    const map = {};
    const filtered = services.filter(s => {
      if (searchQ && !s.name?.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (filterBranch && String(s.branch_id) !== String(filterBranch)) return false;
      return true;
    });
    for (const s of filtered) {
      const catId = s.category_id || 0;
      if (!map[catId]) map[catId] = [];
      map[catId].push(s);
    }
    return map;
  }, [services, searchQ, filterBranch]);

  const sortedCats = useMemo(() => {
    return [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [categories]);

  const openCreate = (catId) => {
    setEditing(null);
    setForm({ ...EMPTY_SERVICE_FORM, category_id: catId || '' });
    setStep(0);
    setShowModal(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({
      name: svc.name || '', description: svc.description || '', sku: svc.sku || '',
      unit_price: svc.unit_price || '', currency: svc.currency || tenantCurrency || 'AED',
      price_type: svc.price_type || 'fixed', category_id: svc.category_id || '',
      branch_id: svc.branch_id || '', duration: svc.duration || '60',
      processing_time: svc.processing_time || '0', finishing_time: svc.finishing_time || '0',
      stock_quantity: svc.stock_quantity || 0, is_active: svc.is_active !== false,
      online_booking: svc.online_booking !== false, requires_resources: !!svc.requires_resources,
    });
    setStep(0);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { showToast('error', 'Service name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : 0,
        duration: form.duration ? parseInt(form.duration) : 60,
        processing_time: form.processing_time ? parseInt(form.processing_time) : 0,
        finishing_time: form.finishing_time ? parseInt(form.finishing_time) : 0,
        category_id: form.category_id || null,
        branch_id: form.branch_id || null,
      };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        showToast('success', 'Service updated');
      } else {
        await api.post('/products', payload);
        showToast('success', 'Service created');
      }
      setShowModal(false);
      fetchServices();
    } catch (e) {
      showToast('error', e.message || 'Failed to save service');
    }
    setSaving(false);
  };

  const handleDelete = () => showContactSupport();

  const handleToggle = async (svc) => {
    try {
      await api.patch(`/products/${svc.id}`, { is_active: !svc.is_active });
      fetchServices();
    } catch (e) { showToast('error', 'Failed'); }
  };

  const curr = getCurrencySymbol(form.currency || tenantCurrency || 'AED');
  const STEPS = ['Details', 'Pricing & Duration', 'Settings'];

  // For the services page, we use a two-panel layout: categories sidebar + service list
  return (
    <div className="stn-page stn-split-layout">
      {/* Categories sidebar */}
      <div className="stn-split-sidebar">
        <div className="stn-split-sidebar-search">
          <Search size={14} />
          <input placeholder="Search services..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>

        {branches.length > 1 && (
          <div className="stn-split-sidebar-filter">
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              <option value="">All locations</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <nav className="stn-split-sidebar-nav">
          <button className={`stn-split-nav-item ${activeCatId === null ? 'active' : ''}`} onClick={() => setActiveCatId(null)}>
            All services <span className="stn-count">{services.length}</span>
          </button>
          {sortedCats.map(cat => (
            <button
              key={cat.id}
              className={`stn-split-nav-item ${activeCatId === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCatId(cat.id)}
            >
              <span className="stn-split-nav-icon">{renderCatIcon(cat.icon, 14, cat.color)}</span>
              {cat.name}
              <span className="stn-count">{(grouped[cat.id] || []).length}</span>
            </button>
          ))}
          <button className={`stn-split-nav-item ${activeCatId === 0 ? 'active' : ''}`} onClick={() => setActiveCatId(0)}>
            Uncategorized <span className="stn-count">{(grouped[0] || []).length}</span>
          </button>
        </nav>

        <button className="stn-btn-primary stn-split-sidebar-add" onClick={() => openCreate(activeCatId)}>
          <Plus size={14} /> Add service
        </button>
      </div>

      {/* Main service list */}
      <div className="stn-split-main">
        <div className="stn-page-actions" style={{ paddingBottom: 12 }}>
          <h2 className="stn-split-title">{activeCatId === null ? 'All services' : (sortedCats.find(c => c.id === activeCatId)?.name || 'Uncategorized')}</h2>
          <button className="stn-btn-primary" onClick={() => openCreate(activeCatId)}><Plus size={14} /> Add</button>
        </div>

        {serviceLoading ? (
          <div className="stn-loading">Loading services...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="stn-empty">
            <h3>No services found</h3>
            <p>{searchQ ? 'Try a different search' : 'Add your first service to get started'}</p>
            <button className="stn-btn-primary" onClick={() => openCreate()}><Plus size={14} /> Add service</button>
          </div>
        ) : (
          <div className="stn-card">
            <div className="stn-card-body" style={{ padding: 0 }}>
              {(activeCatId === null ? sortedCats : sortedCats.filter(c => c.id === activeCatId)).map(cat => {
                const catServices = grouped[cat.id] || [];
                if (catServices.length === 0) return null;
                return (
                  <div key={cat.id}>
                    {activeCatId === null && (
                      <div className="stn-group-header">
                        <span className="stn-group-icon">{renderCatIcon(cat.icon, 16, cat.color)}</span>
                        <strong>{cat.name}</strong>
                        <Badge bg="light" text="dark" style={{ fontSize: 10, marginLeft: 6 }}>{catServices.length}</Badge>
                      </div>
                    )}
                    {catServices.map(svc => (
                      <div className={`stn-list-row ${!svc.is_active ? 'inactive' : ''}`} key={svc.id}>
                        <div className="stn-list-left" style={{ flex: 1 }}>
                          <div className="stn-list-info">
                            <strong>{svc.name}</strong>
                            <span className="stn-svc-meta">
                              <Clock size={12} /> {formatDuration(svc.duration)}
                              {svc.branch_name && <><Building2 size={12} style={{ marginLeft: 8 }} /> {svc.branch_name}</>}
                            </span>
                          </div>
                        </div>
                        <div className="stn-svc-price">
                          {svc.price_type === 'from' && <small>from </small>}
                          {getCurrencySymbol(svc.currency || tenantCurrency || 'AED')} {svc.unit_price || 0}
                        </div>
                        <div className="stn-list-right">
                          <button className="stn-btn-icon" onClick={() => handleToggle(svc)}>
                            {svc.is_active ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} />}
                          </button>
                          <button className="stn-btn-icon" onClick={() => openEdit(svc)}><Pencil size={14} /></button>
                          <button className="stn-btn-icon danger" onClick={() => handleDelete(svc.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Uncategorized */}
              {(activeCatId === null || activeCatId === 0) && (grouped[0] || []).length > 0 && (
                <div>
                  {activeCatId === null && (
                    <div className="stn-group-header">
                      <strong>Uncategorized</strong>
                      <Badge bg="light" text="dark" style={{ fontSize: 10, marginLeft: 6 }}>{(grouped[0] || []).length}</Badge>
                    </div>
                  )}
                  {(grouped[0] || []).map(svc => (
                    <div className={`stn-list-row ${!svc.is_active ? 'inactive' : ''}`} key={svc.id}>
                      <div className="stn-list-left" style={{ flex: 1 }}>
                        <div className="stn-list-info">
                          <strong>{svc.name}</strong>
                          <span className="stn-svc-meta">
                            <Clock size={12} /> {formatDuration(svc.duration)}
                          </span>
                        </div>
                      </div>
                      <div className="stn-svc-price">
                        {getCurrencySymbol(svc.currency || tenantCurrency || 'AED')} {svc.unit_price || 0}
                      </div>
                      <div className="stn-list-right">
                        <button className="stn-btn-icon" onClick={() => handleToggle(svc)}>
                          {svc.is_active ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} />}
                        </button>
                        <button className="stn-btn-icon" onClick={() => openEdit(svc)}><Pencil size={14} /></button>
                        <button className="stn-btn-icon danger" onClick={() => handleDelete(svc.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-step service modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered className="stn-modal">
        <Modal.Header>
          <Modal.Title>{editing ? 'Edit service' : 'New service'}</Modal.Title>
          <button className="stn-btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
        </Modal.Header>
        <div className="stn-modal-steps">
          {STEPS.map((s, i) => (
            <button key={i} className={`stn-step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`} onClick={() => setStep(i)}>
              <span className="stn-step-num">{i + 1}</span> {s}
            </button>
          ))}
        </div>
        <Modal.Body>
          {step === 0 && (
            <div className="stn-form-grid">
              <div className="stn-field span-2">
                <label>Service name *</label>
                <input type="text" placeholder="e.g. Classic Haircut" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="stn-field span-2">
                <label>Description</label>
                <textarea rows={3} placeholder="Describe the service..." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div className="stn-field">
                <label>Category</label>
                <select value={form.category_id} onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="stn-field">
                <label>Location</label>
                <select value={form.branch_id} onChange={e => setForm(prev => ({ ...prev, branch_id: e.target.value }))}>
                  <option value="">All locations</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="stn-field">
                <label>SKU / Code</label>
                <input type="text" placeholder="Optional" value={form.sku} onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stn-form-grid">
              <div className="stn-field">
                <label>Price type</label>
                <select value={form.price_type} onChange={e => setForm(prev => ({ ...prev, price_type: e.target.value }))}>
                  <option value="fixed">Fixed price</option>
                  <option value="from">Starting from</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div className="stn-field">
                <label>Price ({getCurrencySymbol(form.currency)})</label>
                <CurrencyInput
                  className="stn-input"
                  placeholder="0.00"
                  prefix={getCurrencySymbol(form.currency) + ' '}
                  decimalsLimit={2}
                  value={form.unit_price}
                  onValueChange={(val) => setForm(prev => ({ ...prev, unit_price: val || '' }))}
                  disabled={form.price_type === 'free'}
                />
              </div>
              <div className="stn-field">
                <label>Currency</label>
                <select value={form.currency} onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>
              <div className="stn-field">
                <label>Duration</label>
                <select value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}>
                  {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="stn-field">
                <label>Processing time</label>
                <select value={form.processing_time} onChange={e => setForm(prev => ({ ...prev, processing_time: e.target.value }))}>
                  <option value="0">None</option>
                  {DURATION_OPTIONS.filter(d => d.value <= 60).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <small className="stn-hint">Time blocked before service (e.g. color processing)</small>
              </div>
              <div className="stn-field">
                <label>Finishing time</label>
                <select value={form.finishing_time} onChange={e => setForm(prev => ({ ...prev, finishing_time: e.target.value }))}>
                  <option value="0">None</option>
                  {DURATION_OPTIONS.filter(d => d.value <= 60).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <small className="stn-hint">Time blocked after service (e.g. cleanup)</small>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stn-form-grid">
              <div className="stn-field span-2">
                <div className="stn-toggle-row">
                  <div>
                    <strong>Online booking</strong>
                    <span className="stn-toggle-desc">Allow clients to book this service online</span>
                  </div>
                  <label className="stn-switch">
                    <input type="checkbox" checked={form.online_booking} onChange={e => setForm(prev => ({ ...prev, online_booking: e.target.checked }))} />
                    <span className="stn-switch-track" />
                  </label>
                </div>
              </div>
              <div className="stn-field span-2">
                <div className="stn-toggle-row">
                  <div>
                    <strong>Active</strong>
                    <span className="stn-toggle-desc">Show this service in your menu</span>
                  </div>
                  <label className="stn-switch">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} />
                    <span className="stn-switch-track" />
                  </label>
                </div>
              </div>
              <div className="stn-field span-2">
                <div className="stn-toggle-row">
                  <div>
                    <strong>Requires resources</strong>
                    <span className="stn-toggle-desc">Needs a specific room or equipment</span>
                  </div>
                  <label className="stn-switch">
                    <input type="checkbox" checked={form.requires_resources} onChange={e => setForm(prev => ({ ...prev, requires_resources: e.target.checked }))} />
                    <span className="stn-switch-track" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="stn-modal-footer-nav">
            {step > 0 && <button className="stn-btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="stn-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              {step < STEPS.length - 1 ? (
                <button className="stn-btn-primary" onClick={() => setStep(step + 1)}>Next</button>
              ) : (
                <button className="stn-btn-primary" disabled={saving} onClick={handleSubmit}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
