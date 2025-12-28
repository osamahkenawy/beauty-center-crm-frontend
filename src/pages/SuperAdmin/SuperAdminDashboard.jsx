import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building, User, Check, CheckCircle, Clock,
  Xmark, Plus, Eye, ArrowRight
} from 'iconoir-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
import './SuperAdmin.css';

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [recentTenants, setRecentTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${API_BASE_URL}/super-admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentTenants(data.recentTenants);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="sa-loading-page">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="sa-dashboard">
      <div className="sa-page-header">
        <div>
          <h1>Platform Dashboard</h1>
          <p>Overview of Trasealla CRM platform</p>
        </div>
        <Link to="/super-admin/tenants" className="sa-primary-btn">
          <Plus size={18} />
          <span>New Tenant</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-icon primary">
            <Building size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{stats?.total_tenants || 0}</h3>
            <p>Total Tenants</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{stats?.active_tenants || 0}</h3>
            <p>Active Tenants</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon warning">
            <Clock size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{stats?.trial_tenants || 0}</h3>
            <p>Trial Tenants</p>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon info">
            <User size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{stats?.total_users || 0}</h3>
            <p>Total Users</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="sa-dashboard-row">
        <div className="sa-card large">
          <div className="sa-card-header">
            <h2>Platform Overview</h2>
            <Link to="/super-admin/analytics" className="sa-link">
              View Analytics <ArrowRight size={16} />
            </Link>
          </div>
          <div className="sa-overview-grid">
            <div className="sa-overview-item">
              <div className="sa-overview-label">Monthly Recurring Revenue</div>
              <div className="sa-overview-value">
                <Check size={20} className="success" />
                <span>AED 0</span>
              </div>
            </div>
            <div className="sa-overview-item">
              <div className="sa-overview-label">Active Subscriptions</div>
              <div className="sa-overview-value">
                <CheckCircle size={20} className="success" />
                <span>{stats?.active_tenants || 0}</span>
              </div>
            </div>
            <div className="sa-overview-item">
              <div className="sa-overview-label">Suspended Accounts</div>
              <div className="sa-overview-value">
                <Xmark size={20} className="warning" />
                <span>{stats?.suspended_tenants || 0}</span>
              </div>
            </div>
            <div className="sa-overview-item">
              <div className="sa-overview-label">Trial Conversions</div>
              <div className="sa-overview-value">
                <Check size={20} className="primary" />
                <span>0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tenants */}
      <div className="sa-card">
        <div className="sa-card-header">
          <h2>Recent Tenants</h2>
          <Link to="/super-admin/tenants" className="sa-link">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sa-empty-row">
                    No tenants found
                  </td>
                </tr>
              ) : (
                recentTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div className="sa-tenant-name">
                        <div className="sa-tenant-avatar">
                          {tenant.name?.charAt(0)}
                        </div>
                        <span>{tenant.name}</span>
                      </div>
                    </td>
                    <td>{tenant.industry || '-'}</td>
                    <td>{tenant.email || '-'}</td>
                    <td>
                      <span className={`sa-status-badge ${getStatusColor(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/super-admin/tenants/${tenant.id}`} className="sa-action-btn">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

