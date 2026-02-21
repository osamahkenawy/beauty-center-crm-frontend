import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  TrendingUp, Users, Calendar, DollarSign, Award,
  ChevronDown, ChevronUp, Clock, RefreshCw, Star
} from 'lucide-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import SEO from '../components/SEO';
import './BeautyDashboard.css';
import './BeautyReports.css';

/* ─── helpers ─────────────────────────────────────── */
function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

const PERIODS = [
  { key: '30d',  label: 'Last 30 Days',    days: 30 },
  { key: '90d',  label: 'Last 3 Months',   days: 90 },
  { key: '180d', label: 'Last 6 Months',  days: 180 },
  { key: '365d', label: 'Last Year',       days: 365 },
];

function fromDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const ACCENT_COLORS = [
  '#1c2f4e', '#0ea47a', '#7c5cbf', '#e8880a',
  '#e84393', '#0284c7', '#dc2626', '#059669',
];

/* ─── RingGauge ────────────────────────────────────── */
function RingGauge({ pct, color = '#1c2f4e', size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, pct || 0) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

/* ─── MiniBarChart (inline sparkline for trend) ────── */
function SparkBar({ values = [], color = '#1c2f4e', height = 32 }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * height)}px`,
            background: color,
            borderRadius: 2,
            opacity: 0.75 + (i / values.length) * 0.25,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
export default function BeautyStaffPerformance() {
  const { format: formatCurrency } = useCurrency();

  const [periodKey, setPeriodKey] = useState('90d');
  const [loading, setLoading]     = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [selected, setSelected]   = useState(null);    // expanded staff id
  const [drillData, setDrillData] = useState({});       // { [id]: { trends, services } }
  const [drillLoading, setDrillLoading] = useState(false);

  const activePeriod = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
  const fd = fromDate(activePeriod.days);
  const td = today();

  /* fetch summary list */
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/staff-performance?from_date=${fd}&to_date=${td}`);
      if (res.success) setStaffList(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fd, td]);

  useEffect(() => { fetchList(); }, [fetchList]);

  /* fetch drill-down for a staff member */
  const openDrill = useCallback(async (id) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    if (drillData[id]) return;           // already cached
    setDrillLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.get(`/reports/staff-performance/${id}/trends?months=12`),
        api.get(`/reports/staff-performance/${id}/services?from_date=${fd}&to_date=${td}`),
      ]);
      setDrillData(prev => ({
        ...prev,
        [id]: {
          trends:   tRes.success   ? (tRes.data   || []) : [],
          services: sRes.success ? (sRes.data || []) : [],
        },
      }));
    } catch (e) { console.error(e); }
    finally { setDrillLoading(false); }
  }, [selected, drillData, fd, td]);

  /* ── aggregates ── */
  const totals = useMemo(() => {
    const totalRevenue  = staffList.reduce((s, m) => s + parseFloat(m.revenue || 0), 0);
    const totalAppts    = staffList.reduce((s, m) => s + parseInt(m.total_appointments || 0), 0);
    const avgCompletion = staffList.length
      ? staffList.reduce((s, m) => s + parseFloat(m.completion_rate || 0), 0) / staffList.length
      : 0;
    const topPerformer  = staffList[0] || null;
    return { totalRevenue, totalAppts, avgCompletion, topPerformer };
  }, [staffList]);

  /* ── comparison bar chart ── */
  const comparisonChart = useMemo(() => {
    const top = staffList.slice(0, 8);
    return {
      opts: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
        colors: top.map((_, i) => ACCENT_COLORS[i % ACCENT_COLORS.length]),
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        xaxis: {
          categories: top.map(m => m.full_name || 'Staff'),
          labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { y: { formatter: v => formatCurrency(v) } },
        legend: { show: false },
      },
      series: [{ name: 'Revenue', data: top.map(m => parseFloat(m.revenue || 0)) }],
      completionSeries: [{ name: 'Completion %', data: top.map(m => parseFloat(m.completion_rate || 0)) }],
      completionOpts: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
        colors: ['#0ea47a'],
        dataLabels: { enabled: true, formatter: v => `${v}%`, style: { colors: ['#fff'], fontSize: '11px', fontWeight: 700 } },
        xaxis: {
          categories: top.map(m => m.full_name || 'Staff'),
          max: 100,
          labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { y: { formatter: v => `${v}%` } },
        legend: { show: false },
      },
    };
  }, [staffList, formatCurrency]);

  /* ── drill trend chart ── */
  function buildTrendChart(trends = []) {
    return {
      opts: {
        chart: { type: 'line', toolbar: { show: false }, fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
        colors: ['#1c2f4e', '#0ea47a'],
        stroke: { curve: 'smooth', width: [2, 2] },
        fill: { type: ['gradient', 'solid'], gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02 } },
        dataLabels: { enabled: false },
        xaxis: {
          categories: trends.map(t => t.month),
          labels: { style: { colors: '#94a3b8', fontSize: '10px' }, rotate: -40 },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: [
          { title: { text: 'Appointments', style: { color: '#1c2f4e', fontWeight: 600 } }, labels: { style: { colors: '#94a3b8', fontSize: '10px' } } },
          { opposite: true, title: { text: 'Revenue', style: { color: '#0ea47a', fontWeight: 600 } }, labels: { style: { colors: '#94a3b8', fontSize: '10px' }, formatter: v => Math.round(v) } },
        ],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { shared: true, intersect: false },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
      },
      series: [
        { name: 'Appointments', type: 'area',  data: trends.map(t => parseInt(t.completed || 0)) },
        { name: 'Revenue',      type: 'line',  data: trends.map(t => parseFloat(t.revenue || 0)) },
      ],
    };
  }

  /* ── services bar chart ── */
  function buildServicesChart(services = []) {
    const top = services.slice(0, 7);
    return {
      opts: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '60%' } },
        colors: ['#7c5cbf'],
        dataLabels: { enabled: false },
        xaxis: {
          categories: top.map(s => s.name),
          labels: { style: { colors: '#64748b', fontSize: '11px' } },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { y: { formatter: v => `${v} bookings` } },
        legend: { show: false },
      },
      series: [{ name: 'Bookings', data: top.map(s => parseInt(s.total_bookings || 0)) }],
    };
  }

  /* ── skeleton row ── */
  const Skeleton = ({ w = '100%', h = 16, r = 6 }) => (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200%', animation: 'shimmer 1.4s infinite' }} />
  );

  return (
    <div className="beauty-dashboard">
      <SEO page="beauty-staff-performance" noindex />
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .spm-card { background:#fff; border-radius:14px; border:1px solid #e8ecf2; box-shadow:0 1px 8px rgba(0,0,0,0.05); }
        .spm-staff-row { border-radius:12px; border:1px solid #e8ecf2; background:#fff; cursor:pointer; transition:box-shadow .15s, border-color .15s; }
        .spm-staff-row:hover { box-shadow:0 4px 18px rgba(28,47,78,0.1); border-color:#c7d2de; }
        .spm-staff-row.active { border-color:#1c2f4e; box-shadow:0 0 0 2px rgba(28,47,78,0.15); }
        .spm-avatar { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:#fff; flex-shrink:0; }
        .spm-stat { display:flex; flex-direction:column; align-items:center; }
        .spm-stat .val { font-size:1.1rem; font-weight:800; color:#1e293b; line-height:1; }
        .spm-stat .lbl { font-size:0.68rem; color:#94a3b8; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:0.04em; }
        .spm-drill { background:#f8fafc; border-top:1px solid #e8ecf2; border-radius:0 0 12px 12px; padding:20px; }
        .spm-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; }
        .spm-kpi { display:flex; flex-direction:column; gap:4px; }
        .spm-kpi .k-val { font-size:1.5rem; font-weight:800; color:#1e293b; }
        .spm-kpi .k-lbl { font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
        .spm-kpi .k-sub { font-size:0.78rem; color:#64748b; }
        .spm-tab-btn { padding:5px 14px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-size:0.8rem; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
        .spm-tab-btn.active { background:#1c2f4e; border-color:#1c2f4e; color:#fff; }
        .spm-compare-tab { padding:5px 14px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-size:0.8rem; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
        .spm-compare-tab.active { background:#1c2f4e; border-color:#1c2f4e; color:#fff; }
      `}</style>

      <div className="container-fluid">

        {/* ── Topbar ── */}
        <div className="beauty-topbar">
          <div className="beauty-topbar-shine" aria-hidden="true" />
          <div className="beauty-topbar-text me-auto">
            <h2>Staff Performance <Award size={24} style={{ display:'inline', verticalAlign:'middle', marginLeft:6, opacity:0.85 }} /></h2>
            <p>Analytics, commission tracking and performance trends for your team</p>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`spm-tab-btn ${periodKey === p.key ? 'active' : ''}`}
                onClick={() => setPeriodKey(p.key)}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={fetchList}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, color:'#fff', padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="row g-3 mb-4">
          {[
            {
              accent: 'primary', icon: <DollarSign size={18} />, iconClass: 'si-primary',
              value: loading ? '—' : formatCurrency(totals.totalRevenue),
              label: 'Total Revenue', sub: `Across ${staffList.length} staff`,
              barPct: 100,
            },
            {
              accent: 'success', icon: <Calendar size={18} />, iconClass: 'si-success',
              value: loading ? '—' : totals.totalAppts.toLocaleString(),
              label: 'Total Appointments', sub: `In ${activePeriod.label.toLowerCase()}`,
              barPct: 100,
            },
            {
              accent: 'warning', icon: <TrendingUp size={18} />, iconClass: 'si-warning',
              value: loading ? '—' : `${totals.avgCompletion.toFixed(1)}%`,
              label: 'Avg Completion Rate', sub: 'Team average',
              barPct: totals.avgCompletion,
            },
            {
              accent: 'info', icon: <Star size={18} />, iconClass: 'si-info',
              value: loading ? '—' : (totals.topPerformer?.full_name || '—'),
              label: 'Top Performer', sub: loading ? '—' : `${formatCurrency(totals.topPerformer?.revenue || 0)} revenue`,
              barPct: 100,
            },
          ].map((c, i) => (
            <div key={i} className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
              <div className="card beauty-stat-card h-100" data-accent={c.accent}>
                <div className="card-body">
                  <div className="sc2-header">
                    <span className={`sc2-icon ${c.iconClass}`}>{c.icon}</span>
                    <span className="sc2-label">{c.label}</span>
                  </div>
                  <span className="sc2-value" style={{ fontSize: i === 3 ? '1.05rem' : undefined }}>{c.value}</span>
                  <p className="sc2-desc">{c.sub}</p>
                  <div className="sc2-footer">
                    <div className="sc2-bar"><div className="sc2-bar-fill" style={{ width: `${c.barPct}%` }} /></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Comparison Charts ── */}
        {!loading && staffList.length > 0 && (
          <ComparisonSection
            staffList={staffList}
            chart={comparisonChart}
            formatCurrency={formatCurrency}
          />
        )}

        {/* ── Staff Leaderboard ── */}
        <div className="spm-card p-0 mb-4">
          <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid #f0f4f8' }}>
            <div className="beauty-section-header align-items-center">
              <div>
                <p className="beauty-section-title">Staff Leaderboard</p>
                <p className="beauty-section-sub">Click a staff member to see detailed analytics</p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                {activePeriod.label}
              </span>
            </div>
          </div>

          <div style={{ padding: '12px 16px' }}>
            {loading ? (
              <div className="d-flex flex-column gap-3 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="d-flex align-items-center gap-3">
                    <Skeleton w={44} h={44} r={12} />
                    <div className="flex-1 d-flex flex-column gap-2"><Skeleton w="40%" /><Skeleton w="60%" h={10} /></div>
                  </div>
                ))}
              </div>
            ) : staffList.length === 0 ? (
              <div className="beauty-empty"><span className="be-icon">👥</span><p>No staff data for this period.</p></div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {staffList.map((member, idx) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    rank={idx + 1}
                    isOpen={selected === member.id}
                    onToggle={() => openDrill(member.id)}
                    drillData={drillData[member.id]}
                    drillLoading={drillLoading && selected === member.id}
                    formatCurrency={formatCurrency}
                    accentColor={ACCENT_COLORS[idx % ACCENT_COLORS.length]}
                    buildTrendChart={buildTrendChart}
                    buildServicesChart={buildServicesChart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Comparison Section ────────────────────────────── */
function ComparisonSection({ staffList, chart, formatCurrency }) {
  const [metric, setMetric] = useState('revenue');
  const chartHeight = Math.max(200, staffList.slice(0, 8).length * 46);

  return (
    <div className="row g-3 mb-4">
      <div className="col-xl-8 col-lg-12">
        <div className="spm-card p-0 h-100">
          <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid #f0f4f8' }}>
            <div className="beauty-section-header align-items-center">
              <div>
                <p className="beauty-section-title">Staff Comparison</p>
                <p className="beauty-section-sub">Side-by-side comparison across your team</p>
              </div>
              <div className="d-flex gap-1">
                {[['revenue', 'Revenue'], ['completion', 'Completion %']].map(([k, l]) => (
                  <button key={k} className={`spm-compare-tab ${metric === k ? 'active' : ''}`} onClick={() => setMetric(k)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '8px 12px' }}>
            <ReactApexChart
              key={metric}
              type="bar"
              height={chartHeight}
              series={metric === 'revenue' ? chart.series : chart.completionSeries}
              options={metric === 'revenue' ? chart.opts : chart.completionOpts}
            />
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-lg-12">
        <div className="spm-card p-0 h-100">
          <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid #f0f4f8' }}>
            <p className="beauty-section-title">Revenue Share</p>
            <p className="beauty-section-sub">Distribution of team revenue</p>
          </div>
          <div style={{ padding: '8px 12px' }}>
            <RevenueShareChart staffList={staffList} formatCurrency={formatCurrency} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Revenue Share Donut ───────────────────────────── */
function RevenueShareChart({ staffList, formatCurrency }) {
  const top = staffList.slice(0, 6);
  const opts = useMemo(() => ({
    chart: { type: 'donut', fontFamily: 'Inter, system-ui, sans-serif', background: 'transparent' },
    labels: top.map(m => m.full_name || 'Staff'),
    colors: ACCENT_COLORS.slice(0, top.length),
    legend: { position: 'bottom', fontSize: '11px', fontWeight: 600, labels: { colors: '#64748b' } },
    plotOptions: { pie: { donut: { size: '62%', labels: { show: true, total: { show: true, label: 'Team Total', formatter: () => top.reduce((s, m) => s + parseFloat(m.revenue || 0), 0).toFixed(0) } } } } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: v => formatCurrency(v) } },
  }), [top, formatCurrency]);

  const series = useMemo(() => top.map(m => parseFloat(m.revenue || 0)), [top]);
  if (!series.length || series.every(v => v === 0)) return (
    <div className="beauty-empty" style={{ padding: 30 }}><p>No revenue data.</p></div>
  );
  return <ReactApexChart type="donut" height={280} series={series} options={opts} />;
}

/* ─── Staff Row ─────────────────────────────────────── */
function StaffRow({ member, rank, isOpen, onToggle, drillData, drillLoading, formatCurrency, accentColor, buildTrendChart, buildServicesChart }) {
  const medals = ['🥇', '🥈', '🥉'];
  const completion = parseFloat(member.completion_rate || 0);
  const commission = parseFloat(member.revenue || 0) * (parseFloat(member.commission_rate || 0) / 100);
  const retentionPct = member.unique_clients > 0
    ? Math.round((parseInt(member.returning_clients || 0) / parseInt(member.unique_clients)) * 100)
    : 0;

  return (
    <div className={`spm-staff-row ${isOpen ? 'active' : ''}`}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', flexWrap: 'wrap' }}
        onClick={onToggle}
      >
        {/* Rank */}
        <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>
          {rank <= 3 ? medals[rank - 1] : <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>#{rank}</span>}
        </span>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, flex: '0 0 auto' }}>
          <div className="spm-avatar" style={{ background: accentColor }}>
            {initials(member.full_name)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>{member.full_name}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'capitalize' }}>{member.role || 'Staff'}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="spm-stat"><span className="val">{formatCurrency(member.revenue || 0)}</span><span className="lbl">Revenue</span></div>
          <div className="spm-stat"><span className="val">{member.total_appointments || 0}</span><span className="lbl">Appts</span></div>
          <div className="spm-stat"><span className="val">{member.completed || 0}</span><span className="lbl">Done</span></div>
          <div className="spm-stat"><span className="val">{member.unique_clients || 0}</span><span className="lbl">Clients</span></div>
          <div className="spm-stat"><span className="val">{member.avg_service_minutes || '—'}{member.avg_service_minutes ? 'm' : ''}</span><span className="lbl">Avg Time</span></div>
          <div className="spm-stat">
            <span className="val" style={{ color: commission > 0 ? '#0ea47a' : '#94a3b8' }}>{formatCurrency(commission)}</span>
            <span className="lbl">Commission ({parseFloat(member.commission_rate || 0).toFixed(0)}%)</span>
          </div>
        </div>

        {/* Completion ring + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <RingGauge pct={completion} color={accentColor} size={52} />
            <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 800, color: '#1e293b' }}>{completion.toFixed(0)}%</span>
          </div>
          {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </div>

      {/* Drill-down panel */}
      {isOpen && (
        <div className="spm-drill">
          {drillLoading ? (
            <div className="text-center py-4" style={{ color: '#94a3b8' }}>
              <Clock size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading analytics…
            </div>
          ) : (
            <DrillPanel
              member={member}
              drillData={drillData || { trends: [], services: [] }}
              formatCurrency={formatCurrency}
              commission={commission}
              retentionPct={retentionPct}
              buildTrendChart={buildTrendChart}
              buildServicesChart={buildServicesChart}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Drill Panel ───────────────────────────────────── */
function DrillPanel({ member, drillData, formatCurrency, commission, retentionPct, buildTrendChart, buildServicesChart }) {
  const { trends = [], services = [] } = drillData;
  const trendChart    = useMemo(() => buildTrendChart(trends),    [trends, buildTrendChart]);
  const servicesChart = useMemo(() => buildServicesChart(services), [services, buildServicesChart]);

  const sparkData = trends.slice(-8).map(t => parseInt(t.completed || 0));

  return (
    <div>
      {/* Quick stats banner */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Commission Earned', value: formatCurrency(commission), icon: <DollarSign size={14} />, color: '#0ea47a' },
          { label: 'Client Retention', value: `${retentionPct}%`, icon: <Users size={14} />, color: '#7c5cbf' },
          { label: 'No-Shows', value: member.no_shows || 0, icon: <Calendar size={14} />, color: '#e8880a' },
          { label: 'Cancellations', value: member.cancelled || 0, icon: <TrendingUp size={14} />, color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-md-3">
            <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e8ecf2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: s.color, fontWeight: 600, fontSize: '0.78rem' }}>
                {s.icon}{s.label}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Trend chart */}
        <div className="col-xl-7 col-lg-12">
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e8ecf2' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>
              Performance Trend — Last 12 Months
            </div>
            {trends.length === 0 ? (
              <div className="beauty-empty" style={{ padding: 30 }}><p>No trend data available.</p></div>
            ) : (
              <ReactApexChart type="line" height={210} series={trendChart.series} options={trendChart.opts} />
            )}
          </div>
        </div>

        {/* Top services */}
        <div className="col-xl-5 col-lg-12">
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e8ecf2', height: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 8 }}>
              Top Services Performed
            </div>
            {services.length === 0 ? (
              <div className="beauty-empty" style={{ padding: 20 }}><p>No service data.</p></div>
            ) : (
              <>
                <ReactApexChart type="bar" height={180} series={servicesChart.series} options={servicesChart.opts} />
                <div className="d-flex flex-column gap-1 mt-2">
                  {services.slice(0, 4).map((svc, i) => (
                    <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT_COLORS[i], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</span>
                      <span style={{ color: '#64748b' }}>{svc.total_bookings} bookings</span>
                      <span style={{ color: '#0ea47a', fontWeight: 700 }}>{formatCurrency(svc.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sparkline mini summary */}
      {sparkData.length > 1 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Recent completed sessions trend (last 8 months):</span>
          <SparkBar values={sparkData} color="#1c2f4e" height={28} />
        </div>
      )}
    </div>
  );
}
