import { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import {
  Plus, Search, Gift, Eye, Ban, CreditCard, DollarSign,
  Clock, CheckCircle, AlertTriangle, XCircle, Send, Copy,
  Tag, ShoppingBag, RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import './GiftCards.css';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', gradient: 'linear-gradient(135deg,#f2421b,#f79680)', icon: '🎁' },
  { id: 'spa', name: 'Spa Day', gradient: 'linear-gradient(135deg,#ec4899,#f9a8d4)', icon: '🧖' },
  { id: 'birthday', name: 'Birthday', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', icon: '🎂' },
  { id: 'thankyou', name: 'Thank You', gradient: 'linear-gradient(135deg,#10b981,#6ee7b7)', icon: '💐' },
  { id: 'luxury', name: 'Luxury', gradient: 'linear-gradient(135deg,#1e293b,#64748b)', icon: '✨' },
];

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10b981', icon: CheckCircle },
  redeemed: { label: 'Redeemed', color: '#f2421b', icon: ShoppingBag },
  expired: { label: 'Expired', color: '#f59e0b', icon: Clock },
  void: { label: 'Void', color: '#9ca3af', icon: Ban },
};

export default function GiftCards() {
  const { currency } = useCurrency();
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Create form
  const [form, setForm] = useState({
    initial_value: 100, issued_to_name: '', issued_to_email: '', issued_to_phone: '',
    message: '', template: 'classic', validity_months: 12, notes: '', custom_amount: false
  });

  // Redeem form
  const [redeemForm, setRedeemForm] = useState({ code: '', amount: '' });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/gift-cards/stats');
      if (res.success) setStats(res.data || {});
    } catch (e) { console.error(e); }
  }, []);

  const fetchCards = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      let url = `/gift-cards?page=${page}&limit=${pagination.limit}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      if (res.success) {
        setCards(res.data || []);
        if (res.pagination) setPagination(prev => ({ ...prev, ...res.pagination }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, search, pagination.limit]);

  useEffect(() => { fetchStats(); fetchCards(); }, []);
  useEffect(() => { fetchCards(pagination.page); }, [pagination.page, filterStatus]);

  const handleCreate = async () => {
    if (!form.initial_value || form.initial_value <= 0) return alert('Enter a valid amount');
    setSaving(true);
    try {
      const res = await api.post('/gift-cards', form);
      if (res.success) {
        setShowCreate(false);
        fetchCards();
        fetchStats();
        setForm({ initial_value: 100, issued_to_name: '', issued_to_email: '', issued_to_phone: '', message: '', template: 'classic', validity_months: 12, notes: '', custom_amount: false });
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleView = async (card) => {
    try {
      const res = await api.get(`/gift-cards/${card.id}`);
      if (res.success) { setViewing(res.data); setShowView(true); }
    } catch (e) { console.error(e); }
  };

  const handleVoid = async (id) => {
    if (!confirm('Void this gift card? This cannot be undone.')) return;
    await api.post(`/gift-cards/${id}/void`);
    fetchCards(); fetchStats();
    if (viewing?.id === id) setShowView(false);
  };

  const handleRedeem = async () => {
    if (!redeemForm.code || !redeemForm.amount) return;
    setSaving(true);
    try {
      const res = await api.post('/gift-cards/redeem', { code: redeemForm.code, amount: parseFloat(redeemForm.amount) });
      if (res.success) {
        alert(res.message);
        setShowRedeem(false);
        setRedeemForm({ code: '', amount: '' });
        fetchCards(); fetchStats();
      } else {
        alert(res.message || 'Redemption failed');
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatCurrency = (v) => parseFloat(v || 0).toFixed(2);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const getTemplate = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    const Icon = cfg.icon;
    return (
      <span className="gc-status-badge" style={{ '--gc-badge': cfg.color }}>
        <Icon size={12} /> {cfg.label}
      </span>
    );
  };

  return (
    <div className="gc-page">
      {/* Stats */}
      <div className="gc-stats-grid">
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#fef0ec' }}><Gift size={20} color="#f2421b" /></div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{stats.total || 0}</span>
            <span className="gc-stat-lbl">Total Cards</span>
          </div>
          <span className="gc-stat-tag">{stats.active_count || 0} active</span>
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#dcfce7' }}><DollarSign size={20} color="#10b981" /></div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{formatCurrency(stats.total_sold)}</span>
            <span className="gc-stat-lbl">Total Sold</span>
          </div>
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#fef3c7' }}><CreditCard size={20} color="#f59e0b" /></div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{formatCurrency(stats.total_outstanding)}</span>
            <span className="gc-stat-lbl">Outstanding</span>
          </div>
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#fef0ec' }}><ShoppingBag size={20} color="#f2421b" /></div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{formatCurrency(stats.total_redeemed)}</span>
            <span className="gc-stat-lbl">Redeemed</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gc-toolbar">
        <div className="gc-search">
          <Search size={16} />
          <input placeholder="Search by code, name, or email..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCards(1)} />
        </div>
        <div className="gc-filter-tabs">
          {[{ k: '', l: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} className={`gc-filter-tab ${filterStatus === f.k ? 'active' : ''}`} onClick={() => { setFilterStatus(f.k); setPagination(p => ({ ...p, page: 1 })); }}>
              {f.l}
            </button>
          ))}
        </div>
        <div className="gc-toolbar-actions">
          <button className="gc-btn-outline" onClick={() => setShowRedeem(true)}><Tag size={14} /> Redeem</button>
          <button className="gc-btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Sell Gift Card</button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="gc-loading">Loading gift cards...</div>
      ) : cards.length === 0 ? (
        <div className="gc-empty">
          <Gift size={48} strokeWidth={1} />
          <p>No gift cards yet</p>
          <button className="gc-btn-primary" onClick={() => setShowCreate(true)}>Sell Your First Gift Card</button>
        </div>
      ) : (
        <div className="gc-grid">
          {cards.map(card => {
            const tmpl = getTemplate(card.template);
            const pct = card.initial_value > 0 ? ((card.remaining_value / card.initial_value) * 100).toFixed(0) : 0;
            return (
              <div key={card.id} className="gc-card" onClick={() => handleView(card)}>
                <div className="gc-card-visual" style={{ background: tmpl.gradient }}>
                  <span className="gc-card-emoji">{tmpl.icon}</span>
                  <span className="gc-card-amount">{formatCurrency(card.initial_value)}</span>
                  <span className="gc-card-code">{card.code}</span>
                </div>
                <div className="gc-card-body">
                  <div className="gc-card-row">
                    <span className="gc-card-label">Balance</span>
                    <strong>{formatCurrency(card.remaining_value)}</strong>
                  </div>
                  <div className="gc-card-progress">
                    <div className="gc-card-progress-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  {card.issued_to_name && (
                    <div className="gc-card-row"><span className="gc-card-label">Recipient</span><span>{card.issued_to_name}</span></div>
                  )}
                  <div className="gc-card-row"><span className="gc-card-label">Expires</span><span>{formatDate(card.expires_at)}</span></div>
                  <div className="gc-card-footer">
                    <StatusBadge status={card.status} />
                    <button className="gc-btn-icon" title="Copy code" onClick={e => { e.stopPropagation(); copyCode(card.code); }}><Copy size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="gc-pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Sell Gift Card</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="gc-form">
            <label className="gc-form-label">Choose Design</label>
            <div className="gc-template-grid">
              {TEMPLATES.map(t => (
                <div key={t.id} className={`gc-template-opt ${form.template === t.id ? 'selected' : ''}`} onClick={() => setForm(p => ({ ...p, template: t.id }))}>
                  <div className="gc-template-preview" style={{ background: t.gradient }}>
                    <span>{t.icon}</span>
                  </div>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>

            <label className="gc-form-label">Amount</label>
            <div className="gc-amount-grid">
              {PRESET_AMOUNTS.map(a => (
                <button key={a} className={`gc-amount-opt ${!form.custom_amount && form.initial_value === a ? 'selected' : ''}`} onClick={() => setForm(p => ({ ...p, initial_value: a, custom_amount: false }))}>
                  {a}
                </button>
              ))}
              <button className={`gc-amount-opt ${form.custom_amount ? 'selected' : ''}`} onClick={() => setForm(p => ({ ...p, custom_amount: true }))}>
                Custom
              </button>
            </div>
            {form.custom_amount && (
              <input type="number" min="1" placeholder="Enter custom amount" className="gc-input" value={form.initial_value} onChange={e => setForm(p => ({ ...p, initial_value: parseFloat(e.target.value) || 0 }))} />
            )}

            <div className="gc-form-row">
              <div className="gc-field">
                <label>Recipient Name</label>
                <input className="gc-input" value={form.issued_to_name} onChange={e => setForm(p => ({ ...p, issued_to_name: e.target.value }))} placeholder="Who is this for?" />
              </div>
              <div className="gc-field">
                <label>Validity</label>
                <select className="gc-input" value={form.validity_months} onChange={e => setForm(p => ({ ...p, validity_months: parseInt(e.target.value) }))}>
                  <option value={6}>6 Months</option>
                  <option value={12}>1 Year</option>
                  <option value={24}>2 Years</option>
                  <option value={36}>3 Years</option>
                </select>
              </div>
            </div>

            <div className="gc-form-row">
              <div className="gc-field">
                <label>Email</label>
                <input className="gc-input" type="email" value={form.issued_to_email} onChange={e => setForm(p => ({ ...p, issued_to_email: e.target.value }))} placeholder="recipient@email.com" />
              </div>
              <div className="gc-field">
                <label>Phone</label>
                <input className="gc-input" value={form.issued_to_phone} onChange={e => setForm(p => ({ ...p, issued_to_phone: e.target.value }))} placeholder="+971..." />
              </div>
            </div>

            <div className="gc-field">
              <label>Personal Message</label>
              <textarea className="gc-input" rows={2} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Add a personal touch..." />
            </div>

            {/* Preview */}
            <label className="gc-form-label">Preview</label>
            <div className="gc-preview-card" style={{ background: getTemplate(form.template).gradient }}>
              <span className="gc-preview-emoji">{getTemplate(form.template).icon}</span>
              <span className="gc-preview-amount">{form.initial_value || 0}</span>
              <span className="gc-preview-name">{form.issued_to_name || 'Recipient'}</span>
              {form.message && <span className="gc-preview-msg">"{form.message}"</span>}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="gc-btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="gc-btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create & Sell'}</button>
        </Modal.Footer>
      </Modal>

      {/* ── View Modal ── */}
      <Modal show={showView} onHide={() => setShowView(false)} size="lg" centered>
        {viewing && (
          <>
            <Modal.Header closeButton><Modal.Title><Gift size={18} /> Gift Card Details</Modal.Title></Modal.Header>
            <Modal.Body>
              <div className="gc-detail">
                <div className="gc-detail-visual" style={{ background: getTemplate(viewing.template).gradient }}>
                  <span className="gc-detail-emoji">{getTemplate(viewing.template).icon}</span>
                  <span className="gc-detail-amount">{formatCurrency(viewing.initial_value)}</span>
                  <span className="gc-detail-code">{viewing.code}</span>
                  <button className="gc-copy-btn" onClick={() => copyCode(viewing.code)}>
                    <Copy size={14} /> {copiedCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className="gc-detail-grid">
                  <div><label>Status</label><StatusBadge status={viewing.status} /></div>
                  <div><label>Balance</label><p><strong>{formatCurrency(viewing.remaining_value)}</strong> / {formatCurrency(viewing.initial_value)}</p></div>
                  <div><label>Recipient</label><p>{viewing.issued_to_name || '-'}</p></div>
                  <div><label>Email</label><p>{viewing.issued_to_email || '-'}</p></div>
                  <div><label>Phone</label><p>{viewing.issued_to_phone || '-'}</p></div>
                  <div><label>Expires</label><p>{formatDate(viewing.expires_at)}</p></div>
                  <div><label>Created</label><p>{formatDate(viewing.created_at)}</p></div>
                  <div><label>Currency</label><p>{viewing.currency || currency}</p></div>
                </div>

                {viewing.message && <div className="gc-detail-msg">"{viewing.message}"</div>}

                {viewing.transactions && viewing.transactions.length > 0 && (
                  <div className="gc-txn-section">
                    <h6>Transaction History</h6>
                    <div className="gc-txn-list">
                      {viewing.transactions.map(tx => (
                        <div key={tx.id} className="gc-txn-row">
                          <div className="gc-txn-type">
                            {tx.type === 'purchase' ? <DollarSign size={14} /> : tx.type === 'redeem' ? <ShoppingBag size={14} /> : <RefreshCw size={14} />}
                            <span>{tx.type}</span>
                          </div>
                          <span className={`gc-txn-amount ${tx.type === 'redeem' ? 'negative' : ''}`}>
                            {tx.type === 'redeem' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </span>
                          <span className="gc-txn-bal">Bal: {formatCurrency(tx.balance_after)}</span>
                          <span className="gc-txn-date">{formatDate(tx.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {viewing.status === 'active' && (
                <button className="gc-btn-outline" onClick={() => handleVoid(viewing.id)}><Ban size={14} /> Void</button>
              )}
              <button className="gc-btn-outline" onClick={() => setShowView(false)}>Close</button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* ── Redeem Modal ── */}
      <Modal show={showRedeem} onHide={() => setShowRedeem(false)} centered>
        <Modal.Header closeButton><Modal.Title><Tag size={18} /> Redeem Gift Card</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="gc-form">
            <div className="gc-field">
              <label>Gift Card Code</label>
              <input className="gc-input" value={redeemForm.code} onChange={e => setRedeemForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="XXXX-XXXX-XXXX-XXXX" />
            </div>
            <div className="gc-field">
              <label>Amount to Redeem</label>
              <input className="gc-input" type="number" min="0.01" step="0.01" value={redeemForm.amount} onChange={e => setRedeemForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="gc-btn-outline" onClick={() => setShowRedeem(false)}>Cancel</button>
          <button className="gc-btn-primary" onClick={handleRedeem} disabled={saving}>{saving ? 'Processing...' : 'Redeem'}</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
