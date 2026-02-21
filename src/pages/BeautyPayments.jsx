import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Badge } from 'react-bootstrap';
import {
  Plus, Search, FileText, Eye, Printer, CreditCard, DollarSign,
  Clock, CheckCircle, AlertTriangle, XCircle, Filter, Download,
  Receipt, ArrowUpRight, ArrowDownRight, TrendingUp, Ban, Hash,
  User, Calendar, Banknote, MoreVertical, ChevronDown, Send,
  Sparkles, X, Star, Tag, Wallet, Building2, Gift, ClipboardList,
  BadgeCheck, ShieldCheck, Coins, PercentCircle, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
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
  const getEmptyForm = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    return {
      customer_id: '', staff_id: '', items: [{ name: '', item_type: 'service', item_id: '', unit_price: 0, quantity: 1, discount: 0 }],
      discount_amount: 0, discount_type: 'fixed', tax_rate: defaultTaxRate, payment_method: 'cash', notes: '', due_date: formattedDate
    };
  };
  const [form, setForm] = useState(getEmptyForm());
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', gift_card_code: '' });
  const [payGcBalance, setPayGcBalance] = useState(null);
  const [payGcChecking, setPayGcChecking] = useState(false);
  const [payLoyalty, setPayLoyalty] = useState(null);
  const [payLoyaltyLoading, setPayLoyaltyLoading] = useState(false);
  const [payDiscount, setPayDiscount] = useState(null); // { valid, discount_amount, message, ... }
  const [payDiscountLoading, setPayDiscountLoading] = useState(false);
  const [payDiscountCode, setPayDiscountCode] = useState('');

  // Toast notification state
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'warning', title, message }
  const toastTimer = useRef(null);
  const showToast = useCallback((type, title, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, title, message });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

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
    if (!form.customer_id) { showToast('warning', 'Missing Customer', 'Please select a customer.'); return; }
    if (!form.items.length || !form.items[0].name) { showToast('warning', 'Missing Items', 'Please add at least one item.'); return; }
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

  const validateDiscountCode = async (code) => {
    if (!code || code.length < 3) { setPayDiscount(null); return; }
    setPayDiscountLoading(true);
    try {
      const res = await api.post('/promotions/validate', {
        code,
        subtotal: viewing ? parseFloat(viewing.total) : 0,
        customer_id: viewing?.customer_id
      });
      setPayDiscount(res.success ? res.data : { error: res.message || 'Invalid code' });
    } catch (e) { setPayDiscount({ error: e.message || 'Invalid code' }); }
    finally { setPayDiscountLoading(false); }
  };

  const checkLoyaltyBalance = async (customerId) => {
    if (!customerId) { setPayLoyalty(null); return; }
    setPayLoyaltyLoading(true);
    try {
      const res = await api.get(`/loyalty/check/${customerId}`);
      setPayLoyalty(res.success ? res.data : null);
    } catch { setPayLoyalty(null); }
    finally { setPayLoyaltyLoading(false); }
  };

  const handlePay = async () => {
    if (!viewing) return;
    const bal = Math.max(0, parseFloat(viewing.total || 0) - parseFloat(viewing.amount_paid || 0));
    const loyaltyAmt = parseFloat(payForm.loyalty_amount || 0);
    const totalAmt = bal;
    if (totalAmt <= 0) { showToast('warning', 'Nothing to pay', 'This invoice has no outstanding balance.'); return; }

    const cashRemaining = Math.max(0, totalAmt - loyaltyAmt);
    if (payForm.payment_method === 'gift_card' && !payForm.gift_card_code && cashRemaining > 0) {
      showToast('warning', 'Gift Card Required', 'Please enter a gift card code to proceed.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: totalAmt,
        payment_method: payForm.payment_method,
        loyalty_amount: loyaltyAmt > 0 ? loyaltyAmt : undefined,
        discount_code: payDiscount?.valid ? payDiscountCode : undefined,
      };
      if (payForm.payment_method === 'gift_card') payload.gift_card_code = payForm.gift_card_code;
      const viewingId = viewing.id;
      const res = await api.post(`/invoices/${viewingId}/pay`, payload);
      if (res.success) {
        // Close pay modal & reset pay-specific state
        setShowPay(false);
        setPayGcBalance(null);
        setPayLoyalty(null);
        setPayDiscount(null);
        setPayDiscountCode('');
        // Refresh lists
        fetchInvoices();
        fetchStats();
        // If view modal is open, refresh the viewed invoice
        if (showView) {
          try {
            const updated = await api.get(`/invoices/${viewingId}`);
            if (updated.success) setViewing(updated.data);
          } catch(e) { /* ignore */ }
        }
        // Build clean message
        const paidAmt = parseFloat(totalAmt).toFixed(2);
        const method = loyaltyAmt > 0 && cashRemaining > 0
          ? `${loyaltyAmt.toFixed(2)} pts + ${cashRemaining.toFixed(2)} ${payForm.payment_method.replace(/_/g, ' ')}`
          : loyaltyAmt >= totalAmt ? 'Loyalty Points' : payForm.payment_method.replace(/_/g, ' ');
        showToast('success', 'Payment Recorded', `${formatCurrencyStr(paidAmt)} paid via ${method}`);
      } else {
        showToast('error', 'Payment Failed', res.message || 'Could not process the payment.');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Payment Error', e.message || 'An unexpected error occurred.');
    }
    finally { setSaving(false); }
  };

  // Open payment modal with auto-fetch loyalty
  const openPayModal = async (inv, balance) => {
    // If we only have partial data, fetch the full invoice first
    let fullInv = inv;
    if (!inv.items) {
      try {
        const res = await api.get(`/invoices/${inv.id}`);
        if (res.success) fullInv = res.data;
      } catch (e) { console.error(e); }
    }
    setViewing(fullInv);
    const bal = balance || Math.max(0, parseFloat(fullInv.total) - parseFloat(fullInv.amount_paid || 0));
    setPayForm({ amount: bal.toFixed(2), payment_method: 'cash', gift_card_code: '', loyalty_amount: '' });
    setPayGcBalance(null);
    setPayLoyalty(null);
    setPayDiscount(null);
    setPayDiscountCode('');
    setShowPay(true);
    // Auto-fetch loyalty if customer exists
    if (fullInv.customer_id) {
      checkLoyaltyBalance(fullInv.customer_id);
    }
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
        showToast('error', 'Delete Failed', res.message || 'Failed to delete invoice.');
      }
    } catch (e) {
      console.error(e);
      showToast('warning', 'Cannot Delete', 'Only draft invoices can be deleted.');
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

  // String-only formatter (for CSV export, print HTML, non-JSX contexts)
  const formatCurrencyStr = (v) => `${symbol} ${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // JSX formatter with proper CurrencySymbol component
  const formatCurrency = (v) => (
    <><CurrencySymbol currency={currency} symbol={symbol} style={{ fontSize: 'inherit', verticalAlign: 'baseline', marginRight: 2 }} />{parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
  );
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
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Receipt size={26} /></div>
          <div>
            <h1 className="module-hero-title">Invoices & Payments</h1>
            <p className="module-hero-sub">Manage billing, track payments, and keep your finances in order.</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline btn-export-csv" data-tooltip="Download Excel" onClick={() => {
            const rows = [
              ['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'],
              ...invoices.map(inv => [
                inv.invoice_number || inv.id,
                inv.customer_name || (inv.customer_first_name && inv.customer_last_name ? `${inv.customer_first_name} ${inv.customer_last_name}` : '-'),
                inv.created_at ? formatDate(inv.created_at) : '-',
                inv.due_date ? formatDate(inv.due_date) : '-',
                formatCurrencyStr(inv.total || 0),
                formatCurrencyStr(inv.amount_paid || 0),
                formatCurrencyStr(Math.max(0, (inv.total || 0) - (inv.amount_paid || 0))),
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
          <button className="module-btn module-btn-outline btn-print" data-tooltip="Print invoices" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="module-btn module-btn-primary" data-tooltip="Create new invoice" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      <div className="inv-stats-grid">
        {[
          { label: 'Total Revenue', value: stats.total_paid, sub: `${stats.paid_count || 0} paid`, icon: DollarSign, iconColor: '#059669', iconBg: '#ECFDF5' },
          { label: 'Pending', value: stats.total_pending, sub: `${stats.pending_count || 0} invoices`, icon: Clock, iconColor: '#D97706', iconBg: '#FFFBEB' },
          { label: 'Overdue', value: stats.total_overdue, sub: `${stats.overdue_count || 0} invoices`, icon: AlertTriangle, iconColor: '#DC2626', iconBg: '#FEF2F2' },
          { label: 'Total Invoices', value: null, rawVal: stats.total || 0, sub: `${stats.void_count || 0} void`, icon: TrendingUp, iconColor: '#f2421b', iconBg: '#FFF7ED' },
        ].map((s, i) => (
          <div className="inv-stat-card" key={i}>
            <div className="inv-stat-card-row">
              <div className="inv-stat-icon" style={{ background: s.iconBg }}>
                <s.icon size={22} color={s.iconColor} />
              </div>
              <div className="inv-stat-body">
                <span className="inv-stat-val">
                  {s.rawVal !== undefined ? s.rawVal : (
                    <><CurrencySymbol currency={currency} symbol={symbol} style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: 2 }} />{Number(s.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                  )}
                </span>
                <span className="inv-stat-lbl">{s.label}</span>
              </div>
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
          <button className={`inv-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} data-tooltip="Table view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button className={`inv-view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} data-tooltip="Card view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
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
                        <button title="Record Payment" data-tooltip="Record payment" className="inv-act-pay" onClick={() => openPayModal(inv)}>
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
                        <button title="Record Payment" className="inv-act-pay" onClick={() => openPayModal(inv)}>
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
            <div className="inv-modal-title text-white"><Receipt size={20} className='text-white' /> Create New Invoice</div>
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
                  {staffList.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
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
                  <button 
                    className="inv-btn-icon-action" 
                    onClick={async () => {
                      try {
                        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
                        const token = localStorage.getItem('crm_token');
                        const response = await fetch(`${API_BASE_URL}/invoices/${viewing.id}/pdf`, {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}));
                          throw new Error(errorData.message || 'Failed to generate PDF');
                        }
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `invoice-${viewing.invoice_number}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        showToast('success', 'PDF Downloaded', 'Invoice PDF has been downloaded successfully');
                      } catch (error) {
                        console.error('PDF download error:', error);
                        showToast('error', 'Download Failed', error.message || 'Failed to download PDF. Please try again.');
                      }
                    }}
                    title="Download PDF"
                    data-tooltip="Download invoice PDF"
                    data-tooltip-pos="bottom"
                  >
                    <Download size={18} />
                  </button>
                  {Number(viewing.amount_paid || 0) > 0 && (
                    <button
                      className="inv-btn-icon-action"
                      onClick={async () => {
                        try {
                          const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
                          const token = localStorage.getItem('crm_token');
                          const response = await fetch(`${API_BASE_URL}/invoices/${viewing.id}/receipt-pdf`, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.message || 'Failed to generate receipt PDF');
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `receipt-${viewing.invoice_number}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          showToast('success', 'Receipt Downloaded', 'Payment receipt PDF has been downloaded successfully');
                        } catch (error) {
                          console.error('Receipt download error:', error);
                          showToast('error', 'Download Failed', error.message || 'Failed to download receipt PDF. Please try again.');
                        }
                      }}
                      title="Download Receipt"
                      data-tooltip="Download receipt PDF"
                      data-tooltip-pos="bottom"
                    >
                      <Receipt size={18} />
                    </button>
                  )}
                  <button className="inv-btn-icon-action" onClick={handlePrint} title="Print Invoice" data-tooltip="Print invoice" data-tooltip-pos="bottom">
                    <Printer size={18} />
                  </button>
                  {viewing.status !== 'paid' && viewing.status !== 'void' && (
                    <>
                      <button className="inv-btn-icon-action inv-btn-void" onClick={() => handleVoid(viewing.id)} title="Void Invoice" data-tooltip="Void invoice" data-tooltip-pos="bottom">
                        <Ban size={18} />
                      </button>
                      <button className="inv-btn-primary inv-btn-sm" onClick={() => openPayModal(viewing, balanceDue)}>
                        <CreditCard size={14} /> Record Payment
                      </button>
                    </>
                  )}
                  <button className="inv-btn-close-view" onClick={() => setShowView(false)} data-tooltip="Close" data-tooltip-pos="bottom">
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

      {/* ── Payment Modal (fullscreen-style, scrollable) ── */}
      <Modal show={showPay} onHide={() => { setShowPay(false); setPayLoyalty(null); setPayGcBalance(null); setPayDiscount(null); setPayDiscountCode(''); setPayForm(p => ({ ...p, loyalty_amount: '' })); }} className="inv-pay-modal" dialogClassName="inv-pay-dialog" contentClassName="inv-pay-content">
        <div className="inv-pay-layout">
          {/* ── Left: Hero / Summary sidebar ── */}
          <div className="inv-pay-sidebar">
            <button className="inv-pay-close-btn" onClick={() => { setShowPay(false); setPayLoyalty(null); setPayDiscount(null); setPayDiscountCode(''); }}>
              <X size={18} />
            </button>
            <div className="inv-pay-sidebar-inner">
              <div className="inv-pay-sidebar-icon"><Wallet size={32} /></div>
              <h3 className="inv-pay-sidebar-title">Record Payment</h3>
              {viewing && (
                <>
                  <div className="inv-pay-sidebar-meta">
                    <Hash size={14} /> {viewing.invoice_number}
                  </div>
                  <div className="inv-pay-sidebar-meta">
                    <User size={14} /> {viewing.customer_name || 'Walk-in'}
                  </div>
                </>
              )}
              <div className="inv-pay-sidebar-amount-card">
                <span className="inv-pay-sidebar-amount-label">Balance Due</span>
                <span className="inv-pay-sidebar-amount-value">{formatCurrency(balanceDue)}</span>
              </div>

              {/* ── Live Receipt ── */}
              {balanceDue > 0 && (
                <div className="inv-pay-live-receipt">
                  <div className="inv-pay-lr-title"><Receipt size={14} /> Summary</div>
                  <div className="inv-pay-lr-row">
                    <span>Invoice</span>
                    <strong>{formatCurrency(balanceDue)}</strong>
                  </div>
                  {parseFloat(payForm.loyalty_amount || 0) > 0 && (
                    <div className="inv-pay-lr-row purple">
                      <span><Star size={12} /> Loyalty</span>
                      <strong>− {formatCurrency(parseFloat(payForm.loyalty_amount))}</strong>
                    </div>
                  )}
                  {payDiscount?.valid && (
                    <div className="inv-pay-lr-row green">
                      <span><Tag size={12} /> Discount</span>
                      <strong>− {formatCurrency(payDiscount.discount_amount)}</strong>
                    </div>
                  )}
                  {(() => {
                    const la = parseFloat(payForm.loyalty_amount || 0);
                    const rem = Math.max(0, balanceDue - la);
                    if (rem > 0 && la > 0) {
                      const PMIcon = payForm.payment_method === 'cash' ? Banknote : payForm.payment_method === 'card' ? CreditCard : payForm.payment_method === 'gift_card' ? Gift : payForm.payment_method === 'bank_transfer' ? Building2 : ClipboardList;
                      return (
                        <div className="inv-pay-lr-row">
                          <span><PMIcon size={12} /> {payForm.payment_method.replace(/_/g, ' ')}</span>
                          <strong>{formatCurrency(rem)}</strong>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="inv-pay-lr-total">
                    <span>Total</span>
                    <strong>{formatCurrency(balanceDue)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Form area ── */}
          <div className="inv-pay-main">
            <div className="inv-pay-main-scroll">
              <div className="inv-pay-sections">

                {/* ── Step 1: Loyalty Points ── */}
                {payLoyaltyLoading ? (
                  <div className="inv-pay-card inv-pay-card-loading">
                    <div className="inv-loading-spinner" style={{ width: 18, height: 18 }} />
                    <span>Checking loyalty balance...</span>
                  </div>
                ) : payLoyalty && payLoyalty.enrolled && payLoyalty.points > 0 ? (
                  <div className="inv-pay-card inv-pay-loyalty-card">
                    <div className="inv-pay-card-head">
                      <div className="inv-pay-card-head-left">
                        <span className="inv-pay-card-icon inv-pay-card-icon-purple"><Star size={18} /></span>
                        <div>
                          <div className="inv-pay-card-label">Loyalty Points</div>
                          <div className="inv-pay-card-sub">{payLoyalty.tier?.toUpperCase() || 'BRONZE'} · {(payLoyalty.points || 0).toLocaleString()} pts · Worth {formatCurrency(payLoyalty.monetary_value || 0)}</div>
                        </div>
                      </div>
                      <label className="inv-pay-switch">
                        <input
                          type="checkbox"
                          checked={parseFloat(payForm.loyalty_amount || 0) > 0}
                          onChange={e => {
                            if (e.target.checked) {
                              const maxByPercent = balanceDue * (payLoyalty.max_redeem_percent / 100);
                              const maxByPoints = payLoyalty.monetary_value;
                              const suggested = Math.min(maxByPercent, maxByPoints, balanceDue);
                              setPayForm(p => ({ ...p, loyalty_amount: suggested.toFixed(2), amount: balanceDue.toFixed(2) }));
                            } else {
                              setPayForm(p => ({ ...p, loyalty_amount: '', amount: balanceDue.toFixed(2) }));
                            }
                          }}
                        />
                        <span className="inv-pay-switch-slider" />
                      </label>
                    </div>

                    {parseFloat(payForm.loyalty_amount || 0) > 0 && (
                      <div className="inv-pay-loyalty-detail">
                        <div className="inv-pay-loyalty-input-row">
                          <label><Coins size={13} /> Deduct Amount</label>
                          <div className="inv-pay-loyalty-input-wrap">
                            <input
                              type="number" min="0" step="0.01"
                              max={Math.min(payLoyalty.monetary_value, balanceDue * payLoyalty.max_redeem_percent / 100)}
                              value={payForm.loyalty_amount}
                              onChange={e => {
                                const val = Math.min(parseFloat(e.target.value) || 0, payLoyalty.monetary_value, balanceDue * payLoyalty.max_redeem_percent / 100);
                                const loyaltyVal = val > 0 ? val.toFixed(2) : e.target.value;
                                setPayForm(p => ({ ...p, loyalty_amount: loyaltyVal, amount: balanceDue.toFixed(2) }));
                              }}
                            />
                            <button type="button" className="inv-pay-max-btn" onClick={() => {
                              const max = Math.min(payLoyalty.monetary_value, balanceDue * payLoyalty.max_redeem_percent / 100, balanceDue);
                              setPayForm(p => ({ ...p, loyalty_amount: max.toFixed(2), amount: balanceDue.toFixed(2) }));
                            }}>MAX</button>
                          </div>
                        </div>
                        <div className="inv-pay-loyalty-info">
                          <span><ArrowRight size={11} /> Redeems <strong>{Math.ceil(parseFloat(payForm.loyalty_amount || 0) / (payLoyalty.point_value || 0.01)).toLocaleString()} pts</strong></span>
                          <span><PercentCircle size={11} /> Max {payLoyalty.max_redeem_percent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* ── Step 2: Discount Code ── */}
                <div className="inv-pay-card inv-pay-discount-card">
                  <div className="inv-pay-card-head">
                    <div className="inv-pay-card-head-left">
                      <span className="inv-pay-card-icon inv-pay-card-icon-green"><Tag size={18} /></span>
                      <div className="inv-pay-card-label">Promo Code</div>
                    </div>
                  </div>
                  <div className="inv-pay-promo-input">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={payDiscountCode}
                      onChange={e => { setPayDiscountCode(e.target.value.toUpperCase()); setPayDiscount(null); }}
                      className="inv-pay-promo-field"
                    />
                    <button
                      type="button"
                      className={`inv-pay-promo-btn ${payDiscount?.valid ? 'applied' : ''}`}
                      onClick={() => validateDiscountCode(payDiscountCode)}
                      disabled={payDiscountLoading || !payDiscountCode}
                    >
                      {payDiscountLoading ? <div className="inv-loading-spinner" style={{ width: 14, height: 14 }} /> : payDiscount?.valid ? <BadgeCheck size={16} /> : <ArrowRight size={14} />}
                    </button>
                  </div>
                  {payDiscount?.valid && (
                    <div className="inv-pay-promo-result inv-pay-promo-success">
                      <span><CheckCircle size={14} /> {payDiscount.message}</span>
                      <div className="inv-pay-promo-result-right">
                        <span className="inv-pay-promo-amount">−{formatCurrency(payDiscount.discount_amount)}</span>
                        <button type="button" className="inv-pay-promo-remove" onClick={() => { setPayDiscount(null); setPayDiscountCode(''); }}><X size={12} /></button>
                      </div>
                    </div>
                  )}
                  {payDiscount?.error && (
                    <div className="inv-pay-promo-result inv-pay-promo-error"><XCircle size={14} /> {payDiscount.error}</div>
                  )}
                </div>

                {/* ── Step 3: Payment Method ── */}
                {(() => {
                  const loyaltyAmt = parseFloat(payForm.loyalty_amount || 0);
                  const remaining = Math.max(0, balanceDue - loyaltyAmt);
                  if (loyaltyAmt >= balanceDue && loyaltyAmt > 0) return null;
                  return (
                    <div className="inv-pay-card inv-pay-method-card">
                      <div className="inv-pay-card-head">
                        <div className="inv-pay-card-head-left">
                          <span className="inv-pay-card-icon inv-pay-card-icon-blue"><CreditCard size={18} /></span>
                          <div>
                            <div className="inv-pay-card-label">Payment Method</div>
                            {loyaltyAmt > 0 && <div className="inv-pay-card-sub">Remaining {formatCurrency(remaining)}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="inv-pay-methods-grid">
                        {[
                          { val: 'cash', Icon: Banknote, label: 'Cash' },
                          { val: 'card', Icon: CreditCard, label: 'Card' },
                          { val: 'bank_transfer', Icon: Building2, label: 'Transfer' },
                          { val: 'gift_card', Icon: Gift, label: 'Gift Card' },
                          { val: 'other', Icon: ClipboardList, label: 'Other' },
                        ].map(m => (
                          <button
                            key={m.val}
                            type="button"
                            className={`inv-pay-method-pill ${payForm.payment_method === m.val ? 'active' : ''}`}
                            onClick={() => { setPayForm(p => ({ ...p, payment_method: m.val, gift_card_code: '' })); setPayGcBalance(null); }}
                          >
                            <m.Icon size={20} className="inv-pay-method-icon" />
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* ── Gift Card Sub-section ── */}
                      {payForm.payment_method === 'gift_card' && (
                        <div className="inv-pay-gc-section">
                          <div className="inv-pay-gc-input-row">
                            <input
                              type="text"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                              value={payForm.gift_card_code}
                              onChange={e => { setPayForm(p => ({ ...p, gift_card_code: e.target.value.toUpperCase() })); setPayGcBalance(null); }}
                              className="inv-pay-gc-field"
                            />
                            <button
                              type="button"
                              className="inv-pay-gc-check-btn"
                              onClick={() => checkPayGcBalance(payForm.gift_card_code)}
                              disabled={payGcChecking || !payForm.gift_card_code}
                            >
                              {payGcChecking ? <div className="inv-loading-spinner" style={{ width: 14, height: 14 }} /> : <><ShieldCheck size={14} /> Verify</>}
                            </button>
                          </div>
                          {payGcBalance && !payGcBalance.error && (
                            <div className="inv-pay-gc-result inv-pay-gc-ok"><CheckCircle size={14} /> Balance: {formatCurrency(parseFloat(payGcBalance.remaining_value))}</div>
                          )}
                          {payGcBalance?.error && (
                            <div className="inv-pay-gc-result inv-pay-gc-err"><XCircle size={14} /> {payGcBalance.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── Sticky Footer ── */}
            <div className="inv-pay-footer">
              <button className="inv-pay-cancel-btn" onClick={() => { setShowPay(false); setPayLoyalty(null); setPayDiscount(null); setPayDiscountCode(''); }}>
                <X size={15} /> Cancel
              </button>
              <button className="inv-pay-confirm-btn" onClick={handlePay} disabled={saving}>
                {saving ? (
                  <><div className="inv-loading-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Processing...</>
                ) : (
                  <><CheckCircle size={16} /> Confirm Payment</>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`inv-toast inv-toast-${toast.type} inv-toast-show`}>
          <div className="inv-toast-icon">
            {toast.type === 'success' ? <CheckCircle size={22} /> : toast.type === 'error' ? <XCircle size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div className="inv-toast-body">
            <div className="inv-toast-title">{toast.title}</div>
            <div className="inv-toast-msg">{toast.message}</div>
          </div>
          <button className="inv-toast-close" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
