import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  DollarSign, Users, Calendar, TrendingUp, BarChart3,
  Scissors, Clock, UserCheck, AlertTriangle, Download
} from 'lucide-react';
import api from '../lib/api';
import './BeautyReports.css';

const PERIODS = [
  { key: 'daily', label: 'Daily', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; } },
  { key: 'weekly', label: 'Weekly', from: () => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0]; } },
  { key: 'monthly', label: 'Monthly', from: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; } },
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BeautyReports() {
  const [period, setPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);

  // Data
  const [revenue, setRevenue] = useState(null);
  const [staffPerf, setStaffPerf] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [clientsData, setClientsData] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const fromDate = PERIODS.find(p => p.key === period)?.from() || '';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const qs = `?period=${period}&from_date=${fromDate}&to_date=${today}`;
    try {
      const [rev, staff, svcs, clients, apts] = await Promise.all([
        api.get(`/reports/revenue${qs}`),
        api.get(`/reports/staff-performance?from_date=${fromDate}&to_date=${today}`),
        api.get(`/reports/services?from_date=${fromDate}&to_date=${today}`),
        api.get(`/reports/clients?from_date=${fromDate}&to_date=${today}`),
        api.get(`/reports/appointments?from_date=${fromDate}&to_date=${today}`),
      ]);
      if (rev.success) setRevenue(rev.data);
      if (staff.success) setStaffPerf(staff.data || []);
      if (svcs.success) setServicesData(svcs.data || []);
      if (clients.success) setClientsData(clients.data);
      if (apts.success) setAppointmentsData(apts.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period, fromDate, today]);

  useEffect(() => { fetchAll(); }, [period]);

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  // ── Chart configs ──
  const revenueChartOpts = useMemo(() => ({
    chart: { type: 'area', height: 300, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#f2421b', '#10b981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: {
      categories: (revenue?.timeline || []).map(t => t.period_label),
      labels: { style: { colors: '#94a3b8', fontSize: '11px' }, rotate: -45 }
    },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter: v => fmt(v) } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: v => fmt(v) } },
    legend: { position: 'top', horizontalAlign: 'right' },
  }), [revenue]);

  const revenueSeries = useMemo(() => [
    { name: 'Revenue', data: (revenue?.timeline || []).map(t => parseFloat(t.revenue || 0)) },
    { name: 'Tax', data: (revenue?.timeline || []).map(t => parseFloat(t.tax_collected || 0)) },
  ], [revenue]);

  const serviceDonutOpts = useMemo(() => ({
    chart: { type: 'donut', height: 300 },
    labels: servicesData.slice(0, 8).map(s => s.name),
    colors: ['#f2421b', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f2421b', '#ef4444', '#14b8a6'],
    legend: { position: 'bottom', fontSize: '12px' },
    plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => servicesData.reduce((s, x) => s + (x.total_bookings || 0), 0) } } } } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: v => `${v} bookings` } },
  }), [servicesData]);

  const serviceDonutSeries = useMemo(() => servicesData.slice(0, 8).map(s => s.total_bookings || 0), [servicesData]);

  const aptByDowOpts = useMemo(() => {
    const byDow = appointmentsData?.byDayOfWeek || [];
    const data = Array(7).fill(0);
    byDow.forEach(r => { if (r.dow >= 1 && r.dow <= 7) data[r.dow - 1] = r.count; });
    return {
      opts: {
        chart: { type: 'bar', height: 260, toolbar: { show: false } },
        colors: ['#f2421b'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
        xaxis: { categories: DOW_LABELS, labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: v => `${v} appointments` } },
      },
      series: [{ name: 'Appointments', data }],
    };
  }, [appointmentsData]);

  const aptByHourOpts = useMemo(() => {
    const byHour = appointmentsData?.byHour || [];
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm
    const data = hours.map(h => { const r = byHour.find(x => x.hour === h); return r ? r.count : 0; });
    return {
      opts: {
        chart: { type: 'bar', height: 260, toolbar: { show: false } },
        colors: ['#ec4899'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        xaxis: { categories: hours.map(h => `${h}:00`), labels: { style: { colors: '#94a3b8', fontSize: '10px' }, rotate: -45 } },
        yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        dataLabels: { enabled: false },
      },
      series: [{ name: 'Appointments', data }],
    };
  }, [appointmentsData]);

  const paymentMethodOpts = useMemo(() => {
    const methods = revenue?.byMethod || [];
    return {
      opts: {
        chart: { type: 'pie', height: 260 },
        labels: methods.map(m => m.method || 'Unknown'),
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#f2421b', '#ef4444'],
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: true, formatter: (v) => `${v.toFixed(0)}%` },
      },
      series: methods.map(m => parseFloat(m.amount) || 0),
    };
  }, [revenue]);

  const TABS = [
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'services', label: 'Services', icon: Scissors },
    { key: 'staff', label: 'Staff', icon: UserCheck },
    { key: 'clients', label: 'Clients', icon: Users },
  ];

  const aptStats = appointmentsData?.stats || {};
  const totals = revenue?.totals || {};

  return (
    <div className="rpt-page">
      {/* Header */}
      <div className="rpt-header">
        <div>
          <h2 className="rpt-title">Business Reports</h2>
          <p className="rpt-subtitle">Track your salon performance and insights</p>
        </div>
        <div className="rpt-period-btns">
          {PERIODS.map(p => (
            <button key={p.key} className={`rpt-period-btn ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="rpt-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={`rpt-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rpt-loading">Loading report data...</div>
      ) : (
        <>
          {/* ═══ Revenue Tab ═══ */}
          {activeTab === 'revenue' && (
            <div className="rpt-section">
              <div className="rpt-kpi-grid">
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#dcfce7' }}><DollarSign size={20} color="#10b981" /></div><div><span className="rpt-kpi-val">{fmt(totals.total_revenue)}</span><span className="rpt-kpi-lbl">Total Revenue</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef0ec' }}><BarChart3 size={20} color="#f2421b" /></div><div><span className="rpt-kpi-val">{fmt(totals.avg_invoice)}</span><span className="rpt-kpi-lbl">Avg Invoice</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef3c7' }}><Clock size={20} color="#f59e0b" /></div><div><span className="rpt-kpi-val">{fmt(totals.outstanding)}</span><span className="rpt-kpi-lbl">Outstanding</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef0ec' }}><TrendingUp size={20} color="#f2421b" /></div><div><span className="rpt-kpi-val">{totals.paid_invoices || 0}</span><span className="rpt-kpi-lbl">Paid Invoices</span></div></div>
              </div>

              <div className="rpt-charts-row">
                <div className="rpt-chart-card rpt-chart-lg">
                  <h6>Revenue Over Time</h6>
                  {revenueSeries[0].data.length > 0 ? (
                    <ReactApexChart options={revenueChartOpts} series={revenueSeries} type="area" height={300} />
                  ) : <p className="rpt-no-data">No revenue data for this period</p>}
                </div>
                <div className="rpt-chart-card">
                  <h6>Payment Methods</h6>
                  {paymentMethodOpts.series.length > 0 ? (
                    <ReactApexChart options={paymentMethodOpts.opts} series={paymentMethodOpts.series} type="pie" height={260} />
                  ) : <p className="rpt-no-data">No payment data</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Appointments Tab ═══ */}
          {activeTab === 'appointments' && (
            <div className="rpt-section">
              <div className="rpt-kpi-grid">
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef0ec' }}><Calendar size={20} color="#f2421b" /></div><div><span className="rpt-kpi-val">{aptStats.total || 0}</span><span className="rpt-kpi-lbl">Total</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#dcfce7' }}><UserCheck size={20} color="#10b981" /></div><div><span className="rpt-kpi-val">{aptStats.completed || 0}<small style={{ fontSize: '0.7rem', color: '#94a3b8' }}> ({aptStats.completion_rate || 0}%)</small></span><span className="rpt-kpi-lbl">Completed</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fee2e2' }}><AlertTriangle size={20} color="#ef4444" /></div><div><span className="rpt-kpi-val">{aptStats.no_shows || 0}<small style={{ fontSize: '0.7rem', color: '#94a3b8' }}> ({aptStats.no_show_rate || 0}%)</small></span><span className="rpt-kpi-lbl">No-shows</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef3c7' }}><Clock size={20} color="#f59e0b" /></div><div><span className="rpt-kpi-val">{aptStats.cancelled || 0}<small style={{ fontSize: '0.7rem', color: '#94a3b8' }}> ({aptStats.cancellation_rate || 0}%)</small></span><span className="rpt-kpi-lbl">Cancelled</span></div></div>
              </div>

              <div className="rpt-charts-row">
                <div className="rpt-chart-card">
                  <h6>Appointments by Day of Week</h6>
                  <ReactApexChart options={aptByDowOpts.opts} series={aptByDowOpts.series} type="bar" height={260} />
                </div>
                <div className="rpt-chart-card">
                  <h6>Appointments by Hour</h6>
                  <ReactApexChart options={aptByHourOpts.opts} series={aptByHourOpts.series} type="bar" height={260} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ Services Tab ═══ */}
          {activeTab === 'services' && (
            <div className="rpt-section">
              <div className="rpt-charts-row">
                <div className="rpt-chart-card">
                  <h6>Services Distribution</h6>
                  {serviceDonutSeries.some(s => s > 0) ? (
                    <ReactApexChart options={serviceDonutOpts} series={serviceDonutSeries} type="donut" height={300} />
                  ) : <p className="rpt-no-data">No service booking data</p>}
                </div>
                <div className="rpt-chart-card rpt-chart-lg">
                  <h6>Services Performance</h6>
                  <div className="rpt-table-wrap">
                    <table className="rpt-table">
                      <thead><tr><th>Service</th><th>Bookings</th><th>Completed</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {servicesData.length > 0 ? servicesData.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div className="rpt-svc-name">
                                {s.category_color && <span className="rpt-svc-dot" style={{ background: s.category_color }}></span>}
                                {s.name}
                              </div>
                            </td>
                            <td>{s.total_bookings}</td>
                            <td>{s.completed_bookings}</td>
                            <td className="rpt-amount">{fmt(s.revenue)}</td>
                          </tr>
                        )) : <tr><td colSpan={4} className="rpt-no-data">No service data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Staff Tab ═══ */}
          {activeTab === 'staff' && (
            <div className="rpt-section">
              <div className="rpt-table-card">
                <h6>Staff Performance</h6>
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead><tr><th>Staff</th><th>Appointments</th><th>Completed</th><th>No-shows</th><th>Rate</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {staffPerf.length > 0 ? staffPerf.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="rpt-staff-cell">
                              <span className="rpt-staff-avatar">{(s.full_name || '?')[0]}</span>
                              <div>
                                <span className="rpt-staff-name">{s.full_name}</span>
                                <span className="rpt-staff-role">{s.role}</span>
                              </div>
                            </div>
                          </td>
                          <td>{s.total_appointments}</td>
                          <td>{s.completed}</td>
                          <td>{s.no_shows}</td>
                          <td>
                            <div className="rpt-bar-cell">
                              <div className="rpt-bar"><div className="rpt-bar-fill" style={{ width: `${s.completion_rate || 0}%` }}></div></div>
                              <span>{s.completion_rate || 0}%</span>
                            </div>
                          </td>
                          <td className="rpt-amount">{fmt(s.revenue)}</td>
                        </tr>
                      )) : <tr><td colSpan={6} className="rpt-no-data">No staff data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Clients Tab ═══ */}
          {activeTab === 'clients' && (
            <div className="rpt-section">
              <div className="rpt-kpi-grid three">
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef0ec' }}><Users size={20} color="#f2421b" /></div><div><span className="rpt-kpi-val">{clientsData?.stats?.total_clients || 0}</span><span className="rpt-kpi-lbl">Total Clients</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#dcfce7' }}><TrendingUp size={20} color="#10b981" /></div><div><span className="rpt-kpi-val">{clientsData?.stats?.new_last_30 || 0}</span><span className="rpt-kpi-lbl">New (Last 30 Days)</span></div></div>
                <div className="rpt-kpi"><div className="rpt-kpi-icon" style={{ background: '#fef3c7' }}><UserCheck size={20} color="#f59e0b" /></div><div><span className="rpt-kpi-val">{clientsData?.stats?.active_clients || 0}</span><span className="rpt-kpi-lbl">Active Clients</span></div></div>
              </div>

              <div className="rpt-table-card">
                <h6>Top Clients</h6>
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead><tr><th>Client</th><th>Visits</th><th>Total Spent</th><th>Last Visit</th></tr></thead>
                    <tbody>
                      {(clientsData?.topClients || []).length > 0 ? clientsData.topClients.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div className="rpt-staff-cell">
                              <span className="rpt-staff-avatar">{(c.first_name || '?')[0]}</span>
                              <div>
                                <span className="rpt-staff-name">{c.first_name} {c.last_name}</span>
                                <span className="rpt-staff-role">{c.email || c.phone || ''}</span>
                              </div>
                            </div>
                          </td>
                          <td>{c.visits}</td>
                          <td className="rpt-amount">{fmt(c.total_spent)}</td>
                          <td>{c.last_visit ? new Date(c.last_visit).toLocaleDateString() : '-'}</td>
                        </tr>
                      )) : <tr><td colSpan={4} className="rpt-no-data">No client data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
