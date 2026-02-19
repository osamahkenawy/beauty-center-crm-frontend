import { useState, useEffect, useCallback, useContext } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Search, X, Receipt, RefreshCw, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
import './POS.css';

export default function POS() {
  const { symbol: currencySymbol, currency } = useCurrency();
  const CS = () => <CurrencySymbol currency={currency} symbol={currencySymbol} style={{ display: 'inline', fontSize: 'inherit', verticalAlign: 'baseline' }} />;
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [taxRate, setTaxRate] = useState(5);
  const [tip, setTip] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, clientRes, staffRes, branchRes, catRes, statsRes] = await Promise.all([
        api.get('/products?active=true'),
        api.get('/contacts?limit=100'),
        api.get('/staff?limit=100'),
        api.get('/branches'),
        api.get('/service-categories'),
        api.get('/pos/stats'),
      ]);
      if (svcRes.success) setServices(svcRes.data || []);
      if (clientRes.success) setClients(clientRes.data || []);
      if (staffRes.success) setStaff(staffRes.data || []);
      if (branchRes.success) setBranches(branchRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (e) {
      console.error('POS fetch error:', e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load POS data', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredServices = services.filter(s => {
    const matchSearch = !searchTerm || s.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = activeCategory === 'all' || s.category_id == activeCategory;
    return matchSearch && matchCat;
  });

  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (c.first_name || '').toLowerCase().includes(q) || (c.last_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  // Cart management
  const addToCart = (service) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === service.id);
      if (existing) {
        return prev.map(i => i.id === service.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: service.id, name: service.name, price: parseFloat(service.unit_price || 0), quantity: 1, type: 'service' }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const tipAmount = parseFloat(tip) || 0;
  const discountAmount = discountType === 'percentage' ? subtotal * ((parseFloat(discount) || 0) / 100) : (parseFloat(discount) || 0);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * ((parseFloat(taxRate) || 0) / 100);
  const total = afterDiscount + taxAmount + tipAmount;
  const paid = parseFloat(amountPaid) || total;
  const change = Math.max(0, paid - total);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await api.post('/pos/checkout', {
        items: cart,
        customer_id: selectedClient?.id,
        discount_amount: discount,
        discount_type: discountType,
        tax_rate: taxRate,
        tip: tipAmount,
        payment_method: paymentMethod,
        amount_paid: paid,
        notes,
      });
      if (res.success) {
        setShowReceipt(res.data);
        setCart([]);
        setSelectedClient(null);
        setDiscount(0);
        setTip(0);
        setAmountPaid('');
        setNotes('');
        fetchData();
      }
    } catch (e) {
      console.error('Checkout error:', e);
      Swal.fire({ icon: 'error', title: 'Checkout Failed', text: e.message || 'Something went wrong', confirmButtonColor: '#f2421b' });
    }
    setProcessing(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/pos/transactions?limit=30');
      if (res.success) setTransactions(res.data || []);
    } catch (e) { console.error('History error:', e); }
    setShowHistory(true);
  };

  return (
    <div className="pos-layout">
      {/* LEFT: Service Catalog */}
      <div className="pos-catalog">
        {/* Stats Bar */}
        <div className="pos-stats-bar">
          <div className="pos-stat-card">
            <DollarSign size={16} />
            <div>
              <span className="pos-stat-value"><CS />{stats?.today?.revenue?.toFixed(2) || '0.00'}</span>
              <span className="pos-stat-label">Today's Sales</span>
            </div>
          </div>
          <div className="pos-stat-card">
            <ShoppingCart size={16} />
            <div>
              <span className="pos-stat-value">{stats?.today?.sales_count || 0}</span>
              <span className="pos-stat-label">Transactions</span>
            </div>
          </div>
          <div className="pos-stat-card">
            <TrendingUp size={16} />
            <div>
              <span className="pos-stat-value"><CS />{stats?.today?.tips?.toFixed(2) || '0.00'}</span>
              <span className="pos-stat-label">Tips</span>
            </div>
          </div>
          <button className="pos-history-btn" data-tooltip="Refresh history" onClick={fetchHistory}>
            <Clock size={14} /> History
          </button>
        </div>

        {/* Search */}
        <div className="pos-search-bar">
          <Search size={16} />
          <input placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <X size={14} className="pos-search-clear" onClick={() => setSearchTerm('')} />}
        </div>

        {/* Categories */}
        <div className="pos-categories">
          <button className={`pos-cat-btn ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>All</button>
          {categories.map(c => (
            <button key={c.id} className={`pos-cat-btn ${activeCategory == c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
              style={{ '--cat-color': c.color || '#f2421b' }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Service Grid */}
        <div className="pos-service-grid">
          {filteredServices.map(s => (
            <div key={s.id} className="pos-service-card" onClick={() => addToCart(s)}>
              <div className="pos-service-name">{s.name}</div>
              <div className="pos-service-meta">
                <span className="pos-service-duration">{s.duration || 30}m</span>
                <span className="pos-service-price"><CS />{parseFloat(s.unit_price || 0).toFixed(2)}</span>
              </div>
              <Plus size={16} className="pos-service-add" />
            </div>
          ))}
          {filteredServices.length === 0 && (
            <div className="pos-empty">No services found</div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="pos-cart-panel">
        <div className="pos-cart-header">
          <h3><ShoppingCart size={18} /> Cart</h3>
          {cart.length > 0 && (
            <button className="pos-clear-btn" data-tooltip="Clear all items" onClick={() => setCart([])}>
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>

        {/* Client Selection */}
        <div className="pos-client-select">
          {selectedClient ? (
            <div className="pos-selected-client">
              <Users size={14} />
              <span>{selectedClient.first_name} {selectedClient.last_name}</span>
              <X size={14} className="pos-remove-client" onClick={() => setSelectedClient(null)} />
            </div>
          ) : (
            <div className="pos-client-search-wrap">
              <input placeholder="Search client..." value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                onFocus={() => setShowClientSearch(true)} />
              {showClientSearch && clientSearch && (
                <div className="pos-client-dropdown">
                  {filteredClients.slice(0, 8).map(c => (
                    <div key={c.id} className="pos-client-option"
                      onClick={() => { setSelectedClient(c); setShowClientSearch(false); setClientSearch(''); }}>
                      {c.first_name} {c.last_name} {c.phone && <small>({c.phone})</small>}
                    </div>
                  ))}
                  {filteredClients.length === 0 && <div className="pos-client-option disabled">No clients found</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <ShoppingCart size={32} strokeWidth={1} />
              <p>Add services to begin</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="pos-cart-item">
              <div className="pos-cart-item-info">
                <span className="pos-cart-item-name">{item.name}</span>
                <span className="pos-cart-item-price"><CS />{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="pos-cart-item-controls">
                <button data-tooltip="Decrease qty" onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></button>
                <span className="pos-cart-qty">{item.quantity}</span>
                <button data-tooltip="Increase qty" onClick={() => updateQuantity(item.id, 1)}><Plus size={12} /></button>
                <button className="pos-remove-item" data-tooltip="Remove item" onClick={() => removeFromCart(item.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div className="pos-totals">
            <div className="pos-total-row">
              <span>Subtotal</span>
              <span><CS />{subtotal.toFixed(2)}</span>
            </div>

            <div className="pos-discount-row">
              <div className="pos-discount-input">
                <span>Discount</span>
                <div className="pos-discount-controls">
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" />
                  <select value={discountType} onChange={e => setDiscountType(e.target.value)}>
                    <option value="fixed"><CS /></option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
              {discountAmount > 0 && <span className="pos-discount-value">-<CS />{discountAmount.toFixed(2)}</span>}
            </div>

            <div className="pos-total-row">
              <span>Tax ({taxRate}%)</span>
              <span><CS />{taxAmount.toFixed(2)}</span>
            </div>

            <div className="pos-tip-row">
              <span>Tip</span>
              <input type="number" value={tip} onChange={e => setTip(e.target.value)} min="0" placeholder="0" />
            </div>

            <div className="pos-total-row pos-grand-total">
              <span>Total</span>
              <span><CS />{total.toFixed(2)}</span>
            </div>

            {/* Payment Method */}
            <div className="pos-payment-methods">
              {[
                { key: 'cash', label: 'Cash', icon: <Banknote size={14} /> },
                { key: 'card', label: 'Card', icon: <CreditCard size={14} /> },
                { key: 'bank_transfer', label: 'Bank', icon: <DollarSign size={14} /> },
              ].map(m => (
                <button key={m.key} className={`pos-pay-btn ${paymentMethod === m.key ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(m.key)}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="pos-cash-input">
                <span>Amount Tendered</span>
                <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                  placeholder={total.toFixed(2)} />
                {change > 0 && <div className="pos-change">Change: <CS />{change.toFixed(2)}</div>}
              </div>
            )}

            <div className="pos-notes-input">
              <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button className="pos-checkout-btn" data-tooltip="Complete sale" onClick={handleCheckout} disabled={processing || cart.length === 0}>
              {processing ? 'Processing...' : <><span>Charge </span><CS />{total.toFixed(2)}</>}
            </button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <Modal show={!!showReceipt} onHide={() => setShowReceipt(null)} centered className="pos-receipt-modal">
        <Modal.Body>
          {showReceipt && (
            <div className="pos-receipt">
              <div className="pos-receipt-icon">✓</div>
              <h4>Payment Successful</h4>
              <p className="pos-receipt-txn">#{showReceipt.transaction_number}</p>
              <div className="pos-receipt-details">
                <div className="pos-receipt-row"><span>Subtotal</span><span><CS />{showReceipt.subtotal?.toFixed(2)}</span></div>
                {showReceipt.discount > 0 && <div className="pos-receipt-row"><span>Discount</span><span>-<CS />{showReceipt.discount?.toFixed(2)}</span></div>}
                <div className="pos-receipt-row"><span>Tax</span><span><CS />{showReceipt.tax?.toFixed(2)}</span></div>
                {showReceipt.tip > 0 && <div className="pos-receipt-row"><span>Tip</span><span><CS />{showReceipt.tip?.toFixed(2)}</span></div>}
                <div className="pos-receipt-row total"><span>Total</span><span><CS />{showReceipt.total?.toFixed(2)}</span></div>
                <div className="pos-receipt-row"><span>Paid ({showReceipt.payment_method})</span><span><CS />{showReceipt.amount_paid?.toFixed(2)}</span></div>
                {showReceipt.change > 0 && <div className="pos-receipt-row"><span>Change</span><span><CS />{showReceipt.change?.toFixed(2)}</span></div>}
              </div>
              <button className="pos-receipt-close" onClick={() => setShowReceipt(null)}>Done</button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* History Modal */}
      <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg" centered>
        <Modal.Header closeButton className="pos-modal-header">
          <Modal.Title><Receipt size={18} /> Transaction History</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table className="pos-history-table">
            <thead>
              <tr>
                <th>TXN #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.transaction_number}</strong></td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>{t.customer_first_name ? `${t.customer_first_name} ${t.customer_last_name || ''}` : '—'}</td>
                  <td>{(t.items || []).length} items</td>
                  <td><strong><CS />{parseFloat(t.total || 0).toFixed(2)}</strong></td>
                  <td><span className="pos-badge-method">{t.payment_method}</span></td>
                  <td><span className={`pos-badge-status ${t.status}`}>{t.status}</span></td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#999' }}>No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </Modal.Body>
      </Modal>
    </div>
  );
}
