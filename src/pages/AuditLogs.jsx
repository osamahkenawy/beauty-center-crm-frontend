import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { History, Search, Filter, RefreshCw } from 'lucide-react';
import SEO from '../components/SEO';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  const entityTypes = ['lead', 'contact', 'account', 'deal', 'activity', 'workflow', 'pipeline'];
  const actionTypes = ['created', 'updated', 'deleted', 'viewed', 'exported', 'converted', 'assigned', 'status_changed'];

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (entityFilter) params.append('entity_type', entityFilter);
      if (actionFilter) params.append('action', actionFilter);
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);
      
      const res = await fetch(`${API_URL}/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action) => {
    const colors = {
      created: '#10b981', updated: '#3b82f6', deleted: '#ef4444', viewed: '#6b7280',
      exported: '#f2421b', converted: '#f59e0b', assigned: '#06b6d4', status_changed: '#ec4899'
    };
    return colors[action] || '#6b7280';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="crm-page">
      <SEO page="auditLogs" noindex={true} />
      <div className="page-header">
        <div className="header-left">
          <h1>Audit Logs</h1>
          <p className="subtitle">Track all system activities</p>
        </div>
        <button className="btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="filters-bar">
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="form-control filter-select">
          <option value="">All Entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="form-control filter-select">
          <option value="">All Actions</option>
          {actionTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <History size={64} />
          <h3>No audit logs found</h3>
          <p>Activity will be recorded as you use the CRM</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-nowrap">{formatDate(log.created_at)}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{log.user_name?.charAt(0)?.toUpperCase() || 'S'}</div>
                        <span>{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="action-badge" style={{ background: getActionColor(log.action) }}>
                        {log.action?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="entity-type">{log.entity_type}</span>
                      <span className="entity-id">#{log.entity_id}</span>
                    </td>
                    <td>
                      {log.changes && (
                        <code className="changes-code">
                          {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes).substring(0, 100)}
                        </code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">
              Showing {pagination.offset + 1} - {Math.min(pagination.offset + logs.length, pagination.total)} of {pagination.total}
            </span>
            <div className="pagination-buttons">
              <button
                disabled={pagination.offset === 0}
                onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              >
                Previous
              </button>
              <button
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 32px; height: 32px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; }
        .action-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; text-transform: capitalize; }
        .entity-type { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize; margin-right: 6px; }
        .entity-id { font-size: 12px; color: #6b7280; }
        .changes-code { font-size: 11px; background: #f8f9fb; padding: 4px 8px; border-radius: 4px; display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .text-nowrap { white-space: nowrap; }
        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 16px 0; }
        .pagination-info { font-size: 13px; color: #6b7280; }
        .pagination-buttons { display: flex; gap: 8px; }
        .pagination-buttons button { padding: 8px 16px; border: 2px solid #e5e7eb; background: white; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .pagination-buttons button:hover:not(:disabled) { border-color: #244066; color: #244066; }
        .pagination-buttons button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

