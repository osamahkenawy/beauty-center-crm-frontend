import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as IconoirIcons from 'iconoir-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
import './GiftCards.css';

/* ── Curated icon set for gift card designs ── */
const ICON_CATALOG = [
  'Gift', 'Heart', 'HeartSolid', 'Star', 'StarSolid', 'Trophy', 'Medal', 'Crown',
  'BirthdayCake', 'Flower', 'Leaf', 'Spark', 'Sparks', 'SparkSolid',
  'SunLight', 'HalfMoon', 'MoonSat', 'SeaAndSun', 'Diamond',
  'CreditCard', 'Wallet', 'Dollar', 'MoneySquare', 'HandCard',
  'ShoppingBag', 'Bag', 'Handbag', 'Cart', 'Shop',
  'Scissor', 'Palette', 'Rings', 'BrightCrown', 'BrightStar',
  'Peace', 'PeaceHand', 'ThreeStars', 'CircleSpark', 'BubbleStar',
  'UserStar', 'UserLove', 'UserCrown', 'DocStar',
  'AppleWallet', 'Label', 'Percentage',
  'Check', 'Plus', 'Eye', 'Bell', 'Music', 'Camera', 'Film',
  'Book', 'BookmarkBook', 'Globe', 'Airplane', 'Car',
  'Coffee', 'Yoga', 'Running', 'Bicycle', 'Swimming',
  'Clothes', 'TShirt', 'Perfume', 'Lipstick',
].filter(name => !!IconoirIcons[name]);

/* ── Color presets for card backgrounds ── */
const COLOR_PRESETS = [
  { hex: '#f2421b', name: 'Coral' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#8b5cf6', name: 'Purple' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#1e293b', name: 'Midnight' },
  { hex: '#64748b', name: 'Slate' },
  { hex: '#be185d', name: 'Fuchsia' },
  { hex: '#7c3aed', name: 'Violet' },
];

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#10b981' },
  redeemed: { label: 'Redeemed', color: '#8b5cf6' },
  expired:  { label: 'Expired',  color: '#f59e0b' },
  void:     { label: 'Void',     color: '#94a3b8' },
};

/* ── Helper: render an iconoir icon by name ── */
function IconByName({ name, size = 20, color, strokeWidth = 1.8, ...props }) {
  const Comp = IconoirIcons[name];
  if (!Comp) return <IconoirIcons.Gift width={size} height={size} color={color} strokeWidth={strokeWidth} {...props} />;
  return <Comp width={size} height={size} color={color} strokeWidth={strokeWidth} {...props} />;
}

