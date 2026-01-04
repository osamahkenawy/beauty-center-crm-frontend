import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Flash, Wallet, Building, Trophy, Plus, Calendar, User,
  Activity, GraphUp, ArrowRight, Megaphone, Phone, Clock, 
  StatUp, Circle, Check, WarningTriangle
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import SEO from '../components/SEO';
import './Dashboard.css';

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetchStats();
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/stats');
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Smart greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return t('dashboard.goodMorning');
    if (hour >= 12 && hour < 17) return t('dashboard.goodAfternoon');
    if (hour >= 17 && hour < 21) return t('dashboard.goodEvening');
    return t('dashboard.goodNight');
  };

  const formatCurrency = (value) => {
    const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatTime = () => {
    const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
    return currentTime.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = () => {
    const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
    return currentTime.toLocaleDateString(locale, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate conversion rate
  const conversionRate = useMemo(() => {
    if (!stats?.leads?.total || stats.leads.total === 0) return 0;
    return ((stats.leads.converted || 0) / stats.leads.total * 100).toFixed(1);
  }, [stats]);

  // Calculate win rate
  const winRate = useMemo(() => {
    const total = (stats?.deals?.won || 0) + (stats?.deals?.lost || 0);
    if (total === 0) return 0;
    return ((stats.deals.won / total) * 100).toFixed(1);
  }, [stats]);

  // Get monthly revenue data from stats or use zeros
  const getMonthlyRevenue = () => {
    if (stats?.monthlyRevenue && stats.monthlyRevenue.length > 0) {
      return stats.monthlyRevenue;
    }
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  };

  // Translate pipeline stage names
  const translateStageName = (stageName) => {
    const stageKey = stageName.toLowerCase().replace(/\s+/g, '');
    const translationKey = `pipelineStages.${stageKey}`;
    const translated = t(translationKey);
    // If translation exists and is different from key, return it; otherwise return original
    return translated !== translationKey ? translated : stageName;
  };

  // Chart configurations
  const monthLabels = i18n.language === 'ar' 
    ? [t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'), t('months.may'), t('months.jun'),
       t('months.jul'), t('months.aug'), t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')]
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const salesChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: t('common.revenue'),
        data: getMonthlyRevenue(),
        borderColor: '#244066',
        backgroundColor: 'rgba(36, 64, 102, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#244066',
      }
    ]
  };

  const chartFontFamily = i18n.language === 'ar' 
    ? "'Cairo', 'Tajawal', 'Noto Sans Arabic', sans-serif"
    : "'Inter', sans-serif";

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12, family: chartFontFamily }
        }
      },
      tooltip: {
        backgroundColor: '#244066',
        titleFont: { size: 13, family: chartFontFamily },
        bodyFont: { size: 12, family: chartFontFamily },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (value) => formatCurrency(value),
          font: { size: 11, family: chartFontFamily }
        }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: chartFontFamily } }
      }
    }
  };

  // Pipeline chart
  const getPipelineData = () => {
    if (stats?.pipelineStages && stats.pipelineStages.length > 0) {
      const activeStages = stats.pipelineStages.filter(s => s.deal_count > 0);
      if (activeStages.length > 0) {
        return {
          labels: activeStages.map(s => translateStageName(s.name)),
          data: activeStages.map(s => s.deal_count || 0),
          colors: activeStages.map(s => s.color || '#6b7280')
        };
      }
    }
    return { labels: [], data: [], colors: [] };
  };

  const pipelineInfo = getPipelineData();

  const pipelineChartData = {
    labels: pipelineInfo.labels,
    datasets: [{
      data: pipelineInfo.data,
      backgroundColor: pipelineInfo.colors,
      borderWidth: 0,
    }]
  };

  const pipelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: i18n.language === 'ar' ? 'left' : 'right',
        labels: {
          usePointStyle: true,
          padding: 12,
          font: { size: 11, family: chartFontFamily }
        }
      }
    }
  };

  // Lead sources chart
  const getLeadSourceData = () => {
    if (stats?.leadSources && Object.keys(stats.leadSources).length > 0) {
      const sources = stats.leadSources;
      return {
        labels: Object.keys(sources).map(s => {
          // Try to translate common source names
          const sourceKey = s.toLowerCase().replace(/\s+/g, '');
          const translationKey = `leadSources.${sourceKey}`;
          const translated = t(translationKey);
          return translated !== translationKey ? translated : (s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '));
        }),
        data: Object.values(sources)
      };
    }
    return { labels: [], data: [] };
  };

  const leadSourceInfo = getLeadSourceData();

  const leadSourceData = {
    labels: leadSourceInfo.labels.length > 0 ? leadSourceInfo.labels : [t('common.noData')],
    datasets: [{
      label: t('leads.title'),
      data: leadSourceInfo.data.length > 0 ? leadSourceInfo.data : [0],
      backgroundColor: [
        'rgba(36, 64, 102, 0.9)',
        'rgba(242, 66, 27, 0.9)',
        'rgba(59, 130, 246, 0.9)',
        'rgba(139, 92, 246, 0.9)',
        'rgba(34, 197, 94, 0.9)',
        'rgba(245, 158, 11, 0.9)'
      ],
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const leadSourceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 11, family: chartFontFamily } }
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11, family: chartFontFamily } }
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="loader-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <SEO page="dashboard" noindex={true} />
      {/* Smart Welcome Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <div className="greeting-time">
            <Clock width={16} height={16} />
            <span>{formatTime()}</span>
            <span className="date-divider">•</span>
            <span>{formatDate()}</span>
          </div>
          <h1>{getGreeting()}, {user?.full_name || user?.username}</h1>
          <p className="welcome-subtitle">{t('dashboard.salesPerformanceOverview')}</p>
        </div>
        <div className="header-actions">
          <Link to="/leads" className="btn-primary">
            <Plus width={18} height={18} />
            {t('dashboard.newLead')}
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card primary">
          <div className="metric-icon">
            <Flash width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats?.leads?.total ?? 0}</span>
            <span className="metric-label">{t('leads.totalLeads')}</span>
          </div>
          <div className="metric-trend positive">
            <StatUp width={14} height={14} />
            <span>{t('dashboard.thisWeek', { count: stats?.leads?.new ?? 0 })}</span>
          </div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-icon">
            <Wallet width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats?.deals?.open ?? 0}</span>
            <span className="metric-label">{t('deals.openDeals')}</span>
          </div>
          <div className="metric-amount">
            {formatCurrency(stats?.deals?.pipelineValue ?? 0)}
          </div>
        </div>

        <div className="metric-card tertiary">
          <div className="metric-icon">
            <Circle width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{conversionRate}%</span>
            <span className="metric-label">{t('dashboard.conversionRate')}</span>
          </div>
          <div className="metric-progress">
            <div className="progress-bar" style={{ width: `${conversionRate}%` }}></div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">
            <Trophy width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{formatCurrency(stats?.deals?.wonValue ?? 0)}</span>
            <span className="metric-label">{t('deals.wonRevenue')}</span>
          </div>
          <div className="metric-badge">
            <Check width={14} height={14} />
            <span>{stats?.deals?.won ?? 0} {t('dashboard.closed')}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="quick-stat">
          <Building width={18} height={18} />
          <span className="stat-number">{stats?.accounts?.total ?? 0}</span>
          <span className="stat-label">{t('dashboard.accounts')}</span>
        </div>
        <div className="quick-stat">
          <User width={18} height={18} />
          <span className="stat-number">{stats?.contacts?.total ?? 0}</span>
          <span className="stat-label">{t('dashboard.contacts')}</span>
        </div>
        <div className="quick-stat warning">
          <WarningTriangle width={18} height={18} />
          <span className="stat-number">{stats?.activities?.overdue ?? 0}</span>
          <span className="stat-label">{t('dashboard.overdue')}</span>
        </div>
        <div className="quick-stat info">
          <Calendar width={18} height={18} />
          <span className="stat-number">{stats?.activities?.today ?? 0}</span>
          <span className="stat-label">{t('dashboard.dueToday')}</span>
        </div>
        <div className="quick-stat">
          <Activity width={18} height={18} />
          <span className="stat-number">{stats?.activities?.upcoming ?? 0}</span>
          <span className="stat-label">{t('dashboard.upcoming')}</span>
        </div>
        <div className="quick-stat success">
          <Trophy width={18} height={18} />
          <span className="stat-number">{winRate}%</span>
          <span className="stat-label">{t('dashboard.winRate')}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card sales-chart">
          <div className="chart-header">
            <div>
              <h3>{t('dashboard.salesOverview')}</h3>
              <p>{t('dashboard.monthlyRevenuePerformance')}</p>
            </div>
            <select className="chart-filter">
              <option value="year">{t('dashboard.thisYear')}</option>
              <option value="6months">{t('dashboard.lastSixMonths')}</option>
              <option value="quarter">{t('dashboard.thisQuarter')}</option>
            </select>
          </div>
          <div className="chart-body">
            <Line data={salesChartData} options={salesChartOptions} />
          </div>
        </div>

        <div className="chart-card pipeline-chart">
          <div className="chart-header">
            <div>
              <h3>{t('dashboard.salesPipeline')}</h3>
            </div>
          </div>
          <div className="chart-body">
            {pipelineInfo.data.length > 0 ? (
              <Doughnut data={pipelineChartData} options={pipelineChartOptions} />
            ) : (
              <div className="empty-chart">
                <Wallet width={48} height={48} />
                <p>{t('dashboard.noDealsInPipeline')}</p>
                <Link to="/deals" className="btn-secondary-sm">{t('dashboard.createDeal')}</Link>
              </div>
            )}
          </div>
          <div className="pipeline-total">
            <span className="total-label">{t('dashboard.totalDeals')}</span>
            <span className="total-value">{stats?.deals?.total ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="dashboard-row">
        <div className="chart-card lead-sources">
          <div className="chart-header">
            <div>
              <h3>{t('dashboard.leadSources')}</h3>
              <p>{t('dashboard.leadSourcesDescription')}</p>
            </div>
          </div>
          <div className="chart-body">
            {leadSourceInfo.data.length > 0 ? (
              <Bar data={leadSourceData} options={leadSourceOptions} />
            ) : (
              <div className="empty-chart">
                <Flash width={48} height={48} />
                <p>{t('dashboard.noLeadsYet')}</p>
                <Link to="/leads" className="btn-secondary-sm">{t('dashboard.createLead')}</Link>
              </div>
            )}
          </div>
        </div>

        <div className="activity-card">
          <div className="card-header">
            <h3>
              <Activity width={20} height={20} />
              {t('dashboard.activitySummary')}
            </h3>
            <Link to="/activities" className="view-all">
              {t('dashboard.viewAll')} <ArrowRight width={16} height={16} />
            </Link>
          </div>
          <div className="activity-grid">
            <div className="activity-item overdue">
              <div className="activity-icon">
                <WarningTriangle width={20} height={20} />
              </div>
              <div className="activity-info">
                <span className="activity-count">{stats?.activities?.overdue ?? 0}</span>
                <span className="activity-label">{t('activities.overdue')}</span>
              </div>
            </div>
            <div className="activity-item today">
              <div className="activity-icon">
                <Clock width={20} height={20} />
              </div>
              <div className="activity-info">
                <span className="activity-count">{stats?.activities?.today ?? 0}</span>
                <span className="activity-label">{t('activities.dueToday')}</span>
              </div>
            </div>
            <div className="activity-item upcoming">
              <div className="activity-icon">
                <Calendar width={20} height={20} />
              </div>
              <div className="activity-info">
                <span className="activity-count">{stats?.activities?.upcoming ?? 0}</span>
                <span className="activity-label">{t('activities.upcoming')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>{t('dashboard.quickActions')}</h3>
        <div className="quick-actions-grid">
          <Link to="/leads" className="quick-action-card">
            <div className="quick-action-icon"><Flash width={24} height={24} /></div>
            <span>{t('dashboard.newLead')}</span>
          </Link>
          <Link to="/deals" className="quick-action-card">
            <div className="quick-action-icon"><Wallet width={24} height={24} /></div>
            <span>{t('dashboard.newDeal')}</span>
          </Link>
          <Link to="/activities" className="quick-action-card">
            <div className="quick-action-icon"><Calendar width={24} height={24} /></div>
            <span>{t('dashboard.newActivity')}</span>
          </Link>
          <Link to="/contacts" className="quick-action-card">
            <div className="quick-action-icon"><User width={24} height={24} /></div>
            <span>{t('dashboard.newContact')}</span>
          </Link>
          <Link to="/campaigns" className="quick-action-card">
            <div className="quick-action-icon"><Megaphone width={24} height={24} /></div>
            <span>{t('dashboard.campaign')}</span>
          </Link>
          <Link to="/inbox" className="quick-action-card">
            <div className="quick-action-icon"><Phone width={24} height={24} /></div>
            <span>{t('dashboard.inbox')}</span>
          </Link>
        </div>
      </div>

      {/* Recent Data */}
      <div className="recent-data-row">
        <div className="recent-card">
          <div className="card-header">
            <h3><Flash width={20} height={20} /> {t('dashboard.recentLeads')}</h3>
            <Link to="/leads" className="view-all">
              {t('dashboard.viewAll')} <ArrowRight width={16} height={16} />
            </Link>
          </div>
          <div className="card-body">
            {stats?.recentLeads?.length > 0 ? (
              <div className="recent-list">
                {stats.recentLeads.map((lead) => (
                  <div key={lead.id} className="recent-item">
                    <div className="recent-avatar">
                      {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                    </div>
                    <div className="recent-info">
                      <strong>{lead.first_name} {lead.last_name}</strong>
                      <span>{lead.company || t('dashboard.noCompany')}</span>
                    </div>
                    <span className={`status-badge ${lead.status}`}>{lead.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-mini">
                <Flash width={32} height={32} />
                <p>{t('dashboard.noLeadsYet')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="recent-card">
          <div className="card-header">
            <h3><Wallet width={20} height={20} /> {t('dashboard.recentDeals')}</h3>
            <Link to="/deals" className="view-all">
              {t('dashboard.viewAll')} <ArrowRight width={16} height={16} />
            </Link>
          </div>
          <div className="card-body">
            {stats?.recentDeals?.length > 0 ? (
              <div className="recent-list">
                {stats.recentDeals.map((deal) => (
                  <div key={deal.id} className="recent-item">
                    <div className="recent-deal-icon" style={{ background: deal.stage_color || '#244066' }}>
                      <Wallet width={16} height={16} color="#fff" />
                    </div>
                    <div className="recent-info">
                      <strong>{deal.name}</strong>
                      <span>{deal.stage_name || 'No stage'}</span>
                    </div>
                    <div className="recent-amount">
                      {formatCurrency(deal.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-mini">
                <Wallet width={32} height={32} />
                <p>{t('dashboard.noDealsYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
