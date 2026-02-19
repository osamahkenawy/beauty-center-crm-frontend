import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Badge } from 'react-bootstrap';
import {
  Plus, Search, FileText, Eye, Printer, CreditCard, DollarSign,
  Clock, CheckCircle, AlertTriangle, XCircle, Filter, Download,
  Receipt, ArrowUpRight, ArrowDownRight, TrendingUp, Ban, Hash,
  User, Calendar, Banknote, MoreVertical, ChevronDown, Send,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import './BeautyPayments.css';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6', icon: FileText },
  sent: { label: 'Sent', color: '#3b82f6', bg: '#eff6ff', icon: Send },
  paid: { label: 'Paid', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle },
  partially_paid: { label: 'Partial', color: '#f59e0b', bg: '#fffbeb', icon: ArrowDownRight },
  overdue: { label: 'Overdue', color: '#ef4444', bg: '#fef2f2', icon: AlertTriangle },
  void: { label: 'Void', color: '#9ca3af', bg: '#f9fafb', icon: Ban },
};

export default function BeautyPayments() {
  const { t } = useTranslation();
  const { currency, symbol } = useCurrency();
  const printRef = useRef(null);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [viewMode, setViewMode] = useState('table');

  // Business info for invoice header
  const [bizInfo, setBizInfo] = useState({});
  const [defaultTaxRate, setDefaultTaxRate] = useState(5);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const getEmptyForm = () => ({
    customer_id: '', staff_id: '', items: [{ name: '', item_type: 'service', item_id: '', unit_price: 0, quantity: 1, discount: 0 }],
    discount_amount: 0, discount_type: 'fixed', tax_rate: defaultTaxRate, payment_method: 'cash', notes: '', due_date: ''
  });
  const [form, setForm] = useState(getEmptyForm());
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', gift_card_code: '' });
  const [payGcBalance, setPayGcBalance] = useState(null);
  const [payGcChecking, setPayGcChecking] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/invoices/stats');
      if (res.success) setStats(res.data || {});
    } catch (e) { console.error(e); }
  }, []);

  const fetchInvoices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      let url = `/invoices?page=${page}&limit=${pagination.limit}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      if (res.success) {
        setInvoices(res.data || []);
        if (res.pagination) setPagination(prev => ({ ...prev, ...res.pagination }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, fromDate, toDate, search, pagination.limit]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [c, s, st] = await Promise.all([
        api.get('/contacts?limit=500'),
        api.get('/products?active=true'),
        api.get('/staff'),
      ]);
      if (c.success) setCustomers(c.data || []);
      if (s.success) setServices(s.data || []);
      if (st.success) setStaffList(st.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchBizInfo = useCallback(async () => {
    try {
      // Fetch fresh tenant data from API (includes logo_url, address, etc.)
      const data = await api.get('/tenants/current');
      if (data.success && data.data) {
        const t = data.data;
        // Parse settings JSON if present
        let settings = {};
        if (t.settings) {
          try { settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings; } catch (e) { /* ignore */ }
        }
        setBizInfo({
          ...t,
          ...settings,
          company_name: t.name,
          logo: t.logo_url || settings.logo || '',
        });
        // Set default tax rate from settings if available
        if (settings.default_tax_rate !== undefined) {
          setDefaultTaxRate(parseFloat(settings.default_tax_rate) || 0);
        } else if (settings.tax_rate !== undefined) {
          setDefaultTaxRate(parseFloat(settings.tax_rate) || 0);
        }
        return;
      }
    } catch (e) { console.warn('Could not fetch tenant from API:', e); }

    // Fallback: localStorage
    try {
      const tenantStr = localStorage.getItem('crm_tenant');
      if (tenantStr) setBizInfo(JSON.parse(tenantStr));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); fetchInvoices(); fetchDropdowns(); fetchBizInfo(); }, []);
  useEffect(() => { fetchInvoices(pagination.page); }, [pagination.page, filterStatus, fromDate, toDate]);

  // Calculations
  const calcSubtotal = () => form.items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0);
  const calcTotal = () => {
    const sub = calcSubtotal();
    const disc = form.discount_type === 'percentage' ? sub * (form.discount_amount / 100) : form.discount_amount;
    const afterDisc = sub - disc;
    return afterDisc + afterDisc * (form.tax_rate / 100);
  };

  const handleServiceSelect = (idx, serviceId) => {
    const svc = services.find(s => s.id === parseInt(serviceId));
    if (!svc) return;
    const items = [...form.items];
    items[idx] = { ...items[idx], item_id: serviceId, name: svc.name, unit_price: parseFloat(svc.unit_price) || 0 };
    setForm(prev => ({ ...prev, items }));
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { name: '', item_type: 'service', item_id: '', unit_price: 0, quantity: 1, discount: 0 }] }));
  const removeItem = (idx) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const handleCreate = async (status = 'draft') => {
    if (!form.customer_id) return alert('Please select a customer');
    if (!form.items.length || !form.items[0].name) return alert('Please add at least one item');
    setSaving(true);
    try {
      const res = await api.post('/invoices', { ...form, status });
      if (res.success) {
        setShowCreate(false);
        fetchInvoices();
        fetchStats();
        setForm(getEmptyForm());
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleViewInvoice = async (inv) => {
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      if (res.success) { setViewing(res.data); setShowView(true); }
    } catch (e) { console.error(e); }
  };

  const checkPayGcBalance = async (code) => {
    if (!code || code.length < 4) { setPayGcBalance(null); return; }
    setPayGcChecking(true);
    try {
      const res = await api.get(`/gift-cards/check/${encodeURIComponent(code)}`);
      setPayGcBalance(res.success ? res.data : { error: res.message || 'Not found' });
    } catch { setPayGcBalance({ error: 'Gift card not found' }); }
    finally { setPayGcChecking(false); }
  };

  const handlePay = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return;
    if (payForm.payment_method === 'gift_card' && !payForm.gift_card_code) {
      alert('Please enter a gift card code');
      return;
    }
    setSaving(true);
    try {
      const payload = { amount: parseFloat(payForm.amount), payment_method: payForm.payment_method };
      if (payForm.payment_method === 'gift_card') payload.gift_card_code = payForm.gift_card_code;
      const res = await api.post(`/invoices/${viewing.id}/pay`, payload);
      if (res.success) {
        setShowPay(false);
        setPayGcBalance(null);
        handleViewInvoice(viewing);
        fetchInvoices();
        fetchStats();
      } else {
        alert(res.message || 'Payment failed');
      }
    } catch (e) { console.error(e); alert(e.message || 'Payment failed'); }
    finally { setSaving(false); }
  };

  const handleVoid = async (id) => {
    if (!confirm('Are you sure you want to void this invoice?')) return;
    await api.post(`/invoices/${id}/void`);
    fetchInvoices();
    fetchStats();
    if (viewing?.id === id) setShowView(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this draft invoice? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/invoices/${id}`);
      if (res.success) {
        fetchInvoices();
        fetchStats();
      } else {
        alert(res.message || 'Failed to delete invoice');
      }
    } catch (e) {
      console.error(e);
      alert('Only draft invoices can be deleted');
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${viewing?.invoice_number || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; color: #666; padding: 40px; background: #fff; font-size: 14px; line-height: 1.6; }

          .tm-invoice { max-width: 760px; margin: 0 auto; }

          /* Header */
          .tm-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .tm-head-left { flex: 0 0 35%; }
          .tm-logo-img { max-height: 90px; max-width: 200px; width: auto; height: auto; object-fit: contain; }
          .tm-logo-icon { width: 80px; height: 80px; background: #111; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
          .tm-logo-icon svg { width: 40px; height: 40px; }
          .tm-head-right { text-align: right; flex: 0 0 65%; }
          .tm-title { font-size: 30px; font-weight: 600; color: #111; display: block; line-height: 1; margin-bottom: 4px; }
          .tm-inv-number { font-size: 14px; color: #666; margin: 0; }

          /* Divider */
          .tm-divider { height: 1px; background: #dbdfea; margin-bottom: 25px; }

          /* Info Row */
          .tm-info-row { display: flex; margin-bottom: 25px; }
          .tm-info-left { width: 30%; flex: none; }
          .tm-biz-name { font-size: 18px; font-weight: 600; color: #111; margin: 0 0 6px; display: block; }
          .tm-info-left span { display: block; font-size: 14px; line-height: 1.7; color: #666; }
          .tm-info-right { width: 70%; flex: none; }
          .tm-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-gap: 10px 20px; background: #f5f6fa; border: 1px solid #dbdfea; border-radius: 6px; padding: 15px 20px; }
          .tm-detail-grid > div { display: flex; flex-direction: column; gap: 2px; }
          .tm-detail-label { font-size: 13px; color: #888; }
          .tm-detail-grid strong { font-size: 14px; font-weight: 600; color: #111; }
          .tm-status-text.paid { color: #10b981; }
          .tm-status-text.overdue { color: #ef4444; }

          /* Two Column */
          .tm-two-col { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #dbdfea; border-radius: 6px; overflow: hidden; margin-bottom: 30px; }
          .tm-two-col-left { padding: 18px 20px; border-right: 1px solid #dbdfea; }
          .tm-two-col-right { padding: 18px 20px; }
          .tm-section-label { display: block; font-size: 14px; font-weight: 600; color: #111; margin-bottom: 6px; }
          .tm-m0 { margin: 0; font-size: 14px; color: #666; line-height: 1.7; }

          /* Items Table */
          .tm-table-border { border: 1px solid #dbdfea; border-radius: 6px; overflow: hidden; }
          .tm-items-table { width: 100%; border-collapse: collapse; }
          .tm-items-table th { padding: 12px 20px; font-size: 14px; font-weight: 600; color: #111; border-bottom: 1px solid #dbdfea; text-align: left; }
          .tm-items-table td { padding: 14px 20px; font-size: 14px; color: #666; border-bottom: 1px solid #eff2f7; }
          .tm-items-table tbody tr:last-child td { border-bottom: none; }
          .tm-w60 { width: 60%; }
          .tm-w25 { width: 25%; }
          .tm-w15 { width: 15%; }
          .tm-text-right { text-align: right; }
          .tm-item-disc { font-size: 12px; color: #ef4444; }

          /* Footer */
          .tm-table-footer { display: flex; justify-content: space-between; margin-top: 15px; margin-bottom: 15px; }
          .tm-payment-title { font-weight: 600; color: #111; margin: 0 0 4px; }
          .tm-footer-right { min-width: 260px; }
          .tm-totals-table { width: 100%; border-collapse: collapse; }
          .tm-totals-table td { padding: 7px 0; font-size: 14px; border: none; }
          .tm-totals-label { font-weight: 600; color: #111; padding-right: 30px; }
          .tm-totals-val { text-align: right; font-weight: 600; color: #111; }
          .tm-discount-row td { color: #ef4444 !important; padding-top: 0; }
          .tm-grand-total-row td { font-size: 18px; font-weight: 700; color: #111; background: #f5f6fa; padding: 10px 15px; }
          .tm-grand-total-row td:first-child { border-radius: 6px 0 0 6px; }
          .tm-grand-total-row td:last-child { border-radius: 0 6px 6px 0; }
          .tm-due-row td { color: #ef4444 !important; font-weight: 700; }

          /* Terms */
          .tm-terms { text-align: center; margin-top: 10px; }
          .tm-terms-line { height: 1px; background: #dbdfea; margin-bottom: 15px; }
          .tm-terms-title { font-weight: 600; color: #111; font-size: 14px; margin: 0 0 4px; }
          .tm-terms-text { margin: 0; font-size: 13px; color: #888; line-height: 1.6; }

          @media print {
            body { padding: 20px; }
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (v) => `${symbol} ${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatDateLong = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : '-';

  const StatusBadge = ({ status, size = 'sm' }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = cfg.icon;
    return (
      <span className={`inv-status-badge inv-status-${size}`} style={{ '--badge-color': cfg.color, '--badge-bg': cfg.bg }}>
        <Icon size={size === 'lg' ? 14 : 12} /> {cfg.label}
      </span>
    );
  };

  const balanceDue = viewing ? Math.max(0, parseFloat(viewing?.total || 0) - parseFloat(viewing?.amount_paid || 0)) : 0;

  return (
    <div className="inv-page">
      {/* Print Header */}
      <div className="inv-print-header" style={{ display: 'none' }}>
        <div className="inv-print-logo">
          <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="inv-print-meta">
          <h1>Invoices Report</h1>
          <p>Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="inv-hero">
        <div className="inv-hero-content">
          <h1>Invoices & Payments</h1>
          <p>Manage billing, track payments, and keep your finances in order.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="inv-btn-primary btn-export-csv" data-tooltip="Download Excel" onClick={() => {
            const rows = [
              ['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'],
              ...invoices.map(inv => [
                inv.invoice_number || inv.id,
                inv.customer_name || (inv.customer_first_name && inv.customer_last_name ? `${inv.customer_first_name} ${inv.customer_last_name}` : '-'),
                inv.created_at ? formatDate(inv.created_at) : '-',
                inv.due_date ? formatDate(inv.due_date) : '-',
                formatCurrency(inv.total || 0),
                formatCurrency(inv.amount_paid || 0),
                formatCurrency(Math.max(0, (inv.total || 0) - (inv.amount_paid || 0))),
                STATUS_CONFIG[inv.status]?.label || inv.status || '-',
              ])
            ];
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}>
            <Download size={16} /> Excel
          </button>
          <button className="inv-btn-primary btn-print" data-tooltip="Print invoices" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="inv-btn-primary inv-btn-lg" data-tooltip="Create new invoice" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> New Invoice
          </button>
        </div>
      </div>

      <div className="inv-stats-grid">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.total_paid), sub: `${stats.paid_count || 0} paid`, icon: DollarSign, iconColor: '#10b981', iconBg: '#dcfce7' },
          { label: 'Pending', value: formatCurrency(stats.total_pending), sub: `${stats.pending_count || 0} invoices`, icon: Clock, iconColor: '#f59e0b', iconBg: '#fef3c7' },
          { label: 'Overdue', value: formatCurrency(stats.total_overdue), sub: `${stats.overdue_count || 0} invoices`, icon: AlertTriangle, iconColor: '#ef4444', iconBg: '#fee2e2' },
          { label: 'Total Invoices', value: stats.total || 0, sub: `${stats.void_count || 0} void`, icon: TrendingUp, iconColor: '#f2421b', iconBg: '#fef0ec' },
        ].map((s, i) => (
          <div className="inv-stat-card" key={i}>
            <div className="inv-stat-icon" style={{ background: s.iconBg }}>
              <s.icon size={22} color={s.iconColor} />
            </div>
            <div className="inv-stat-body">
              <span className="inv-stat-val">{s.value}</span>
              <span className="inv-stat-lbl">{s.label}</span>
            </div>
            <span className="inv-stat-count">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-search">
          <Search size={16} />
          <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices(1)} />
        </div>
        <div className="inv-filters">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="inv-view-toggle">
          <button className={`inv-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table view" data-tooltip="Table view">
            <FileText size={15} />
          </button>
          <button className={`inv-view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Card view" data-tooltip="Card view">
            <Filter size={15} />
          </button>
        </div>
      </div>

      {/* Table / Card View */}
      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading">
            <div className="inv-loading-spinner" />
            <span>Loading invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-icon"><Receipt size={48} strokeWidth={1} /></div>
            <h3>No invoices yet</h3>
            <p>Create your first invoice to start tracking payments</p>
            <button className="inv-btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create First Invoice
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <table className="inv-table">
            <thead>
              <tr>
                <th><Hash size={12} /> Invoice</th>
                <th><User size={12} /> Customer</th>
                <th><Calendar size={12} /> Date</th>
                <th><Calendar size={12} /> Due</th>
                <th><DollarSign size={12} /> Total</th>
                <th><Banknote size={12} /> Paid</th>
                <th>Status</th>
                <th className="inv-no-print"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => handleViewInvoice(inv)} className="inv-row-click">
                  <td className="inv-num">{inv.invoice_number}</td>
                  <td>
                    <div className="inv-customer">
                      <span className="inv-avatar">{(inv.customer_first_name || '?')[0]}</span>
                      <div className="inv-customer-info">
                        <span className="inv-customer-name">{inv.customer_first_name} {inv.customer_last_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="inv-date">{formatDate(inv.created_at)}</td>
                  <td className="inv-date">{formatDate(inv.due_date)}</td>
                  <td className="inv-amount">{formatCurrency(inv.total)}</td>
                  <td className="inv-amount inv-paid">{formatCurrency(inv.amount_paid)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td className="inv-no-print" onClick={e => e.stopPropagation()}>
                    <div className="inv-actions">
                      <button title="View" data-tooltip="View invoice" onClick={() => handleViewInvoice(inv)}><Eye size={15} /></button>
                      {inv.status !== 'paid' && inv.status !== 'void' && (
                        <button title="Record Payment" data-tooltip="Record payment" className="inv-act-pay" onClick={() => { setViewing(inv); setPayForm({ amount: parseFloat(inv.total) - parseFloat(inv.amount_paid || 0), payment_method: 'cash' }); setShowPay(true); }}>
                          <CreditCard size={15} />
                        </button>
                      )}
                      {inv.status === 'draft' && (
                        <button title="Delete" data-tooltip="Delete invoice" className="inv-act-danger" onClick={() => handleDelete(inv.id)}><XCircle size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Card / Grid View */
          <div className="inv-card-grid">
            {invoices.map(inv => {
              const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              return (
                <div className="inv-card-item" key={inv.id} onClick={() => handleViewInvoice(inv)}>
                  <div className="inv-card-header">
                    <span className="inv-card-num">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="inv-card-customer">
                    <span className="inv-avatar inv-avatar-sm">{(inv.customer_first_name || '?')[0]}</span>
                    <span className="inv-card-name">{inv.customer_first_name} {inv.customer_last_name}</span>
                  </div>
                  <div className="inv-card-amounts">
                    <div className="inv-card-amount-row">
                      <span className="inv-card-label">Total</span>
                      <span className="inv-card-total">{formatCurrency(inv.total)}</span>
                    </div>
                    <div className="inv-card-amount-row">
                      <span className="inv-card-label">Paid</span>
                      <span className="inv-card-paid">{formatCurrency(inv.amount_paid)}</span>
                    </div>
                  </div>
                  <div className="inv-card-footer">
                    <span className="inv-card-date"><Calendar size={11} /> {formatDate(inv.created_at)}</span>
                    <div className="inv-card-actions" onClick={e => e.stopPropagation()}>
                      <button title="View" onClick={() => handleViewInvoice(inv)}><Eye size={14} /></button>
                      {inv.status !== 'paid' && inv.status !== 'void' && (
                        <button title="Record Payment" className="inv-act-pay" onClick={() => { setViewing(inv); setPayForm({ amount: parseFloat(inv.total) - parseFloat(inv.amount_paid || 0), payment_method: 'cash', gift_card_code: '' }); setPayGcBalance(null); setShowPay(true); }}>
                          <CreditCard size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="inv-pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>← Previous</button>
          <div className="inv-page-nums">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const start = Math.max(1, pagination.page - 2);
              const pg = start + i;
              if (pg > pagination.totalPages) return null;
              return <button key={pg} className={pg === pagination.page ? 'inv-page-active' : ''} onClick={() => setPagination(p => ({ ...p, page: pg }))}>{pg}</button>;
            })}
          </div>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} size="lg" centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="inv-modal-title"><Receipt size={20} /> Create New Invoice</div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="inv-form">
            <div className="inv-form-row">
              <div className="inv-field">
                <label><User size={12} /> Customer *</label>
                <select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="inv-field">
                <label>Staff</label>
                <select value={form.staff_id} onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}>
                  <option value="">Select staff...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="inv-section-title">
              <FileText size={14} /> Line Items
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="inv-item-row">
                <div className="inv-item-service">
                  <select value={item.item_id} onChange={e => handleServiceSelect(idx, e.target.value)}>
                    <option value="">Select service...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.unit_price}</option>)}
                  </select>
                </div>
                <div className="inv-item-name">
                  <input type="text" placeholder="Custom name" value={item.name} onChange={e => { const items = [...form.items]; items[idx].name = e.target.value; setForm(p => ({ ...p, items })); }} />
                </div>
                <div className="inv-item-price">
                  <input type="number" min="0" value={item.unit_price} onChange={e => { const items = [...form.items]; items[idx].unit_price = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, items })); }} placeholder="Price" />
                </div>
                <div className="inv-item-qty">
                  <input type="number" min="1" value={item.quantity} onChange={e => { const items = [...form.items]; items[idx].quantity = parseInt(e.target.value) || 1; setForm(p => ({ ...p, items })); }} placeholder="Qty" />
                </div>
                <div className="inv-item-disc">
                  <input type="number" min="0" value={item.discount} onChange={e => { const items = [...form.items]; items[idx].discount = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, items })); }} placeholder="Disc" />
                </div>
                <div className="inv-item-total">{formatCurrency(item.quantity * item.unit_price - item.discount)}</div>
                {form.items.length > 1 && <button type="button" className="inv-btn-icon-danger" onClick={() => removeItem(idx)}><XCircle size={16} /></button>}
              </div>
            ))}
            <button type="button" className="inv-btn-ghost" onClick={addItem}><Plus size={14} /> Add Item</button>

            <div className="inv-form-row" style={{ marginTop: 16 }}>
              <div className="inv-field">
                <label>Discount</label>
                <div className="inv-inline">
                  <input type="number" min="0" value={form.discount_amount} onChange={e => setForm(p => ({ ...p, discount_amount: parseFloat(e.target.value) || 0 }))} />
                  <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}>
                    <option value="fixed">Fixed</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
              <div className="inv-field">
                <label>Tax Rate (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="inv-field">
                <label>Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>

            <div className="inv-field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>

            <div className="inv-summary-card">
              <div className="inv-summary-row"><span>Subtotal</span><strong>{formatCurrency(calcSubtotal())}</strong></div>
              <div className="inv-summary-row"><span>Discount</span><span className="inv-discount-val">−{formatCurrency(form.discount_type === 'percentage' ? calcSubtotal() * form.discount_amount / 100 : form.discount_amount)}</span></div>
              <div className="inv-summary-row"><span>Tax ({form.tax_rate}%)</span><span>{formatCurrency((calcSubtotal() - (form.discount_type === 'percentage' ? calcSubtotal() * form.discount_amount / 100 : form.discount_amount)) * form.tax_rate / 100)}</span></div>
              <div className="inv-summary-row inv-total"><span>Total</span><strong>{formatCurrency(calcTotal())}</strong></div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="inv-modal-footer">
          <button className="inv-btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="inv-btn-outline" onClick={() => handleCreate('draft')} disabled={saving}>
            <FileText size={14} /> Save Draft
          </button>
          <button className="inv-btn-primary" onClick={() => handleCreate('sent')} disabled={saving}>
            {saving ? 'Saving...' : <><Send size={14} /> Create & Send</>}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ── View Invoice Modal (Professional Document) ── */}
      <Modal show={showView} onHide={() => setShowView(false)} size="lg" centered className="inv-modal inv-view-modal" dialogClassName="inv-view-dialog">
        {viewing && (
          <>
            <Modal.Body className="inv-view-body">
              {/* Action Bar */}
              <div className="inv-view-actions-bar">
                <StatusBadge status={viewing.status} size="lg" />
                <div className="inv-view-actions-right">
                  <button className="inv-btn-icon-action" onClick={handlePrint} title="Print Invoice">
                    <Printer size={18} />
                  </button>
                  {viewing.status !== 'paid' && viewing.status !== 'void' && (
                    <>
                      <button className="inv-btn-icon-action inv-btn-void" onClick={() => handleVoid(viewing.id)} title="Void Invoice">
                        <Ban size={18} />
                      </button>
                      <button className="inv-btn-primary inv-btn-sm" onClick={() => { setPayForm({ amount: balanceDue, payment_method: 'cash', gift_card_code: '' }); setPayGcBalance(null); setShowPay(true); }}>
                        <CreditCard size={14} /> Record Payment
                      </button>
                    </>
                  )}
                  <button className="inv-btn-close-view" onClick={() => setShowView(false)}>
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Document – Invoma Style */}
              <div className="tm-invoice" ref={printRef}>
                {/* ─── Header: Logo + Invoice Title ─── */}
                <div className="tm-head">
                  <div className="tm-head-left">
                    <div className="tm-logo-wrap">
                      {bizInfo.logo
                        ? <img src={bizInfo.logo} alt="Logo" className="tm-logo-img" />
                        : <div className="tm-logo-icon"><Sparkles size={30} /></div>
                      }
                    </div>
                  </div>
                  <div className="tm-head-right">
                    <span className="tm-title">Invoice</span>
                    <p className="tm-inv-number">Invoice Number – {viewing.invoice_number}</p>
                  </div>
                </div>

                {/* ─── Divider ─── */}
                <div className="tm-divider" />

                {/* ─── Business Info + Details Grid ─── */}
                <div className="tm-info-row">
                  <div className="tm-info-left">
                    <p className="tm-biz-name">{bizInfo.company_name || bizInfo.name || 'Beauty Center'}</p>
                    {bizInfo.address && <span>{bizInfo.address}</span>}
                    {(bizInfo.city || bizInfo.country) && <span>{[bizInfo.city, bizInfo.country].filter(Boolean).join(', ')}</span>}
                    {bizInfo.email && <span>{bizInfo.email}</span>}
                    {bizInfo.phone && <span>{bizInfo.phone}</span>}
                  </div>
                  <div className="tm-info-right">
                    <div className="tm-detail-grid">
                      <div>
                        <span className="tm-detail-label">Issue Date:</span>
                        <strong>{formatDateLong(viewing.created_at)}</strong>
                      </div>
                      <div>
                        <span className="tm-detail-label">Due Date:</span>
                        <strong>{formatDateLong(viewing.due_date)}</strong>
                      </div>
                      <div>
                        <span className="tm-detail-label">Invoice ID:</span>
                        <strong>{viewing.invoice_number}</strong>
                      </div>
                      <div>
                        <span className="tm-detail-label">Status:</span>
                        <strong className={`tm-status-text ${viewing.status}`}>{STATUS_CONFIG[viewing.status]?.label || viewing.status}</strong>
                      </div>
                      {viewing.staff_name && (
                        <div>
                          <span className="tm-detail-label">Staff:</span>
                          <strong>{viewing.staff_name}</strong>
                        </div>
                      )}
                      {viewing.payment_method && (
                        <div>
                          <span className="tm-detail-label">Payment:</span>
                          <strong style={{ textTransform: 'capitalize' }}>{viewing.payment_method.replace('_', ' ')}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── Two-Column Info: Client + Notes ─── */}
                <div className="tm-two-col">
                  <div className="tm-two-col-left">
                    <strong className="tm-section-label">Client Info</strong>
                    <p className="tm-m0">
                      Name: {viewing.customer_first_name} {viewing.customer_last_name}
                      {viewing.customer_phone && <><br />Phone: {viewing.customer_phone}</>}
                      {viewing.customer_email && <><br />Email: {viewing.customer_email}</>}
                    </p>
                  </div>
                  <div className="tm-two-col-right">
                    <strong className="tm-section-label">Service Details</strong>
                    <p className="tm-m0">
                      {viewing.notes
                        ? viewing.notes
                        : `Professional beauty services provided by ${bizInfo.company_name || bizInfo.name || 'our beauty center'}. Thank you for choosing us.`
                      }
                    </p>
                  </div>
                </div>

                {/* ─── Items Table ─── */}
                {viewing.items && viewing.items.length > 0 && (
                  <div className="tm-table-section">
                    <div className="tm-table-border">
                      <table className="tm-items-table">
                        <thead>
                          <tr>
                            <th className="tm-w60">Description</th>
                            <th className="tm-w25">Rate</th>
                            <th className="tm-w15 tm-text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewing.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="tm-w60">{item.name || item.description}</td>
                              <td className="tm-w25">
                                {formatCurrency(item.unit_price)} × {item.quantity}
                                {parseFloat(item.discount) > 0 && (
                                  <span className="tm-item-disc"> (−{formatCurrency(item.discount)} disc)</span>
                                )}
                              </td>
                              <td className="tm-w15 tm-text-right">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ─── Footer: Payment Info + Totals ─── */}
                    <div className="tm-table-footer">
                      <div className="tm-footer-left">
                        <p className="tm-payment-title">Payment info:</p>
                        <p className="tm-m0">
                          {viewing.customer_first_name} {viewing.customer_last_name}
                          {viewing.payment_method && <><br />Method: <span style={{ textTransform: 'capitalize' }}>{viewing.payment_method.replace('_', ' ')}</span></>}
                          <br />Amount: {formatCurrency(viewing.amount_paid || 0)}
                        </p>
                      </div>
                      <div className="tm-footer-right">
                        <table className="tm-totals-table">
                          <tbody>
                            <tr>
                              <td className="tm-totals-label">Subtotal</td>
                              <td className="tm-totals-val">{formatCurrency(viewing.subtotal)}</td>
                            </tr>
                            {parseFloat(viewing.discount_amount) > 0 && (
                              <tr className="tm-discount-row">
                                <td className="tm-totals-label">Discount</td>
                                <td className="tm-totals-val">−{formatCurrency(viewing.discount_amount)}</td>
                              </tr>
                            )}
                            {parseFloat(viewing.tax_amount) > 0 && (
                              <tr>
                                <td className="tm-totals-label">Tax</td>
                                <td className="tm-totals-val">+{formatCurrency(viewing.tax_amount)}</td>
                              </tr>
                            )}
                            <tr className="tm-grand-total-row">
                              <td className="tm-totals-label">Grand Total</td>
                              <td className="tm-totals-val">{formatCurrency(viewing.total)}</td>
                            </tr>
                            {balanceDue > 0 && (
                              <tr className="tm-due-row">
                                <td className="tm-totals-label">Balance Due</td>
                                <td className="tm-totals-val">{formatCurrency(balanceDue)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Terms & Conditions ─── */}
                <div className="tm-terms">
                  <div className="tm-terms-line" />
                  <p className="tm-terms-title">Terms & Conditions:</p>
                  <p className="tm-terms-text">
                    Payment is due within the specified date. Late payments may incur additional charges.<br />
                    Invoice was created on a computer and is valid without the signature and seal.
                  </p>
                </div>
              </div>
            </Modal.Body>
          </>
        )}
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal show={showPay} onHide={() => setShowPay(false)} centered className="inv-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="inv-modal-title"><CreditCard size={20} /> Record Payment</div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewing && (
            <div className="inv-pay-context">
              <span className="inv-pay-inv-num">{viewing.invoice_number}</span>
              <span className="inv-pay-balance">Balance: <strong>{formatCurrency(balanceDue)}</strong></span>
            </div>
          )}
          <div className="inv-form">
            <div className="inv-field">
              <label><DollarSign size={12} /> Amount</label>
              <input type="number" min="0" step="0.01" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="inv-field">
              <label><Banknote size={12} /> Payment Method</label>
              <select value={payForm.payment_method} onChange={e => {
                setPayForm(p => ({ ...p, payment_method: e.target.value, gift_card_code: '' }));
                setPayGcBalance(null);
              }}>
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="gift_card">🎁 Gift Card</option>
                <option value="other">📋 Other</option>
              </select>
            </div>
            {payForm.payment_method === 'gift_card' && (
              <div className="inv-field" style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', border: '1px solid #fbbf24' }}>
                <label style={{ color: '#92400e', fontWeight: 600, fontSize: 12 }}>🎁 Gift Card Code</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. ABCD-EFGH-JKLM-NPQR"
                    value={payForm.gift_card_code}
                    onChange={e => {
                      setPayForm(p => ({ ...p, gift_card_code: e.target.value.toUpperCase() }));
                      setPayGcBalance(null);
                    }}
                    style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'monospace', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => checkPayGcBalance(payForm.gift_card_code)}
                    disabled={payGcChecking || !payForm.gift_card_code}
                    style={{ padding: '6px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {payGcChecking ? '...' : 'Check'}
                  </button>
                </div>
                {payGcBalance && !payGcBalance.error && (
                  <div style={{ marginTop: 6, fontSize: 12, color: parseFloat(payGcBalance.remaining_value) >= parseFloat(payForm.amount || 0) ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                    ✅ Balance: {formatCurrency(parseFloat(payGcBalance.remaining_value))}
                    {payGcBalance.status !== 'active' && <span style={{ color: '#dc2626' }}> ({payGcBalance.status})</span>}
                    {parseFloat(payGcBalance.remaining_value) < parseFloat(payForm.amount || 0) && (
                      <span style={{ color: '#dc2626', display: 'block' }}>⚠️ Insufficient balance for this payment</span>
                    )}
                  </div>
                )}
                {payGcBalance?.error && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                    ❌ {payGcBalance.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="inv-modal-footer">
          <button className="inv-btn-outline" onClick={() => setShowPay(false)}>Cancel</button>
          <button className="inv-btn-primary" onClick={handlePay} disabled={saving}>
            {saving ? 'Processing...' : <><CheckCircle size={14} /> Confirm Payment</>}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
