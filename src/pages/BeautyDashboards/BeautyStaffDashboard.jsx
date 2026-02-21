import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { Calendar as CalendarIcon, CheckCircle2, DollarSign, Users, ShoppingCart, Bell, CreditCard as PosIcon, Plus, ChevronRight, TrendingUp } from 'lucide-react';
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

  return (
    <div className="beauty-dashboard">
      <SEO page="beauty-dashboard" noindex={true} />
      <div className="container-fluid">
        <div className="beauty-topbar d-flex align-items-start" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="me-auto d-none d-lg-block">
            <h2 className="text-primary" style={{ fontWeight: 700, marginBottom: 2 }}>Dashboard</h2>
            <p className="mb-0 text-muted">Hi{user?.full_name ? `, ${user.full_name}` : ''} — here’s your day at a glance</p>
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle size="sm" className="btn btn-primary d-flex align-items-center" style={{ borderRadius: 12 }}>
              <CalendarIcon size={18} style={{ marginRight: 10 }} />
              <div className="text-start" style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Filter Period</div>
                <small style={{ opacity: 0.9 }}>{formatRangeLabel(activePeriod.start, activePeriod.end)}</small>
              </div>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {periodOptions.map((p) => (
                <Dropdown.Item key={p.key} active={p.key === activePeriod.key} onClick={() => setPeriodKey(p.key)}>
                  {p.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div className="row">
          <div className="col-xl-3 col-xxl-3 col-lg-6 col-md-6 col-sm-6">
            <div className="card beauty-stat-card">
              <div className="card-body p-4">
                <div className="beauty-stat-top">
                  <span
                    className="beauty-stat-icon"
                  >
                    <CalendarIcon size={20} />
                  </span>
                  <div className="beauty-stat-content">
                    <h3 className="beauty-stat-value">{loading ? '—' : (activeApptsForPeriod?.length || 0)}</h3>
                    <p className="beauty-stat-label">My Appointments</p>
                  </div>
                  <div className="beauty-stat-chart">
                    <WeeklySalesBarChart name="My week" data={weekChart.data} categories={weekChart.labels} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-xxl-3 col-lg-6 col-md-6 col-sm-6">
            <div className="card beauty-stat-card">
              <div className="card-body p-4">
                <div className="beauty-stat-top">
                  <span
                    className="beauty-stat-icon"
                  >
                    <CheckCircle2 size={20} />
                  </span>
                  <div className="beauty-stat-content">
                    <h3 className="beauty-stat-value">{loading ? '—' : completedInPeriod}</h3>
                    <p className="beauty-stat-label">Completed (period)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-xxl-3 col-lg-6 col-md-6 col-sm-6">
            <div className="card beauty-stat-card">
              <div className="card-body p-4">
                <div className="beauty-stat-top">
                  <span
                    className="beauty-stat-icon"
                  >
                    <Users size={20} />
                  </span>
                  <div className="beauty-stat-content">
                    <h3 className="beauty-stat-value">{loading ? '—' : uniqueClientsInPeriod}</h3>
                    <p className="beauty-stat-label">Clients Served</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-xxl-3 col-lg-6 col-md-6 col-sm-6">
            <div className="card beauty-stat-card">
              <div className="card-body p-4">
                <div className="beauty-stat-top">
                  <span
                    className="beauty-stat-icon"
                  >
                    <DollarSign size={20} />
                  </span>
                  <div className="beauty-stat-content">
                    <h3 className="beauty-stat-value">
                      {!invoiceAllowed ? '—' : (loading ? '—' : formatCurrency(periodRevenuePaid))}
                    </h3>
                    <p className="beauty-stat-label">My Revenue (paid)</p>
                    <small className="beauty-stat-sub">{!invoiceAllowed ? 'Not available for your role' : `Outstanding: ${loading ? '—' : formatCurrency(periodRevenuePending)}`}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-6 col-xxl-6 col-lg-12 col-md-12">
            <div className="card">
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

              <div className="card-body pt-3">
                <div
                  className="d-flex flex-wrap p-3 align-items-center mb-4"
                  style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: 14 }}
                >
                  <span className="btn fs-22 text-white py-1 px-4 me-3 beauty-kpi-chip" style={{ background: 'var(--success)', borderRadius: 12 }}>
                    {loading ? '—' : summaryDataByTab.active.total}
                  </span>
                  <h4 className="mb-0" style={{ fontWeight: 800 }}>
                    Bookings <span className="ms-2" style={{ color: 'var(--success)' }}>●</span>
                  </h4>
                  <Link
                    to="/appointments"
                    className="ms-sm-auto mt-sm-0 mt-2"
                    style={{ color: 'var(--success)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Manage bookings
                  </Link>
                </div>

                <div className="row">
                  {[
                    { label: 'Upcoming', value: summaryDataByTab.active.upcoming },
                    { label: 'Completed', value: summaryDataByTab.active.completed },
                    { label: 'Cancelled', value: summaryDataByTab.active.cancelled },
                  ].map((b) => (
                    <div key={b.label} className="col-sm-4 mb-4">
                      <div className="border px-3 py-3 rounded-3">
                        <div style={{ fontSize: 28, fontWeight: 800 }}>{loading ? '—' : b.value}</div>
                        <p className="fs-16 mb-0 text-muted">{b.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-xxl-6 col-lg-12 col-md-12">
            <div className="card">
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
                        style={!invoiceAllowed ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-body px-3">
                {!invoiceAllowed ? (
                  <div className="text-muted" style={{ padding: '12px 6px' }}>Invoices not available for your role.</div>
                ) : (
                  <>
                    <div className="d-flex flex-wrap justify-content-end pe-3 revenue-chart-bar">
                      <div className="d-flex align-items-end me-4 mb-2">
                        <div>
                          <small className="text-dark fs-14">Paid</small>
                          <h3 className="mb-0" style={{ fontWeight: 800 }}>{loading ? '—' : formatCurrency(periodRevenuePaid)}</h3>
                        </div>
                      </div>
                      <div className="d-flex align-items-end mb-2">
                        <div>
                          <small className="text-dark fs-14">Outstanding</small>
                          <h3 className="mb-0" style={{ fontWeight: 800 }}>{loading ? '—' : formatCurrency(periodRevenuePending)}</h3>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <ReactApexChart
                        type="bar"
                        height={260}
                        series={[{ name: 'Paid revenue', data: revenueChart.data }]}
                        options={{
                          chart: { toolbar: { show: false }, fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
                          plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
                          dataLabels: { enabled: false },
                          colors: ['var(--primary)'],
                          grid: { borderColor: 'rgba(0,0,0,0.05)' },
                          xaxis: { categories: revenueChart.labels, labels: { rotate: -45 } },
                          yaxis: { labels: { formatter: (v) => `${Math.round(v)}` } },
                          tooltip: { y: { formatter: (v) => formatCurrency(v) } },
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-8">
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className="card-title" style={{ margin: 0 }}>My upcoming today</h4>
                <Link to="/appointments" className="btn btn-outline-secondary btn-sm">View</Link>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                {loading ? (
                  <div className="text-muted">Loading…</div>
                ) : nextAppointments.length === 0 ? (
                  <div className="text-muted">No upcoming appointments.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
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
                          const start = new Date(a.start_time);
                          const time = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          const client = `${a.customer_first_name || ''} ${a.customer_last_name || ''}`.trim() || '—';
                          return (
                            <tr key={a.id}>
                              <td>{time}</td>
                              <td>{client}</td>
                              <td>{a.service_name || '—'}</td>
                              <td>{a.status || '—'}</td>
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

          <div className="col-xl-4">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title" style={{ margin: 0 }}>Front desk snapshot</h4>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <div className="text-muted" style={{ marginBottom: 10 }}>Quick actions</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link className="btn btn-outline-secondary btn-sm" to="/pos">Open POS</Link>
                  <Link className="btn btn-outline-secondary btn-sm" to="/appointments">Create booking</Link>
                  <Link className="btn btn-outline-secondary btn-sm" to="/beauty-payments">Payments</Link>
                  <Link className="btn btn-outline-secondary btn-sm" to="/notifications">Notifications</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