/* ── Helper: generate gradient from a single color ── */
function colorToGradient(hex) {
  return `linear-gradient(135deg, ${hex} 0%, ${lighten(hex, 25)} 100%)`;
}
function lighten(hex, pct) {
  let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + Math.round((255 - r) * pct / 100));
  g = Math.min(255, g + Math.round((255 - g) * pct / 100));
  b = Math.min(255, b + Math.round((255 - b) * pct / 100));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function GiftCards() {
  const { symbol, format: formatCurr, currency } = useCurrency();
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    message: '', card_color: '#f2421b', card_icon: 'Gift', validity_months: 12, notes: '', custom_amount: false
  });

  // Redeem form
  const [redeemForm, setRedeemForm] = useState({ code: '', amount: '' });

  // Icon picker state
  const [iconSearch, setIconSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // ── Data fetching ──
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
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await api.get(url);
      if (res.success) {
        setCards(res.data || []);
        if (res.pagination) setPagination(prev => ({ ...prev, ...res.pagination }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, debouncedSearch, pagination.limit]);

  // Fetch stats on mount
  useEffect(() => { fetchStats(); }, []);

  // Debounce search — wait 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(p => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Re-fetch cards when filter, debounced search, or page changes
  useEffect(() => {
    fetchCards(pagination.page);
  }, [fetchCards, pagination.page]);

  // ── Escape key ──
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (showIconPicker) { setShowIconPicker(false); return; }
        if (showCreate) setShowCreate(false);
        if (showView) setShowView(false);
        if (showRedeem) setShowRedeem(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showCreate, showView, showRedeem, showIconPicker]);

  // ── Handlers ──
  const handleCreate = async () => {
    if (!form.initial_value || form.initial_value <= 0) return alert('Enter a valid amount');
    setSaving(true);
    try {
      const res = await api.post('/gift-cards', { ...form, template: 'custom' });
      if (res.success) {
        setShowCreate(false);
        fetchCards(); fetchStats();
        setForm({ initial_value: 100, issued_to_name: '', issued_to_email: '', issued_to_phone: '', message: '', card_color: '#f2421b', card_icon: 'Gift', validity_months: 12, notes: '', custom_amount: false });
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
    if (!confirm('Void this gift card? This action cannot be undone.')) return;
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
      } else { alert(res.message || 'Redemption failed'); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── Formatters ──
  const fmtCurrency = (v) => {
    const n = parseFloat(v || 0);
    return formatCurr ? formatCurr(n, { symbolOnly: true }) : n.toFixed(2);
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // ── Card visual helpers ──
  const getCardColor = (card) => card.card_color || '#f2421b';
  const getCardIcon = (card) => card.card_icon || 'Gift';

  // ── Filtered icons for picker ──
  const filteredIcons = useMemo(() => {
    if (!iconSearch) return ICON_CATALOG;
    const q = iconSearch.toLowerCase();
    return ICON_CATALOG.filter(name => name.toLowerCase().includes(q));
  }, [iconSearch]);

  // ── StatusBadge ──
  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    return (
      <span className="gc-status-badge" style={{ '--gc-badge': cfg.color }}>
        <IconByName name={status === 'active' ? 'Check' : status === 'redeemed' ? 'ShoppingBag' : status === 'expired' ? 'Clock' : 'Prohibition'} size={13} strokeWidth={2.5} />
        {cfg.label}
      </span>
    );
  };

  const getProgressClass = (pct) => {
    if (pct >= 95) return 'full';
    if (pct <= 5) return 'empty';
    if (pct < 40) return 'mid';
    return '';
  };

  return (
    <div className="gc-page">
      {/* Print Header */}
      <div className="gc-print-header" style={{ display: 'none' }}>
        <div className="gc-print-logo">
          <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="gc-print-meta">
          <h1>Gift Cards Report</h1>
          <p>Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><IconoirIcons.Gift width={26} height={26} strokeWidth={2} /></div>
          <div>
            <h1 className="module-hero-title">Gift Cards</h1>
            <p className="module-hero-sub">Sell, track, and manage gift cards for your beauty center</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline btn-export-csv" data-tooltip="Download Excel" onClick={() => {
            const rows = [
              ['Code', 'Issued To', 'Email', 'Phone', 'Initial Value', 'Current Balance', 'Status', 'Issued Date', 'Expiry Date'],
              ...cards.map(c => [
                c.code || '-',
                c.issued_to_name || '-',
                c.issued_to_email || '-',
                c.issued_to_phone || '-',
                formatCurr(c.initial_value || 0),
                formatCurr(c.current_balance || 0),
                STATUS_CONFIG[c.status]?.label || c.status || '-',
                fmtDate(c.created_at),
                c.expiry_date ? fmtDate(c.expiry_date) : '-',
              ])
            ];
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gift-cards-${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Excel
          </button>
          <button className="module-btn module-btn-outline btn-print" data-tooltip="Print gift cards" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button className="module-btn module-btn-outline" onClick={() => setShowRedeem(true)}>
            <IconoirIcons.Label width={16} height={16} /> Redeem
          </button>
          <button className="module-btn module-btn-primary" onClick={() => setShowCreate(true)}>
            <IconoirIcons.Plus width={16} height={16} strokeWidth={2.5} /> Sell Gift Card
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="gc-stats-grid">
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#fef0ec' }}>
            <IconoirIcons.Gift width={22} height={22} color="#f2421b" strokeWidth={2} />
          </div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{stats.total || 0}</span>
            <span className="gc-stat-lbl">Total Cards</span>
          </div>
          {(stats.active_count > 0) && <span className="gc-stat-tag">{stats.active_count} active</span>}
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#dcfce7' }}>
            <IconoirIcons.Dollar width={22} height={22} color="#10b981" strokeWidth={2} />
          </div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{fmtCurrency(stats.total_sold)}</span>
            <span className="gc-stat-lbl">Total Sold</span>
          </div>
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#fef3c7' }}>
            <IconoirIcons.Wallet width={22} height={22} color="#f59e0b" strokeWidth={2} />
          </div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{fmtCurrency(stats.total_outstanding)}</span>
            <span className="gc-stat-lbl">Outstanding</span>
          </div>
        </div>
        <div className="gc-stat-card">
          <div className="gc-stat-icon" style={{ background: '#ede9fe' }}>
            <IconoirIcons.ShoppingBag width={22} height={22} color="#8b5cf6" strokeWidth={2} />
          </div>
          <div className="gc-stat-body">
            <span className="gc-stat-val">{fmtCurrency(stats.total_redeemed)}</span>
            <span className="gc-stat-lbl">Redeemed</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="gc-toolbar">
        <div className="gc-search">
          <IconoirIcons.Search width={16} height={16} />
          <input
            placeholder="Search by code, name, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="gc-filter-tabs">
          {[{ k: '', l: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} className={`gc-filter-tab ${filterStatus === f.k ? 'active' : ''}`}
              onClick={() => { setFilterStatus(f.k); setPagination(p => ({ ...p, page: 1 })); }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div className="gc-loading"><div className="gc-loading-spinner" /><span>Loading gift cards...</span></div>
      ) : cards.length === 0 ? (
        <div className="gc-empty">
          <div className="gc-empty-icon"><IconoirIcons.Gift width={36} height={36} strokeWidth={1.5} /></div>
          <h3>No gift cards found</h3>
          <p>{filterStatus ? 'Try changing your filters' : 'Start by selling your first gift card'}</p>
          {!filterStatus && (
            <button className="gc-btn-primary" onClick={() => setShowCreate(true)}>
              <IconoirIcons.Plus width={16} height={16} strokeWidth={2.5} /> Sell Gift Card
            </button>
          )}
        </div>
      ) : (
        <div className="gc-grid">
          {cards.map(card => {
            const pct = card.initial_value > 0 ? ((card.remaining_value / card.initial_value) * 100) : 0;
            return (
              <div key={card.id} className="gc-card" onClick={() => handleView(card)}>
                <div className="gc-card-visual" style={{ background: colorToGradient(getCardColor(card)) }}>
                  <span className="gc-card-icon-wrap">
                    <IconByName name={getCardIcon(card)} size={28} color="rgba(255,255,255,0.35)" strokeWidth={1.5} />
                  </span>
                  <span className="gc-card-amount">{fmtCurrency(card.initial_value)}</span>
                  <span className="gc-card-code">{card.code}</span>
                </div>
                <div className="gc-card-body">
                  <div className="gc-card-row">
                    <span className="gc-card-label">Balance</span>
                    <strong>{fmtCurrency(card.remaining_value)}</strong>
                  </div>
                  <div className="gc-card-progress">
                    <div className={`gc-card-progress-fill ${getProgressClass(pct)}`} style={{ width: `${pct.toFixed(0)}%` }} />
                  </div>
                  {card.issued_to_name && (
                    <div className="gc-card-row"><span className="gc-card-label">Recipient</span><span>{card.issued_to_name}</span></div>
                  )}
                  <div className="gc-card-row"><span className="gc-card-label">Expires</span><span>{fmtDate(card.expires_at)}</span></div>
                  <div className="gc-card-footer">
                    <StatusBadge status={card.status} />
                    <button className="gc-btn-icon gc-no-print" title={copiedCode === card.code ? 'Copied!' : 'Copy code'}
                      onClick={e => { e.stopPropagation(); copyCode(card.code); }}>
                      {copiedCode === card.code
                        ? <IconoirIcons.Check width={16} height={16} color="#10b981" />
                        : <IconoirIcons.Copy width={16} height={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="gc-pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
            <IconoirIcons.NavArrowLeft width={14} height={14} /> Prev
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
            Next <IconoirIcons.NavArrowRight width={14} height={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════
          CREATE MODAL – Split layout with live preview
         ═══════════════════════════════════════ */}
      {showCreate && createPortal(
        <div className="gc-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="gc-modal gc-create-modal" onClick={e => e.stopPropagation()}>
            <div className="gc-modal-header">
              <span className="gc-modal-title"><IconoirIcons.Gift width={22} height={22} /> Sell Gift Card</span>
              <button className="gc-modal-close" onClick={() => setShowCreate(false)}>
                <IconoirIcons.Xmark width={18} height={18} />
              </button>
            </div>

            <div className="gc-create-layout">
              {/* ── Left: Form ── */}
              <div className="gc-create-form">
                {/* Color picker */}
                <div className="gc-form-section">Card Color</div>
                <div className="gc-color-picker">
                  <div className="gc-color-swatches">
                    {COLOR_PRESETS.map(c => (
                      <button key={c.hex} className={`gc-color-swatch ${form.card_color === c.hex ? 'selected' : ''}`}
                        style={{ background: c.hex }}
                        title={c.name}
                        onClick={() => setForm(p => ({ ...p, card_color: c.hex }))}
                      />
                    ))}
                  </div>
                  <div className="gc-color-custom">
                    <input type="color" value={form.card_color}
                      onChange={e => setForm(p => ({ ...p, card_color: e.target.value }))} />
                    <span className="gc-color-hex">{form.card_color}</span>
                  </div>
                </div>

                {/* Icon picker */}
                <div className="gc-form-section">Card Icon</div>
                <div className="gc-icon-picker-trigger" onClick={() => setShowIconPicker(!showIconPicker)}>
                  <div className="gc-selected-icon" style={{ background: colorToGradient(form.card_color) }}>
                    <IconByName name={form.card_icon} size={24} color="#fff" />
                  </div>
                  <span className="gc-selected-icon-name">{form.card_icon}</span>
                  <IconoirIcons.NavArrowDown width={16} height={16} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
                </div>
                {showIconPicker && (
                  <div className="gc-icon-picker">
                    <div className="gc-icon-search">
                      <IconoirIcons.Search width={14} height={14} />
                      <input placeholder="Search icons..." value={iconSearch}
                        onChange={e => setIconSearch(e.target.value)} autoFocus />
                    </div>
                    <div className="gc-icon-grid">
                      {filteredIcons.map(name => (
                        <button key={name}
                          className={`gc-icon-item ${form.card_icon === name ? 'selected' : ''}`}
                          title={name}
                          onClick={() => { setForm(p => ({ ...p, card_icon: name })); setShowIconPicker(false); setIconSearch(''); }}>
                          <IconByName name={name} size={20} color={form.card_icon === name ? '#fff' : '#475569'} />
                        </button>
                      ))}
                      {filteredIcons.length === 0 && <p className="gc-icon-empty">No icons found</p>}
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="gc-form-section">Amount</div>
                <div className="gc-amount-grid">
                  {PRESET_AMOUNTS.map(a => (
                    <button key={a}
                      className={`gc-amount-opt ${!form.custom_amount && form.initial_value === a ? 'selected' : ''}`}
                      onClick={() => setForm(p => ({ ...p, initial_value: a, custom_amount: false }))}>
                      <CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} /> {a}
                    </button>
                  ))}
                  <button className={`gc-amount-opt ${form.custom_amount ? 'selected' : ''}`}
                    onClick={() => setForm(p => ({ ...p, custom_amount: true }))}>
                    Custom
                  </button>
                </div>
                {form.custom_amount && (
                  <div className="gc-custom-amount-row">
                    <span className="gc-custom-currency"><CurrencySymbol currency={currency} symbol={symbol} /></span>
                    <input type="number" min="1" placeholder="Enter amount" className="gc-input gc-custom-input"
                      value={form.initial_value}
                      onChange={e => setForm(p => ({ ...p, initial_value: parseFloat(e.target.value) || 0 }))}
                      autoFocus />
                  </div>
                )}

                {/* Recipient */}
                <div className="gc-form-section">Recipient</div>
                <div className="gc-form-row">
                  <div className="gc-field">
                    <label>Name</label>
                    <input className="gc-input" value={form.issued_to_name}
                      onChange={e => setForm(p => ({ ...p, issued_to_name: e.target.value }))}
                      placeholder="Who is this for?" />
                  </div>
                  <div className="gc-field">
                    <label>Validity</label>
                    <select className="gc-input" value={form.validity_months}
                      onChange={e => setForm(p => ({ ...p, validity_months: parseInt(e.target.value) }))}>
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
                    <input className="gc-input" type="email" value={form.issued_to_email}
                      onChange={e => setForm(p => ({ ...p, issued_to_email: e.target.value }))}
                      placeholder="recipient@email.com" />
                  </div>
                  <div className="gc-field">
                    <label>Phone</label>
                    <input className="gc-input" value={form.issued_to_phone}
                      onChange={e => setForm(p => ({ ...p, issued_to_phone: e.target.value }))}
                      placeholder="+971..." />
                  </div>
                </div>
                <div className="gc-field">
                  <label>Message</label>
                  <textarea className="gc-input" rows={2} value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Add a personal touch..." />
                </div>
              </div>

              {/* ── Right: Live Preview ── */}
              <div className="gc-create-preview">
                <div className="gc-preview-label">Live Preview</div>
                <div className="gc-preview-phone">
                  <div className="gc-preview-notch" />
                  <div className="gc-preview-screen">
                    <div className="gc-preview-card-wrap" style={{ background: colorToGradient(form.card_color) }}>
                      <div className="gc-preview-bg-circle c1" />
                      <div className="gc-preview-bg-circle c2" />
                      <div className="gc-preview-icon-wrap">
                        <IconByName name={form.card_icon} size={40} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                      </div>
                      <div className="gc-preview-value">
                        {fmtCurrency(form.initial_value || 0)}
                      </div>
                      <div className="gc-preview-divider" />
                      <div className="gc-preview-recipient">
                        {form.issued_to_name || 'Recipient Name'}
                      </div>
                      {form.message && (
                        <div className="gc-preview-message">"{form.message}"</div>
                      )}
                      <div className="gc-preview-code-area">
                        <span className="gc-preview-code-label">GIFT CARD</span>
                        <span className="gc-preview-code-value">XXXX-XXXX-XXXX-XXXX</span>
                      </div>
                      <div className="gc-preview-validity">
                        Valid for {form.validity_months} months
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="gc-modal-footer">
              <button className="gc-btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="gc-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : <><IconoirIcons.CreditCard width={16} height={16} /> Create & Sell</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════
          VIEW DETAIL MODAL
         ═══════════════════════════════════════ */}
      {showView && viewing && createPortal(
        <div className="gc-modal-overlay" onClick={() => setShowView(false)}>
          <div className="gc-modal lg" onClick={e => e.stopPropagation()}>
            <div className="gc-modal-header">
              <span className="gc-modal-title"><IconoirIcons.Eye width={22} height={22} /> Gift Card Details</span>
              <button className="gc-modal-close" onClick={() => setShowView(false)}>
                <IconoirIcons.Xmark width={18} height={18} />
              </button>
            </div>
            <div className="gc-modal-body">
              <div className="gc-detail">
                <div className="gc-detail-visual" style={{ background: colorToGradient(getCardColor(viewing)) }}>
                  <span className="gc-detail-icon">
                    <IconByName name={getCardIcon(viewing)} size={36} color="rgba(255,255,255,0.85)" strokeWidth={1.5} />
                  </span>
                  <span className="gc-detail-amount">{fmtCurrency(viewing.initial_value)}</span>
                  <span className="gc-detail-code">{viewing.code}</span>
                  <button className="gc-copy-btn" onClick={() => copyCode(viewing.code)}>
                    <IconoirIcons.Copy width={14} height={14} />
                    {copiedCode === viewing.code ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className="gc-detail-info">
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Status</span>
                    <span className="gc-detail-info-value"><StatusBadge status={viewing.status} /></span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Balance</span>
                    <span className="gc-detail-info-value">{fmtCurrency(viewing.remaining_value)} / {fmtCurrency(viewing.initial_value)}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Recipient</span>
                    <span className="gc-detail-info-value">{viewing.issued_to_name || '—'}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Email</span>
                    <span className="gc-detail-info-value">{viewing.issued_to_email || '—'}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Phone</span>
                    <span className="gc-detail-info-value">{viewing.issued_to_phone || '—'}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Expires</span>
                    <span className="gc-detail-info-value">{fmtDate(viewing.expires_at)}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Created</span>
                    <span className="gc-detail-info-value">{fmtDate(viewing.created_at)}</span>
                  </div>
                  <div className="gc-detail-info-item">
                    <span className="gc-detail-info-label">Currency</span>
                    <span className="gc-detail-info-value">{viewing.currency || currency}</span>
                  </div>
                </div>

                {viewing.message && <div className="gc-detail-msg">"{viewing.message}"</div>}

                {viewing.transactions && viewing.transactions.length > 0 && (
                  <div className="gc-txn-section">
                    <div className="gc-txn-title">
                      <IconoirIcons.RefreshDouble width={16} height={16} /> Transaction History
                    </div>
                    <div className="gc-txn-list">
                      {viewing.transactions.map(tx => (
                        <div key={tx.id} className="gc-txn-row">
                          <div className={`gc-txn-icon ${tx.type}`}>
                            <IconByName name={tx.type === 'purchase' ? 'Dollar' : tx.type === 'redeem' ? 'ShoppingBag' : tx.type === 'void' ? 'Prohibition' : 'RefreshDouble'} size={16} />
                          </div>
                          <div className="gc-txn-type">
                            <span className="gc-txn-type-name">{tx.type}</span>
                            <span className="gc-txn-type-date">{fmtDate(tx.created_at)}</span>
                          </div>
                          <span className={`gc-txn-amount ${tx.type === 'redeem' || tx.type === 'void' ? 'negative' : 'positive'}`}>
                            {tx.type === 'redeem' || tx.type === 'void' ? '−' : '+'}{fmtCurrency(tx.amount)}
                          </span>
                          <span className="gc-txn-bal">Bal: {fmtCurrency(tx.balance_after)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="gc-modal-footer">
              {viewing.status === 'active' && (
                <button className="gc-btn-outline" style={{ color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleVoid(viewing.id)}>
                  <IconoirIcons.Prohibition width={16} height={16} /> Void Card
                </button>
              )}
              <button className="gc-btn-outline" onClick={() => setShowView(false)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════
          REDEEM MODAL
         ═══════════════════════════════════════ */}
      {showRedeem && createPortal(
        <div className="gc-modal-overlay" onClick={() => setShowRedeem(false)}>
          <div className="gc-modal" onClick={e => e.stopPropagation()}>
            <div className="gc-modal-header">
              <span className="gc-modal-title"><IconoirIcons.Label width={22} height={22} /> Redeem Gift Card</span>
              <button className="gc-modal-close" onClick={() => setShowRedeem(false)}>
                <IconoirIcons.Xmark width={18} height={18} />
              </button>
            </div>
            <div className="gc-modal-body">
              <div className="gc-form">
                <div className="gc-field">
                  <label>Gift Card Code</label>
                  <input className="gc-code-input" value={redeemForm.code}
                    onChange={e => setRedeemForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19} />
                </div>
                <div className="gc-field">
                  <label>Amount to Redeem (<CurrencySymbol currency={currency} symbol={symbol} style={{ display: 'inline' }} />)</label>
                  <input className="gc-input" type="number" min="0.01" step="0.01"
                    value={redeemForm.amount}
                    onChange={e => setRedeemForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="gc-modal-footer">
              <button className="gc-btn-outline" onClick={() => setShowRedeem(false)}>Cancel</button>
              <button className="gc-btn-primary" onClick={handleRedeem} disabled={saving || !redeemForm.code || !redeemForm.amount}>
                {saving ? 'Processing...' : <><IconoirIcons.ShoppingBag width={16} height={16} /> Redeem</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
