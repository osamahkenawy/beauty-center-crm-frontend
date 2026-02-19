import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShoppingCart, Search, Package, Plus, Minus, X, Check, Trash2
} from 'lucide-react';
import './OnlineStore.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const publicFetch = async (ep) => { const r = await fetch(`${API_URL}${ep}`); return r.json(); };
const publicPost = async (ep, body) => {
  const r = await fetch(`${API_URL}${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
};

export default function OnlineStore() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    (async () => {
      try {
        const data = await publicFetch(`/public/booking/${slug}/store`);
        if (!data.success) { setError(data.message); return; }
        setStore(data.data);
        setProducts(data.data.products || []);
        setAllCategories(data.data.categories || []);
      } catch { setError('Unable to connect'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  // Filter products
  const filtered = useMemo(() => {
    let list = products;
    if (category) list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [products, category, search]);

  const addToCart = (product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product_id: product.id, name: product.name, price: parseFloat(product.price), quantity: 1, image_url: product.image_url }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const removeItem = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const handleCheckout = async () => {
    if (!checkoutForm.name || (!checkoutForm.email && !checkoutForm.phone)) return;
    setSubmitting(true);
    try {
      const result = await publicPost(`/public/booking/${slug}/store/checkout`, {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name: checkoutForm.name,
        customer_email: checkoutForm.email,
        customer_phone: checkoutForm.phone,
        shipping_address: checkoutForm.address ? { address: checkoutForm.address } : null,
        notes: checkoutForm.notes,
      });
      if (result.success) {
        setOrderResult(result.data);
        setCart([]);
        setCartOpen(false);
        setCheckoutOpen(false);
      } else {
        alert(result.message || 'Checkout failed');
      }
    } catch { alert('Connection error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="os-page"><div className="os-loading"><div className="os-spinner" /> Loading store...</div></div>;
  if (error) return <div className="os-page"><div className="os-empty"><h2>😔 {error}</h2><p>This store is not available.</p></div></div>;

  if (orderResult) {
    return (
      <div className="os-page">
        <div className="os-header">
          <div className="os-header-inner">
            <div className="os-header-left">
              {store?.business?.logo_url ? <img src={store.business.logo_url} alt="" className="os-logo" /> :
                <div className="os-logo-ph">{store?.business?.name?.[0]}</div>}
              <div className="os-header-text"><h1>{store?.business?.name}</h1><p>Online Store</p></div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 72, height: 72, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={36} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Order Placed!</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>Your order has been submitted successfully.</p>
            <div style={{ background: '#f8fafc', borderRadius: 14, padding: 20, textAlign: 'left', marginBottom: 16 }}>
              <p style={{ margin: '6px 0', fontSize: '0.88rem' }}><strong>Order #:</strong> {orderResult.order_number}</p>
              <p style={{ margin: '6px 0', fontSize: '0.88rem' }}><strong>Total:</strong> {orderResult.currency} {orderResult.total?.toFixed(2)}</p>
              <p style={{ margin: '6px 0', fontSize: '0.88rem' }}><strong>Items:</strong> {orderResult.items?.length || 0}</p>
              <p style={{ margin: '6px 0', fontSize: '0.88rem' }}><strong>Status:</strong> <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pending</span></p>
            </div>
            <button onClick={() => { setOrderResult(null); }} style={{ padding: '12px 24px', background: '#f2421b', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
              Continue Shopping
            </button>
          </div>
        </div>
        <div className="os-footer">Powered by <a href="https://trasealla.com" target="_blank" rel="noreferrer">Trasealla</a></div>
      </div>
    );
  }

  return (
    <div className="os-page">
      {/* Header */}
      <div className="os-header">
        <div className="os-header-inner">
          <div className="os-header-left">
            {store?.business?.logo_url ? <img src={store.business.logo_url} alt="" className="os-logo" /> :
              <div className="os-logo-ph">{store?.business?.name?.[0]}</div>}
            <div className="os-header-text"><h1>{store?.business?.name}</h1><p>Online Store</p></div>
          </div>
          <button className="os-cart-btn" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={18} /> Cart
            {cartCount > 0 && <span className="os-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="os-toolbar">
        <input className="os-search" placeholder="Search products..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button className={`os-filter-btn ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
        {allCategories.map(c => (
          <button key={c} className={`os-filter-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {/* Products */}
      <div className="os-content">
        {filtered.length === 0 ? (
          <div className="os-empty"><Package size={48} /><h3>No products found</h3></div>
        ) : (
          <div className="os-grid">
            {filtered.map(p => (
              <div key={p.id} className="os-product-card">
                <div className="os-product-img">
                  {p.image_url ? <img src={p.image_url} alt={p.name} /> : <Package size={40} />}
                </div>
                <div className="os-product-body">
                  {p.category && <div className="os-product-cat">{p.category}</div>}
                  <div className="os-product-name">{p.name}</div>
                  {p.description && <div className="os-product-desc">{p.description}</div>}
                  <div className="os-product-footer">
                    <div>
                      <div className="os-product-price">{store?.business?.currency || 'AED'} {parseFloat(p.price).toFixed(2)}</div>
                      <div className={`os-product-stock ${p.stock_quantity < 5 ? 'low' : ''}`}>
                        {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                      </div>
                    </div>
                    <button className="os-add-btn" onClick={() => addToCart(p)} disabled={p.stock_quantity <= 0}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Overlay */}
      <div className={`os-cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <div className={`os-cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="os-cart-header">
          <h2>Your Cart ({cartCount})</h2>
          <button className="os-cart-close" onClick={() => setCartOpen(false)}>×</button>
        </div>
        <div className="os-cart-items">
          {cart.length === 0 ? (
            <div className="os-cart-empty">
              <ShoppingCart size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Your cart is empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product_id} className="os-cart-item">
              <div className="os-cart-item-img">
                {item.image_url ? <img src={item.image_url} alt="" /> : <Package size={20} />}
              </div>
              <div className="os-cart-item-info">
                <div className="os-cart-item-name">{item.name}</div>
                <div className="os-cart-item-price">{store?.business?.currency || 'AED'} {item.price.toFixed(2)}</div>
                <div className="os-cart-item-qty">
                  <button className="os-qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button className="os-qty-btn" onClick={() => updateQty(item.product_id, 1)}>+</button>
                  <button className="os-qty-btn" onClick={() => removeItem(item.product_id)} style={{ marginLeft: 'auto', color: '#ef4444', borderColor: '#fecaca' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="os-cart-footer">
            <div className="os-cart-total">
              <span>Total</span>
              <span>{store?.business?.currency || 'AED'} {cartTotal.toFixed(2)}</span>
            </div>
            <button className="os-checkout-btn" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="os-checkout-overlay">
          <div className="os-checkout-modal">
            <h2>Checkout</h2>
            <div className="os-form-group">
              <label>Full Name *</label>
              <input placeholder="John Doe" value={checkoutForm.name} onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="os-form-group">
              <label>Phone *</label>
              <input placeholder="+971 50 123 4567" value={checkoutForm.phone} onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="os-form-group">
              <label>Email</label>
              <input placeholder="john@example.com" value={checkoutForm.email} onChange={e => setCheckoutForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="os-form-group">
              <label>Shipping Address</label>
              <textarea placeholder="Full address..." rows={2} value={checkoutForm.address} onChange={e => setCheckoutForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="os-form-group">
              <label>Notes (optional)</label>
              <textarea placeholder="Any special instructions..." rows={2} value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total ({cartCount} items)</span>
              <span style={{ color: '#f2421b' }}>{store?.business?.currency || 'AED'} {cartTotal.toFixed(2)}</span>
            </div>
            <div className="os-checkout-actions">
              <button className="os-cancel-btn" onClick={() => setCheckoutOpen(false)}>Cancel</button>
              <button className="os-place-btn" onClick={handleCheckout} disabled={submitting || !checkoutForm.name || (!checkoutForm.email && !checkoutForm.phone)}>
                {submitting ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="os-footer">Powered by <a href="https://trasealla.com" target="_blank" rel="noreferrer">Trasealla</a></div>
    </div>
  );
}
