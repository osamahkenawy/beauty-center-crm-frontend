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
import SEO from '../components/SEO';
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
  const { t, i18n } = useTranslation();

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
    const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-AE';
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: 'AED', 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  // Chart Data
  const revenueChartData = {
    labels: [
      t('reports.week1', { defaultValue: 'Week 1' }),
      t('reports.week2', { defaultValue: 'Week 2' }),
      t('reports.week3', { defaultValue: 'Week 3' }),
      t('reports.week4', { defaultValue: 'Week 4' })
    ],
    datasets: [
      {
        label: t('reports.revenue'),
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
        label: t('reports.pipeline'),
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

  const translateStageName = (stageName) => {
    if (!stageName) return '';
    const stageKey = `pipelineStages.${stageName.toLowerCase().replace(/\s+/g, '')}`;
    return t(stageKey, { defaultValue: stageName });
  };

  const pipelineChartData = {
    labels: reportData?.sales?.byStage?.map(s => translateStageName(s.name)) || [t('pipelineStages.stage1', { defaultValue: 'Stage 1' }), t('pipelineStages.stage2', { defaultValue: 'Stage 2' }), t('pipelineStages.stage3', { defaultValue: 'Stage 3' })],
    datasets: [{
      data: reportData?.sales?.byStage?.map(s => s.count) || [5, 8, 3],
      backgroundColor: reportData?.sales?.byStage?.map(s => s.color) || ['#3b82f6', '#8b5cf6', '#f59e0b'],
      borderWidth: 0,
    }]
  };

  const leadSourceChartData = {
    labels: reportData?.leads?.bySource?.map(s => {
      const sourceKey = `leadSources.${(s.source || 'Unknown').toLowerCase().replace(/\s+/g, '')}`;
      return t(sourceKey, { defaultValue: s.source || 'Unknown' });
    }) || [t('leadSources.website', { defaultValue: 'Website' }), t('leadSources.referral', { defaultValue: 'Referral' }), t('leadSources.other', { defaultValue: 'Other' })],
    datasets: [{
      label: t('dashboard.totalLeads'),
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
    labels: [t('reports.converted'), t('reports.notConverted')],
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
          font: { 
            size: 12,
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
      },
      tooltip: {
        titleFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: {
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: {
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
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
          font: { 
            size: 11,
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
      },
      tooltip: {
        titleFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        titleFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
        }
      }
    },
    scales: {
      x: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: {
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
      },
      y: { 
        grid: { display: false },
        ticks: {
          font: {
            family: i18n.language === 'ar' ? 'Cairo, Arial, sans-serif' : 'Inter, system-ui, sans-serif'
          }
        }
      }
    }
  };

  const conversionRate = reportData?.overview?.leads?.total > 0 
    ? Math.round((reportData?.overview?.leads?.converted / reportData?.overview?.leads?.total) * 100)
    : 0;

  return (
    <div className="reports-page">
      <SEO page="reports" noindex={true} />
      {/* Header */}
      <div className="reports-header">
        <div className="header-title">
          <h1><StatsUpSquare width={28} height={28} /> {t('common.reports')}</h1>
          <p>{t('reports.subtitle')}</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <Filter width={18} height={18} />
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="7">{t('reports.last7Days')}</option>
              <option value="30">{t('reports.last30Days')}</option>
              <option value="90">{t('reports.last90Days')}</option>
              <option value="365">{t('reports.lastYear')}</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={fetchReports}>
            <RefreshDouble width={18} height={18} />
            {t('reports.refresh')}
          </button>
          <button className="btn-primary">
            <Download width={18} height={18} />
            {t('reports.export')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="loader-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
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
                <p>{t('reports.totalLeads')}</p>
                <span className="kpi-detail">
                  <GraphUp width={14} height={14} />
                  {reportData?.overview?.leads?.new || 0} {t('reports.newInPeriod')}
                </span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon conversion">
                <GraphUp width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{conversionRate}%</h3>
                <p>{t('reports.conversionRate')}</p>
                <span className="kpi-detail">
                  {reportData?.overview?.leads?.converted || 0} {t('reports.leadsConverted')}
                </span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon pipeline">
                <Wallet width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(reportData?.overview?.deals?.pipelineValue)}</h3>
                <p>{t('reports.pipelineValue')}</p>
                <span className="kpi-detail">
                  {reportData?.overview?.deals?.total || 0} {t('reports.activeDeals')}
                </span>
              </div>
            </div>
            
            <div className="kpi-card highlight">
              <div className="kpi-icon won">
                <Wallet width={24} height={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(reportData?.overview?.deals?.wonValue)}</h3>
                <p>{t('reports.revenueWon')}</p>
                <span className="kpi-detail">
                  <GraphUp width={14} height={14} />
                  {reportData?.overview?.deals?.won || 0} {t('reports.dealsClosed')}
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="charts-grid">
            <div className="chart-card large">
              <div className="chart-header">
                <div>
                  <h3>{t('reports.revenueTrend')}</h3>
                  <p>{t('reports.weeklyRevenuePerformance')}</p>
                </div>
              </div>
              <div className="chart-body">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>{t('reports.pipelineDistribution')}</h3>
                  <p>{t('reports.dealsByStage')}</p>
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
                  <h3>{t('reports.leadSources')}</h3>
                  <p>{t('reports.whereLeadsComeFrom')}</p>
                </div>
              </div>
              <div className="chart-body">
                <Bar data={leadSourceChartData} options={barOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>{t('reports.leadConversion')}</h3>
                  <p>{t('reports.overallConversionRate')}</p>
                </div>
              </div>
              <div className="chart-body conversion-chart">
                <Pie data={conversionChartData} options={{
                  ...doughnutOptions,
                  plugins: { ...doughnutOptions.plugins, legend: { position: 'bottom' } }
                }} />
                <div className="conversion-center">
                  <span className="conversion-rate">{conversionRate}%</span>
                  <span className="conversion-label">{t('reports.converted')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {reportData?.performance?.topPerformers && (
            <div className="performers-section">
              <h3><User width={20} height={20} /> {t('reports.topPerformers')}</h3>
              <div className="performers-grid">
                {reportData.performance.topPerformers.filter(p => p.deals_won > 0).slice(0, 5).map((performer, idx) => (
                  <div key={idx} className="performer-card">
                    <div className="performer-rank">{idx + 1}</div>
                    <div className="performer-avatar">
                      {performer.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="performer-info">
                      <strong>{performer.full_name}</strong>
                      <span>{performer.deals_won} {t('reports.dealsWon')}</span>
                    </div>
                    <div className="performer-revenue">
                      {formatCurrency(performer.revenue)}
                    </div>
                  </div>
                ))}
                {reportData.performance.topPerformers.filter(p => p.deals_won > 0).length === 0 && (
                  <div className="empty-performers">
                    <User width={32} height={32} />
                    <p>{t('reports.noDealsWonYet')}</p>
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
