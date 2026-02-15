import { useState, useEffect, useCallback } from 'react';
import {
  User, Search, Plus, EditPencil, Eye, Xmark, Check, WarningTriangle,
  Calendar, Star, Heart, Phone, Mail, Clock
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import './CRMPages.css';
import './BeautyPages.css';

export default function BeautyClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ total: 0, active: 0, vip: 0, newThisMonth: 0 });
  const [clientDetail, setClientDetail] = useState(null);
  const [appointments, setAppointments] = useState([]);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/contacts?limit=500');
      if (data.success) {
        let list = data.data || [];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        if (search) {
          const s = search.toLowerCase();
          list = list.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(s) ||
            (c.email || '').toLowerCase().includes(s) ||
            (c.phone || '').toLowerCase().includes(s)
          );
        }
        if (filterTier) {
          list = list.filter(c => (c.loyalty_tier || 'none') === filterTier);
        }

        setClients(list);
        const all = data.data || [];
        setStats({
          total: all.length,
          active: all.filter(c => c.status === 'active').length,
          vip: all.filter(c => c.loyalty_tier === 'gold' || c.loyalty_tier === 'platinum').length,
          newThisMonth: all.filter(c => new Date(c.created_at) >= monthStart).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterTier]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openClientDetail = async (client) => {
    setSelectedClient(client);
    setClientDetail(null);
    setAppointments([]);
    setShowModal(true);
    try {
      const [detailRes, apptRes] = await Promise.all([
        api.get(`/contacts/${client.id}`),
        api.get(`/appointments?customer_id=${client.id}&limit=20`),
      ]);
      if (detailRes.success) setClientDetail(detailRes.data);
      if (apptRes.success) setAppointments(apptRes.data || []);
    } catch (error) {
      console.error('Failed to fetch client detail:', error);
    }
  };

  const getVisitFrequency = (appts) => {
    if (!appts || appts.length < 2) return 'N/A';
    const dates = appts.map(a => new Date(a.appointment_date)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    const avg = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
    if (avg <= 7) return 'Weekly';
    if (avg <= 14) return 'Bi-weekly';
    if (avg <= 30) return 'Monthly';
    return `Every ~${avg} days`;
  };

  const getTierBadge = (tier) => {
    const map = {
      bronze: { label: 'Bronze', color: '#CD7F32', bg: '#FFF3E0' },
      silver: { label: 'Silver', color: '#9E9E9E', bg: '#F5F5F5' },
      gold: { label: 'Gold', color: '#FFC107', bg: '#FFFDE7' },
      platinum: { label: 'Platinum', color: '#607D8B', bg: '#ECEFF1' },
    };
    const info = map[tier] || { label: 'Standard', color: '#999', bg: '#f5f5f5' };
    return <span className="tier-badge" style={{ background: info.bg, color: info.color }}>{info.label}</span>;
  };

  const statusBadge = (status) => {
    const colors = {
      confirmed: '#28c76f', completed: '#28c76f', pending: '#ff9f43',
      cancelled: '#ea5455', no_show: '#ea5455',
    };
    return (
      <span className="status-badge" style={{ color: colors[status] || '#999', background: (colors[status] || '#999') + '15' }}>
        {status?.replace('_', ' ') || 'N/A'}
      </span>
    );
  };

  return (
    <div className="crm-page">
      <SEO page="beauty-clients" />

      {toast.show && (
        <div className={`crm-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check /> : <WarningTriangle />}
          {toast.message}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>
            <User width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Clients</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>
            <Check width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FCE4EC', color: '#E91E63' }}>
            <Heart width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.vip}</div>
            <div className="stat-label">VIP Members</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>
            <Plus width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.newThisMonth}</div>
            <div className="stat-label">New This Month</div>
          </div>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <Search className="search-icon" width={16} height={16} />
              <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
              <option value="">All Tiers</option>
              <option value="bronze">🥉 Bronze</option>
              <option value="silver">🥈 Silver</option>
              <option value="gold">🥇 Gold</option>
              <option value="platinum">💎 Platinum</option>
            </select>
          </div>
        </div>

        <div className="crm-table-wrapper">
          {loading ? (
            <div className="crm-loading"><div className="loading-spinner"></div><p>Loading clients...</p></div>
          ) : clients.length === 0 ? (
            <div className="crm-empty">
              <User width={48} height={48} />
              <h3>No beauty clients found</h3>
              <p>Add contacts to the CRM to see them here.</p>
            </div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar beauty-avatar">{client.first_name?.charAt(0)}{client.last_name?.charAt(0)}</div>
                        <div>
                          <div className="cell-main">{client.first_name} {client.last_name}</div>
                          <div className="cell-sub">Since {new Date(client.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {client.phone ? (
                        <div className="contact-info-cell"><Phone width={14} height={14} /> {client.phone}</div>
                      ) : <span className="cell-sub">—</span>}
                    </td>
                    <td>
                      {client.email ? (
                        <div className="contact-info-cell"><Mail width={14} height={14} /> {client.email}</div>
                      ) : <span className="cell-sub">—</span>}
                    </td>
                    <td>{getTierBadge(client.loyalty_tier)}</td>
                    <td>
                      <span className={`status-badge ${client.status || 'active'}`}>{client.status || 'Active'}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn primary" onClick={() => openClientDetail(client)} title="View Profile">
                          <Eye width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Client Detail Modal */}
      {showModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Client Profile</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <div className="modal-body beauty-client-profile">
              {/* Profile Header */}
              <div className="profile-header-card">
                <div className="profile-avatar-lg">{selectedClient.first_name?.charAt(0)}{selectedClient.last_name?.charAt(0)}</div>
                <div className="profile-info">
                  <h3>{selectedClient.first_name} {selectedClient.last_name}</h3>
                  <div className="profile-meta">
                    {selectedClient.email && <span><Mail width={14} height={14} /> {selectedClient.email}</span>}
                    {selectedClient.phone && <span><Phone width={14} height={14} /> {selectedClient.phone}</span>}
                  </div>
                  {getTierBadge(selectedClient.loyalty_tier)}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="profile-stats-row">
                <div className="profile-stat">
                  <Calendar width={20} height={20} />
                  <div>
                    <strong>{appointments.length}</strong>
                    <span>Appointments</span>
                  </div>
                </div>
                <div className="profile-stat">
                  <Check width={20} height={20} />
                  <div>
                    <strong>{appointments.filter(a => a.status === 'completed').length}</strong>
                    <span>Completed</span>
                  </div>
                </div>
                <div className="profile-stat">
                  <Clock width={20} height={20} />
                  <div>
                    <strong>{getVisitFrequency(appointments)}</strong>
                    <span>Visit Frequency</span>
                  </div>
                </div>
                <div className="profile-stat">
                  <Star width={20} height={20} />
                  <div>
                    <strong>{selectedClient.loyalty_points || 0}</strong>
                    <span>Points</span>
                  </div>
                </div>
              </div>

              {/* Appointment History */}
              <div className="profile-section">
                <h4>Appointment History</h4>
                {appointments.length === 0 ? (
                  <div className="no-data-msg">No appointments found for this client.</div>
                ) : (
                  <div className="mini-table-wrapper">
                    <table className="crm-table mini-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Service</th>
                          <th>Staff</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(appt => (
                          <tr key={appt.id}>
                            <td>{new Date(appt.appointment_date).toLocaleDateString()} {appt.start_time?.slice(0, 5)}</td>
                            <td>{appt.service_name || 'N/A'}</td>
                            <td>{appt.staff_name || 'N/A'}</td>
                            <td>{statusBadge(appt.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Preferences */}
              {clientDetail && (
                <div className="profile-section">
                  <h4>Client Notes & Preferences</h4>
                  <div className="preferences-grid">
                    {clientDetail.notes ? (
                      <div className="pref-card">
                        <strong>Notes</strong>
                        <p>{clientDetail.notes}</p>
                      </div>
                    ) : (
                      <div className="no-data-msg">No notes recorded yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
