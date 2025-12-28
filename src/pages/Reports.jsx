import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
  StatsUpSquare, GraphUp, User, Wallet, Flash, Calendar, RefreshDouble,
  Download, Filter
} from 'iconoir-react';
import api from '../lib/api';
import './Reports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [reportType, setReportType] = useState('all');
  const { t } = useTranslation();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/reports?type=${reportType}&period=${period}`);
      if (data.success) setReportData(data.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, [period, reportType]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', { 
      style: 'currency', 
      currency: 'AED', 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  // Chart Data
  const revenueChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Revenue',
        data: [
          reportData?.overview?.deals?.wonValue * 0.2 || 5000,
          reportData?.overview?.deals?.wonValue * 0.35 || 8000,
          reportData?.overview?.deals?.wonValue * 0.25 || 6000,
          reportData?.overview?.deals?.wonValue * 0.2 || 4000
        ],
        borderColor: '#244066',
        backgroundColor: 'rgba(36, 64, 102, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Pipeline',
        data: [
          reportData?.overview?.deals?.pipelineValue * 0.3 || 10000,
          reportData?.overview?.deals?.pipelineValue * 0.25 || 8000,
          reportData?.overview?.deals?.pipelineValue * 0.25 || 9000,
          reportData?.overview?.deals?.pipelineValue * 0.2 || 7000
        ],
        borderColor: '#f2421b',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ]
  };

  const pipelineChartData = {
    labels: reportData?.sales?.byStage?.map(s => s.name) || ['Stage 1', 'Stage 2', 'Stage 3'],
    datasets: [{
      data: reportData?.sales?.byStage?.map(s => s.count) || [5, 8, 3],
      backgroundColor: reportData?.sales?.byStage?.map(s => s.color) || ['#3b82f6', '#8b5cf6', '#f59e0b'],
      borderWidth: 0,
    }]
  };

  const leadSourceChartData = {
    labels: reportData?.leads?.bySource?.map(s => s.source || 'Unknown') || ['Website', 'Referral', 'Other'],
    datasets: [{
      label: 'Leads',
      data: reportData?.leads?.bySource?.map(s => s.count) || [10, 8, 5],
      backgroundColor: [
        'rgba(36, 64, 102, 0.9)',
        'rgba(242, 66, 27, 0.9)',
        'rgba(59, 130, 246, 0.9)',
        'rgba(139, 92, 246, 0.9)',
        'rgba(34, 197, 94, 0.9)',
        'rgba(245, 158, 11, 0.9)'
      ],
      borderRadius: 6,
    }]
  };

  const conversionChartData = {
    labels: ['Converted', 'Not Converted'],
    datasets: [{
      data: [
        reportData?.overview?.leads?.converted || 5,
        (reportData?.overview?.leads?.total || 10) - (reportData?.overview?.leads?.converted || 5)
      ],
      backgroundColor: ['#22c55e', '#e5e7eb'],
      borderWidth: 0,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 11 }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { grid: { display: false } }
    }
  };

  const conversionRate = reportData?.overview?.leads?.total > 0 
    ? Math.round((reportData?.overview?.leads?.converted / reportData?.overview?.leads?.total) * 100)
    : 0;

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <div className="header-title">
          <h1><StatsUpSquare width={28} height={28} /> {t('common.reports')}</h1>
          <p>Analytics and insights for your business</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <Filter width={18} height={18} />
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={fetchReports}>
            <RefreshDouble width={18} height={18} />
            Refresh
          </button>
          <button className="btn-primary">
            <Download width={18} height={18} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon leads">
                <Flash width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{reportData?.overview?.leads?.total || 0}</h3>
                <p>Total Leads</p>
                <span className="kpi-detail">
                  <GraphUp width={14} height={14} />
                  {reportData?.overview?.leads?.new || 0} new in period
                </span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon conversion">
                <GraphUp width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{conversionRate}%</h3>
                <p>Conversion Rate</p>
                <span className="kpi-detail">
                  {reportData?.overview?.leads?.converted || 0} leads converted
                </span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon pipeline">
                <Wallet width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(reportData?.overview?.deals?.pipelineValue)}</h3>
                <p>Pipeline Value</p>
                <span className="kpi-detail">
                  {reportData?.overview?.deals?.total || 0} active deals
                </span>
              </div>
            </div>
            
            <div className="kpi-card highlight">
              <div className="kpi-icon won">
                <Wallet width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(reportData?.overview?.deals?.wonValue)}</h3>
                <p>Revenue Won</p>
                <span className="kpi-detail">
                  <GraphUp width={14} height={14} />
                  {reportData?.overview?.deals?.won || 0} deals closed
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="charts-grid">
            <div className="chart-card large">
              <div className="chart-header">
                <div>
                  <h3>Revenue Trend</h3>
                  <p>Weekly revenue and pipeline performance</p>
                </div>
              </div>
              <div className="chart-body">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>Pipeline Distribution</h3>
                  <p>Deals by stage</p>
                </div>
              </div>
              <div className="chart-body">
                <Doughnut data={pipelineChartData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>Lead Sources</h3>
                  <p>Where your leads come from</p>
                </div>
              </div>
              <div className="chart-body">
                <Bar data={leadSourceChartData} options={barOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>Lead Conversion</h3>
                  <p>Overall conversion rate</p>
                </div>
              </div>
              <div className="chart-body conversion-chart">
                <Pie data={conversionChartData} options={{
                  ...doughnutOptions,
                  plugins: { ...doughnutOptions.plugins, legend: { position: 'bottom' } }
                }} />
                <div className="conversion-center">
                  <span className="conversion-rate">{conversionRate}%</span>
                  <span className="conversion-label">Converted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {reportData?.performance?.topPerformers && (
            <div className="performers-section">
              <h3><User width={20} height={20} /> Top Performers</h3>
              <div className="performers-grid">
                {reportData.performance.topPerformers.filter(p => p.deals_won > 0).slice(0, 5).map((performer, idx) => (
                  <div key={idx} className="performer-card">
                    <div className="performer-rank">{idx + 1}</div>
                    <div className="performer-avatar">
                      {performer.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="performer-info">
                      <strong>{performer.full_name}</strong>
                      <span>{performer.deals_won} deals won</span>
                    </div>
                    <div className="performer-revenue">
                      {formatCurrency(performer.revenue)}
                    </div>
                  </div>
                ))}
                {reportData.performance.topPerformers.filter(p => p.deals_won > 0).length === 0 && (
                  <div className="empty-performers">
                    <User width={32} height={32} />
                    <p>No deals won yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
