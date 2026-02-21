import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { Calendar as CalendarIcon, CheckCircle2, DollarSign, Users, ChevronRight, TrendingUp, Sun, CloudSun, Sunset, Moon } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import { AuthContext } from '../../App';
import api from '../../lib/api';
import useCurrency from '../../hooks/useCurrency';
import { WeeklySalesBarChart } from '../../components/dashboard';
import SEO from '../../components/SEO';
import '../BeautyDashboard.css';

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase().replace(/\s/g, '_');
  if (['confirmed', 'scheduled'].includes(s)) return 'bb-confirmed';
  if (s === 'completed') return 'bb-completed';
  if (['cancelled', 'no_show'].includes(s)) return 'bb-cancelled';
  if (s === 'pending') return 'bb-pending';
  return 'bb-default';
}

function initials(name) {
  return (name || '—')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning',  Icon: Sun,      sub: 'Ready for another great day?' };
  if (h < 17) return { text: 'Good afternoon', Icon: CloudSun, sub: 'Keep up the excellent work!' };
  if (h < 20) return { text: 'Good evening',   Icon: Sunset,   sub: 'Wrapping up the day nicely.' };
  return        { text: 'Good night',          Icon: Moon,     sub: 'Almost done — you did great today.' };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toLocalYYYYMMDD(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function fromLocalYYYYMMDD(yyyymmdd) {
  const [y, m, d] = String(yyyymmdd).split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatRangeLabel(startStr, endStr) {
  const fmt = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const start = fromLocalYYYYMMDD(startStr);
  const end = fromLocalYYYYMMDD(endStr);
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function sumBy(invoices, predicate) {
  return (invoices || []).reduce((acc, inv) => (predicate(inv) ? acc + (parseFloat(inv.total) || 0) : acc), 0);
}

function groupCountsByDate(items, getDateKey, startDate, endDate) {
  const counts = new Map();
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    counts.set(toLocalYYYYMMDD(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const item of items || []) {
    const key = getDateKey(item);
    if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
  }

  const labels = Array.from(counts.keys()).map((k) => k.slice(5));
  const data = Array.from(counts.values());
  return { labels, data };
}

function groupSumsByDate(items, getDateKey, getAmount, startDate, endDate) {
  const sums = new Map();
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    sums.set(toLocalYYYYMMDD(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const item of items || []) {
    const key = getDateKey(item);
    if (!sums.has(key)) continue;
    const amt = getAmount(item);
    sums.set(key, (sums.get(key) || 0) + (Number.isFinite(amt) ? amt : 0));
  }

  const labels = Array.from(sums.keys()).map((k) => k.slice(5));
  const data = Array.from(sums.values());
  return { labels, data };
}

function getBookingSummary(items) {
  const total = (items || []).length;
  const completed = (items || []).filter((a) => a.status === 'completed').length;
  const cancelled = (items || []).filter((a) => a.status === 'cancelled' || a.status === 'no_show').length;
  const upcoming = Math.max(0, total - completed - cancelled);
  return { total, upcoming, completed, cancelled };
}

export default function BeautyStaffDashboard() {
  const { user } = useContext(AuthContext);
  const { format: formatCurrency } = useCurrency();
  const greeting = useMemo(() => getGreeting(), []);
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';

  const [loading, setLoading] = useState(true);
  const [appointmentsToday, setAppointmentsToday] = useState([]);
  const [appointmentsWeek, setAppointmentsWeek] = useState([]);
  const [appointmentsMonth, setAppointmentsMonth] = useState([]);
  const [monthInvoices, setMonthInvoices] = useState([]);
  const [invoiceAllowed, setInvoiceAllowed] = useState(true);

  const [periodKey, setPeriodKey] = useState('week');
  const [summaryTab, setSummaryTab] = useState('Weekly');
  const [revTab, setRevTab] = useState('Weekly');

  const todayStr = useMemo(() => toLocalYYYYMMDD(new Date()), []);
  const weekStartStr = useMemo(() => toLocalYYYYMMDD(addDays(new Date(), -6)), []);
  const monthStartStr = useMemo(() => toLocalYYYYMMDD(startOfMonth(new Date())), []);

  const periodOptions = useMemo(() => {
    return [
      { key: 'today', label: 'Today', start: todayStr, end: todayStr },
      { key: 'week', label: 'Last 7 days', start: weekStartStr, end: todayStr },
      { key: 'month', label: 'This month', start: monthStartStr, end: todayStr },
    ];
  }, [todayStr, weekStartStr, monthStartStr]);

  const activePeriod = useMemo(() => {
    return periodOptions.find((p) => p.key === periodKey) || periodOptions[1];
  }, [periodKey, periodOptions]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const [apptsTodayRes, apptsWeekRes, apptsMonthRes] = await Promise.all([
          api.get(`/appointments?date=${encodeURIComponent(todayStr)}&all=true&limit=200`),
          api.get(`/appointments?from_date=${encodeURIComponent(weekStartStr)}&to_date=${encodeURIComponent(todayStr)}&all=true&limit=2000`),
          api.get(`/appointments?from_date=${encodeURIComponent(monthStartStr)}&to_date=${encodeURIComponent(todayStr)}&all=true&limit=10000`),
        ]);

        if (cancelled) return;
        if (apptsTodayRes?.success) setAppointmentsToday(apptsTodayRes.data || []);
        if (apptsWeekRes?.success) setAppointmentsWeek(apptsWeekRes.data || []);
        if (apptsMonthRes?.success) setAppointmentsMonth(apptsMonthRes.data || []);

        // Invoices are optional for staff (depends on role permissions)
        const invRes = await api.get(`/invoices?from_date=${encodeURIComponent(monthStartStr)}&to_date=${encodeURIComponent(todayStr)}&page=1&limit=200`);
        if (invRes?.success) {
          setMonthInvoices(invRes.data || []);
          setInvoiceAllowed(true);
        } else {
          // If forbidden or error, just hide invoice widgets
          setInvoiceAllowed(false);
        }
      } catch (e) {
        console.error('Staff dashboard fetch error:', e);
        setInvoiceAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [todayStr, weekStartStr, monthStartStr]);

  const nextAppointments = useMemo(() => {
    const items = [...(appointmentsToday || [])].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const nowTime = Date.now();
    return items.filter(a => new Date(a.end_time).getTime() >= nowTime).slice(0, 6);
  }, [appointmentsToday]);

  const weekChart = useMemo(() => {
    const start = addDays(new Date(), -6);
    const end = new Date();
    return groupCountsByDate(
      appointmentsWeek,
      (a) => toLocalYYYYMMDD(new Date(a.start_time)),
      start,
      end
    );
  }, [appointmentsWeek]);

  const monthPaid = useMemo(() => sumBy(monthInvoices, (i) => i.status === 'paid'), [monthInvoices]);
  const monthPending = useMemo(() => sumBy(monthInvoices, (i) => i.status !== 'paid' && i.status !== 'void'), [monthInvoices]);

  const summaryDataByTab = useMemo(() => {
    const today = getBookingSummary(appointmentsToday);
    const week = getBookingSummary(appointmentsWeek);
    const month = getBookingSummary(appointmentsMonth);

    const active = summaryTab === 'Today' ? today : summaryTab === 'Monthly' ? month : week;
    return { today, week, month, active };
  }, [appointmentsToday, appointmentsWeek, appointmentsMonth, summaryTab]);

  const activeApptsForPeriod = useMemo(() => {
    if (activePeriod.key === 'today') return appointmentsToday;
    if (activePeriod.key === 'month') return appointmentsMonth;
    return appointmentsWeek;
  }, [activePeriod.key, appointmentsToday, appointmentsWeek, appointmentsMonth]);

  const completedInPeriod = useMemo(() => {
    return (activeApptsForPeriod || []).filter((a) => a.status === 'completed').length;
  }, [activeApptsForPeriod]);

  const uniqueClientsInPeriod = useMemo(() => {
    const set = new Set();
    for (const a of activeApptsForPeriod || []) {
      if (a.customer_id != null) set.add(a.customer_id);
    }
    return set.size;
  }, [activeApptsForPeriod]);

  const periodInvoices = useMemo(() => {
    if (!invoiceAllowed) return [];
    const start = activePeriod.start;
    const end = activePeriod.end;
    return (monthInvoices || []).filter((inv) => {
      const dateLike = inv.created_at || inv.createdAt || inv.issued_at || inv.date;
      if (!dateLike) return false;
      const key = toLocalYYYYMMDD(new Date(dateLike));
      return key >= start && key <= end;
    });
  }, [invoiceAllowed, monthInvoices, activePeriod.start, activePeriod.end]);

  const periodRevenuePaid = useMemo(() => sumBy(periodInvoices, (i) => i.status === 'paid'), [periodInvoices]);
  const periodRevenuePending = useMemo(() => sumBy(periodInvoices, (i) => i.status !== 'paid' && i.status !== 'void'), [periodInvoices]);

  const revenueChart = useMemo(() => {
    const start = fromLocalYYYYMMDD(activePeriod.start);
    const end = fromLocalYYYYMMDD(activePeriod.end);
    return groupSumsByDate(
      periodInvoices,
      (inv) => toLocalYYYYMMDD(new Date(inv.created_at || inv.createdAt || inv.issued_at || inv.date)),
      (inv) => (inv.status === 'paid' ? parseFloat(inv.total) || 0 : 0),
      start,
      end
    );
  }, [periodInvoices, activePeriod.start, activePeriod.end]);

  const summaryTotal = summaryDataByTab.active.total || 0;
  const pct = (n) => (summaryTotal ? Math.round((n / summaryTotal) * 100) : 0);

  const statCards = [
    {
      id: 'appts',
      icon: <CalendarIcon size={18} />,
      iconClass: 'si-primary',
      accent: 'primary',
      value: loading ? '—' : (activeApptsForPeriod?.length || 0),
      label: 'My Appointments',
      desc: 'Your bookings in the selected period.',
      today: `${loading ? '—' : (appointmentsToday?.length || 0)} today`,
      barPct: loading ? 0 : Math.min(100, ((appointmentsToday?.length || 0) / Math.max(activeApptsForPeriod?.length || 1, 1)) * 100),
    },
    {
      id: 'completed',
      icon: <CheckCircle2 size={18} />,
      iconClass: 'si-success',
      accent: 'success',
      value: loading ? '—' : completedInPeriod,
      label: 'Completed Sessions',
      desc: 'Sessions you successfully completed this period.',
      today: loading ? '—' : `${pct(completedInPeriod)}% completion rate`,
      barPct: loading ? 0 : Math.min(100, (completedInPeriod / Math.max(activeApptsForPeriod?.length || 1, 1)) * 100),
    },
    {
      id: 'clients',
      icon: <Users size={18} />,
      iconClass: 'si-warning',
      accent: 'warning',
      value: loading ? '—' : uniqueClientsInPeriod,
      label: 'Clients Served',
      desc: 'Unique clients you attended this period.',
      today: `${loading ? '—' : (activeApptsForPeriod?.length || 0)} total visits`,
      barPct: loading ? 0 : Math.min(100, (uniqueClientsInPeriod / Math.max(activeApptsForPeriod?.length || 1, 1)) * 100),
    },
    {
      id: 'revenue',
      icon: <DollarSign size={18} />,
      iconClass: 'si-info',
      accent: 'info',
      value: !invoiceAllowed ? '—' : (loading ? '—' : formatCurrency(periodRevenuePaid)),
      label: 'My Revenue (Paid)',
      desc: !invoiceAllowed ? 'Not available for your role.' : 'Paid revenue collected this period.',
      today: !invoiceAllowed ? 'Contact admin for access' : `Outstanding: ${loading ? '—' : formatCurrency(periodRevenuePending)}`,
      barPct: !invoiceAllowed ? 0 : loading ? 0 : Math.min(100, (periodRevenuePaid / Math.max(periodRevenuePaid + periodRevenuePending, 1)) * 100),
    },
  ];

  return (
    <div className="beauty-dashboard">
      <SEO page="beauty-dashboard" noindex={true} />
      <div className="container-fluid">

        {/* ── Hero Topbar ── */}
        <div className="beauty-topbar">
          <div className="beauty-topbar-shine" aria-hidden="true" />
          <div className="beauty-topbar-text me-auto">
            <h2>
              {greeting.text}{firstName ? `, ${firstName}` : ''} <greeting.Icon size={26} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px', opacity: 0.9 }} />
            </h2>
            <p>{greeting.sub}</p>
          </div>

          <div className="beauty-topbar-date me-2 d-none d-md-flex align-items-center">
            <span className="beauty-date-pill">
              <TrendingUp size={14} />
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle as="button" className="beauty-period-btn" id="staff-period-toggle">
              <CalendarIcon size={15} />
              {activePeriod.label}
              <small style={{ opacity: 0.8, fontSize: '0.78rem' }}>
                {formatRangeLabel(activePeriod.start, activePeriod.end)}
              </small>
            </Dropdown.Toggle>
            <Dropdown.Menu className="beauty-period-menu">
              {periodOptions.map((p) => (
                <Dropdown.Item
                  key={p.key}
                  active={p.key === activePeriod.key}
                  onClick={() => setPeriodKey(p.key)}
                  className="beauty-period-item"
                >
                  {p.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* ── Stat Cards ── */}
        <div className="row g-3 mb-4">
          {statCards.map((c) => (
            <div key={c.id} className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
              <div className="card beauty-stat-card h-100" data-accent={c.accent}>
                <div className="card-body">
                  <div className="sc2-header">
                    <span className={`sc2-icon ${c.iconClass}`}>{c.icon}</span>
                    <span className="sc2-label">{c.label}</span>
                  </div>
                  <span className="sc2-value">{c.value}</span>
                  <p className="sc2-desc">{c.desc}</p>
                  <div className="sc2-footer">
                    <div className="sc2-bar">
                      <div className="sc2-bar-fill" style={{ width: `${c.barPct}%` }} />
                    </div>
                    <span className="sc2-today">{c.today}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle Row: Bookings Summary + Revenue ── */}
        <div className="row g-3 mb-4">

          {/* Bookings Summary */}
          <div className="col-xl-6 col-lg-12">
            <div className="card h-100">
              <div className="card-header">
                <div className="beauty-section-header">
                  <div>
                    <p className="beauty-section-title">Bookings Summary</p>
                    <p className="beauty-section-sub">Monthly, weekly, and daily snapshot</p>
                  </div>
                  <div className="beauty-pill-tabs">
                    {['Monthly', 'Weekly', 'Today'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`beauty-tab-btn ${summaryTab === tab ? 'active' : ''}`}
                        onClick={() => setSummaryTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* KPI banner */}
                <div className="beauty-kpi-banner">
                  <span className="beauty-kpi-number">{loading ? '—' : summaryDataByTab.active.total}</span>
                  <p className="beauty-kpi-label">Total Bookings</p>
                  <Link to="/appointments" className="beauty-kpi-link">
                    Manage <ChevronRight size={14} />
                  </Link>
                </div>

                {/* Mini stat boxes */}
                <div className="row g-2 mb-3">
                  {[
                    { key: 'ms-upcoming',  label: 'Upcoming',  val: summaryDataByTab.active.upcoming },
                    { key: 'ms-completed', label: 'Completed', val: summaryDataByTab.active.completed },
                    { key: 'ms-cancelled', label: 'Cancelled', val: summaryDataByTab.active.cancelled },
                  ].map((b) => (
                    <div key={b.key} className="col-4">
                      <div className={`beauty-mini-stat ${b.key}`}>
                        <span className="ms-num">{loading ? '—' : b.val}</span>
                        <span className="ms-label">{b.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                {[
                  { label: `Upcoming (${pct(summaryDataByTab.active.upcoming)}%)`, val: summaryDataByTab.active.upcoming, color: 'var(--primary)' },
                  { label: `Completed (${pct(summaryDataByTab.active.completed)}%)`, val: summaryDataByTab.active.completed, color: 'var(--success)' },
                  { label: `Cancelled (${pct(summaryDataByTab.active.cancelled)}%)`, val: summaryDataByTab.active.cancelled, color: 'var(--danger)' },
                ].map((bar) => (
                  <div key={bar.label} className="beauty-progress-row">
                    <span className="bp-label">{bar.label}</span>
                    <div className="bp-bar">
                      <div className="bp-fill" style={{ width: `${pct(bar.val)}%`, background: bar.color }} />
                    </div>
                    <span className="bp-val">{loading ? '—' : bar.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="col-xl-6 col-lg-12">
            <div className="card h-100">
              <div className="card-header">
                <div className="beauty-section-header">
                  <div>
                    <p className="beauty-section-title">Revenue</p>
                    <p className="beauty-section-sub">Paid revenue over the selected period</p>
                  </div>
                  <div className="beauty-pill-tabs">
                    {['Monthly', 'Weekly', 'Daily'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`beauty-tab-btn ${revTab === tab ? 'active' : ''}`}
                        onClick={() => {
                          if (!invoiceAllowed) return;
                          setRevTab(tab);
                          setPeriodKey(tab === 'Monthly' ? 'month' : tab === 'Weekly' ? 'week' : 'today');
                        }}
                        style={!invoiceAllowed ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-body">
                {!invoiceAllowed ? (
                  <div className="beauty-empty">
                    <span className="be-icon">🔒</span>
                    <p>Revenue data is not available for your role.</p>
                    <small style={{ color: '#94a3b8' }}>Contact your administrator to request access.</small>
                  </div>
                ) : (
                  <>
                    <div className="d-flex gap-3 mb-3 flex-wrap">
                      <div className="beauty-rev-chip">
                        <span className="rc-label">Paid</span>
                        <span className="rc-value">{loading ? '—' : formatCurrency(periodRevenuePaid)}</span>
                      </div>
                      <div className="beauty-rev-chip">
                        <span className="rc-label">Outstanding</span>
                        <span className="rc-value">{loading ? '—' : formatCurrency(periodRevenuePending)}</span>
                      </div>
                    </div>
                    <ReactApexChart
                      type="bar"
                      height={220}
                      series={[{ name: 'Paid Revenue', data: revenueChart.data }]}
                      options={{
                        chart: { toolbar: { show: false }, fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
                        plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
                        dataLabels: { enabled: false },
                        colors: ['#244066'],
                        fill: {
                          type: 'gradient',
                          gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.4, gradientToColors: ['#3b75c4'], opacityFrom: 1, opacityTo: 0.7 },
                        },
                        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, padding: { left: 0, right: 0 } },
                        xaxis: {
                          categories: revenueChart.labels,
                          labels: { rotate: -40, style: { fontSize: '10px', colors: '#94a3b8', fontWeight: 600 } },
                          axisBorder: { show: false },
                          axisTicks: { show: false },
                        },
                        yaxis: {
                          labels: { style: { fontSize: '10px', colors: '#94a3b8', fontWeight: 600 }, formatter: (v) => `${Math.round(v)}` },
                        },
                        tooltip: {
                          y: { formatter: (v) => formatCurrency(v) },
                          theme: 'light',
                          style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
                        },
                        states: {
                          hover: { filter: { type: 'lighten', value: 0.15 } },
                        },
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Upcoming Today + Quick Actions ── */}
        <div className="row g-3">

          {/* Upcoming Appointments */}
          <div className="col-xl-8 col-lg-12">
            <div className="card">
              <div className="card-header">
                <div className="beauty-section-header align-items-center">
                  <div>
                    <p className="beauty-section-title">My Upcoming Today</p>
                    <p className="beauty-section-sub">{loading ? '…' : `${nextAppointments.length} appointment${nextAppointments.length !== 1 ? 's' : ''} remaining`}</p>
                  </div>
                  <Link to="/appointments" className="beauty-kpi-link">
                    View all <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                {loading ? (
                  <div className="beauty-empty"><span className="be-icon">⏳</span><p>Loading appointments…</p></div>
                ) : nextAppointments.length === 0 ? (
                  <div className="beauty-empty"><span className="be-icon">📅</span><p>No upcoming appointments for today.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="beauty-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Client</th>
                          <th>Service</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nextAppointments.map((a) => {
                          const time = new Date(a.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          const client = `${a.customer_first_name || ''} ${a.customer_last_name || ''}`.trim() || '—';
                          return (
                            <tr key={a.id}>
                              <td className="bt-time">{time}</td>
                              <td>
                                <div className="bt-avatar-cell">
                                  <span className="bt-avatar">{initials(client)}</span>
                                  <span className="bt-client">{client}</span>
                                </div>
                              </td>
                              <td className="bt-service">{a.service_name || '—'}</td>
                              <td>
                                <span className={`beauty-badge ${statusBadgeClass(a.status)}`}>
                                  {a.status || '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-xl-4 col-lg-12">
            <div className="card h-100">
              <div className="card-header">
                <div className="beauty-section-header align-items-center">
                  <p className="beauty-section-title">Quick Actions</p>
                </div>
              </div>
              <div className="card-body d-flex flex-column gap-2" style={{ paddingTop: '0.75rem' }}>
                {[
                  { label: 'Open POS',       to: '/pos',             accent: '#1c2f4e' },
                  { label: 'Create Booking', to: '/appointments',    accent: '#0ea47a' },
                  { label: 'Payments',       to: '/beauty-payments', accent: '#7c5cbf' },
                  { label: 'Notifications',  to: '/notifications',   accent: '#e8880a' },
                ].map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderRadius: 10,
                      background: `${action.accent}12`,
                      border: `1px solid ${action.accent}28`,
                      color: action.accent,
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      transition: 'background 0.18s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${action.accent}22`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${action.accent}12`; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: action.accent, flexShrink: 0 }} />
                    {action.label}
                    <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
