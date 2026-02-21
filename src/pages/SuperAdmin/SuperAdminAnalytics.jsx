import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building, StatsReport, DollarCircle, User, ArrowUpRight,
  Calendar, Refresh, Eye
} from 'iconoir-react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const PLAN_COLORS = {
  trial: '#f59e0b',
  starter: '#3b82f6',
  professional: '#8b5cf6',
  enterprise: '#d97706',
};
const PLAN_LABELS = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const SuperAdminAnalytics = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantRevenues, setTenantRevenues] = useState({});
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTenants()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`${API_BASE_URL}/super-admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
        // Fetch revenue for each tenant
        setRevenueLoading(true);
        const revenues = {};
        await Promise.all(
          (data.tenants || []).map(async (t) => {
            try {
              const r = await fetch(`${API_BASE_URL}/super-admin/tenants/${t.id}/revenue`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (r.ok) {
                const d = await r.json();
                revenues[t.id] = d.revenue || {};
              }
            } catch {}
          })
        );
        setTenantRevenues(revenues);
        setRevenueLoading(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  // Aggregate plan distribution
  const planDist = tenants.reduce((acc, t) => {
    const p = t.plan || 'trial';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const totalPlatformRevenue = Object.values(tenantRevenues).reduce(
    (s, r) => s + Number(r.total_revenue || 0),
    0
  );
  const thisMonthRevenue = Object.values(tenantRevenues).reduce(
    (s, r) => s + Number(r.this_month || 0),
    0
  );

  if (loading) {
    return (
      <div className="sa-loading-page">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="sa-analytics">
      <SEO page="superAdminAnalytics" noindex={true} />
      <div className="sa-page-header">
        <div>
          <h1>Platform Analytics</h1>
          <p>Revenue and usage insights across all tenants</p>
        </div>
        <button className="sa-primary-btn" onClick={loadAll}>
          <Refresh size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top stat cards */}
      <div className="sa-stats-grid four-col">
        <div className="sa-stat-card">
          <div className="sa-stat-icon success">
            <DollarCircle size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{fmt(totalPlatformRevenue)}</h3>
            <p>Total Platform Revenue</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon primary">
            <ArrowUpRight size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{fmt(thisMonthRevenue)}</h3>
            <p>This Month Revenue</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon warning">
            <DollarCircle size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{fmt(stats?.monthly_recurring_revenue || 0)}</h3>
            <p>Monthly Recurring Revenue</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon info">
            <Building size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{stats?.total_tenants || 0}</h3>
            <p>Total Tenants</p>
          </div>
        </div>
      </div>

      {/* Plan distribution + Tenant revenue table */}
      <div className="sa-analytics-row">
        {/* Plan breakdown */}
        <div className="sa-card medium">
          <div className="sa-card-header">
            <h2>Plan Distribution</h2>
          </div>
          <div className="sa-plan-dist">
            {Object.entries(PLAN_LABELS).map(([key, label]) => {
              const count = planDist[key] || 0;
              const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
              return (
                <div key={key} className="sa-plan-bar-item">
                  <div className="sa-plan-bar-label">
                    <span
                      className="sa-plan-dot"
                      style={{ background: PLAN_COLORS[key] }}
                    ></span>
                    <span>{label}</span>
                    <span className="sa-plan-count">{count}</span>
                  </div>
                  <div className="sa-plan-bar-track">
                    <div
                      className="sa-plan-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: PLAN_COLORS[key],
                      }}
                    ></div>
                  </div>
                  <span className="sa-plan-pct">{pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="sa-plan-summary">
            <div className="sa-plan-total">
              <User size={16} />
              <span>{stats?.total_users || 0} total platform users</span>
            </div>
            <div className="sa-plan-total">
              <Calendar size={16} />
              <span>{stats?.total_invoices || 0} paid invoices processed</span>
            </div>
          </div>
        </div>

        {/* Revenue by tenant */}
        <div className="sa-card large">
          <div className="sa-card-header">
            <h2>Revenue by Tenant</h2>
            {revenueLoading && <span className="sa-small-spinner"></span>}
          </div>
          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>This Month</th>
                  <th>Total Revenue</th>
                  <th>Invoices</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="sa-empty-row">No tenants found</td>
                  </tr>
                ) : (
                  [...tenants]
                    .sort((a, b) => {
                      const ra = Number(tenantRevenues[a.id]?.total_revenue || 0);
                      const rb = Number(tenantRevenues[b.id]?.total_revenue || 0);
                      return rb - ra;
                    })
                    .map((tenant) => {
                      const rev = tenantRevenues[tenant.id] || {};
                      return (
                        <tr key={tenant.id}>
                          <td>
                            <div className="sa-tenant-name">
                              <div className="sa-tenant-avatar">
                                {tenant.name?.charAt(0)}
                              </div>
                              <div>
                                <span className="sa-tenant-company">{tenant.name}</span>
                                <span className="sa-tenant-email">{tenant.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className="sa-plan-badge"
                              style={{
                                background: `${PLAN_COLORS[tenant.plan || 'trial']}22`,
                                color: PLAN_COLORS[tenant.plan || 'trial'],
                                border: `1px solid ${PLAN_COLORS[tenant.plan || 'trial']}44`,
                              }}
                            >
                              {PLAN_LABELS[tenant.plan || 'trial']}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`sa-status-badge ${
                                tenant.status === 'active'
                                  ? 'success'
                                  : tenant.status === 'trial'
                                  ? 'warning'
                                  : 'danger'
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </td>
                          <td>{fmt(rev.this_month)}</td>
                          <td>
                            <strong>{fmt(rev.total_revenue)}</strong>
                          </td>
                          <td>{rev.paid_invoices || 0} paid</td>
                          <td>
                            <Link
                              to={`/super-admin/tenants/${tenant.id}`}
                              className="sa-action-btn"
                              title="View Tenant"
                            >
                              <Eye size={16} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;
