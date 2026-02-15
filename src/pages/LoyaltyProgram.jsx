import { useState, useEffect, useCallback } from 'react';
import {
  Star, Search, Plus, EditPencil, Check, Xmark, WarningTriangle,
  User, Trophy, Medal, ArrowUp, ArrowDown
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import './CRMPages.css';
import './BeautyPages.css';

const TIER_MAP = {
  bronze: { label: 'Bronze', color: '#CD7F32', bg: '#FFF3E0', icon: '🥉' },
  silver: { label: 'Silver', color: '#C0C0C0', bg: '#F5F5F5', icon: '🥈' },
  gold: { label: 'Gold', color: '#FFD700', bg: '#FFFDE7', icon: '🥇' },
  platinum: { label: 'Platinum', color: '#E5E4E2', bg: '#ECEFF1', icon: '💎' },
};

export default function LoyaltyProgram() {
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ totalMembers: 0, totalPoints: 0, goldPlus: 0 });

  const [enrollForm, setEnrollForm] = useState({ customer_id: '', tier: 'bronze' });
  const [txnForm, setTxnForm] = useState({ points: '', type: 'earned', description: '' });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [loyaltyData, contactsData] = await Promise.all([
        api.get('/loyalty'),
        api.get('/contacts?limit=500'),
      ]);
      if (loyaltyData.success) {
        const list = loyaltyData.data || [];
        let filtered = list;
        if (search) {
          const s = search.toLowerCase();
          filtered = list.filter(m => (m.customer_name || '').toLowerCase().includes(s));
        }
        if (filterTier) {
          filtered = filtered.filter(m => m.tier === filterTier);
        }
        setMembers(filtered);
        setStats({
          totalMembers: list.length,
          totalPoints: list.reduce((sum, m) => sum + (m.current_points || 0), 0),
          goldPlus: list.filter(m => m.tier === 'gold' || m.tier === 'platinum').length,
        });
      }
      if (contactsData.success) setContacts(contactsData.data || []);
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterTier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/loyalty', enrollForm);
      if (data.success) {
        showToast('success', 'Client enrolled in loyalty program');
        fetchData();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to enroll client');
    } finally {
      setSaving(false);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post(`/loyalty/${selectedMember.id}/transaction`, txnForm);
      if (data.success) {
        showToast('success', `Points ${txnForm.type === 'earned' ? 'added' : 'redeemed'} successfully`);
        fetchData();
        fetchTransactions(selectedMember.id);
        setShowTxnModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to process points');
    } finally {
      setSaving(false);
    }
  };

  const fetchTransactions = async (loyaltyId) => {
    try {
      const data = await api.get(`/loyalty/${loyaltyId}/transactions`);
      if (data.success) setTransactions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const openTxnModal = (member, type = 'earned') => {
    setSelectedMember(member);
    setTxnForm({ points: '', type, description: '' });
    fetchTransactions(member.id);
    setShowTxnModal(true);
  };

  const updateTier = async (memberId, newTier) => {
    try {
      const data = await api.patch(`/loyalty/${memberId}`, { tier: newTier });
      if (data.success) {
        showToast('success', `Tier updated to ${TIER_MAP[newTier]?.label}`);
        fetchData();
      }
    } catch (error) {
      showToast('error', 'Failed to update tier');
    }
  };

  return (
    <div className="crm-page">
      <SEO page="loyalty" />

      {toast.show && (
        <div className={`crm-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check /> : <WarningTriangle />}
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FCE4EC', color: '#E91E63' }}>
            <User width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalMembers}</div>
            <div className="stat-label">Loyalty Members</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFFDE7', color: '#FFC107' }}>
            <Star width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalPoints.toLocaleString()}</div>
            <div className="stat-label">Total Points</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>
            <Trophy width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.goldPlus}</div>
            <div className="stat-label">Gold+ Members</div>
          </div>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <div className="search-input-group">
              <Search className="search-icon" width={16} height={16} />
              <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
              <option value="">All Tiers</option>
              {Object.entries(TIER_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <button className="btn-create" onClick={() => { setEnrollForm({ customer_id: '', tier: 'bronze' }); setShowModal(true); }}>
            <Plus width={18} height={18} /> Enroll Client
          </button>
        </div>

        <div className="crm-table-wrapper">
          {loading ? (
            <div className="crm-loading"><div className="loading-spinner"></div><p>Loading loyalty members...</p></div>
          ) : members.length === 0 ? (
            <div className="crm-empty">
              <Star width={48} height={48} />
              <h3>No loyalty members yet</h3>
              <p>Enroll clients into your loyalty program to reward them.</p>
              <button className="btn-create" onClick={() => { setEnrollForm({ customer_id: '', tier: 'bronze' }); setShowModal(true); }}>
                <Plus width={18} height={18} /> Enroll Client
              </button>
            </div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Tier</th>
                  <th>Current Points</th>
                  <th>Total Earned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => {
                  const tierInfo = TIER_MAP[member.tier] || TIER_MAP.bronze;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="client-cell">
                          <div className="client-avatar beauty-avatar">{member.customer_name?.charAt(0) || '?'}</div>
                          <div>
                            <div className="cell-main">{member.customer_name || 'Unknown'}</div>
                            <div className="cell-sub">Member since {new Date(member.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="tier-select"
                          value={member.tier}
                          onChange={(e) => updateTier(member.id, e.target.value)}
                          style={{ background: tierInfo.bg, color: tierInfo.color, borderColor: tierInfo.color + '60' }}
                        >
                          {Object.entries(TIER_MAP).map(([key, val]) => (
                            <option key={key} value={key}>{val.icon} {val.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="points-display">
                          <Star width={16} height={16} style={{ color: '#FFC107' }} />
                          <span className="cell-main">{(member.current_points || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-sub">{(member.total_earned || 0).toLocaleString()}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn success" onClick={() => openTxnModal(member, 'earned')} title="Add Points">
                            <ArrowUp width={16} height={16} />
                          </button>
                          <button className="action-btn warning" onClick={() => openTxnModal(member, 'redeemed')} title="Redeem Points">
                            <ArrowDown width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Enroll Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enroll Client in Loyalty Program</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleEnroll} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select value={enrollForm.customer_id} onChange={(e) => setEnrollForm(p => ({ ...p, customer_id: e.target.value }))} className="form-control" required>
                    <option value="">Select client...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Starting Tier</label>
                  <select value={enrollForm.tier} onChange={(e) => setEnrollForm(p => ({ ...p, tier: e.target.value }))} className="form-control">
                    {Object.entries(TIER_MAP).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={saving}>{saving ? 'Enrolling...' : 'Enroll Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxnModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowTxnModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{txnForm.type === 'earned' ? '⬆️ Add Points' : '⬇️ Redeem Points'} — {selectedMember.customer_name}</h2>
              <button className="modal-close" onClick={() => setShowTxnModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleTransaction} className="modal-body">
              <div className="loyalty-current-info">
                <span>Current Points: <strong>{(selectedMember.current_points || 0).toLocaleString()}</strong></span>
                <span>Tier: <strong>{TIER_MAP[selectedMember.tier]?.icon} {TIER_MAP[selectedMember.tier]?.label}</strong></span>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Points *</label>
                  <input type="number" value={txnForm.points} onChange={(e) => setTxnForm(p => ({ ...p, points: e.target.value }))} className="form-control" min="1" required placeholder="Enter points" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={txnForm.type} onChange={(e) => setTxnForm(p => ({ ...p, type: e.target.value }))} className="form-control">
                    <option value="earned">Earned (Add)</option>
                    <option value="redeemed">Redeemed (Subtract)</option>
                    <option value="adjusted">Adjusted</option>
                  </select>
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <input type="text" value={txnForm.description} onChange={(e) => setTxnForm(p => ({ ...p, description: e.target.value }))} className="form-control" placeholder="e.g. Points for booking, Birthday bonus..." />
              </div>

              {/* Transaction History */}
              {transactions.length > 0 && (
                <div className="txn-history">
                  <h4>Recent Transactions</h4>
                  <div className="txn-list">
                    {transactions.slice(0, 10).map(txn => (
                      <div key={txn.id} className={`txn-item ${txn.type}`}>
                        <span className="txn-icon">{txn.type === 'earned' ? '⬆️' : txn.type === 'redeemed' ? '⬇️' : '🔄'}</span>
                        <span className="txn-desc">{txn.description || txn.type}</span>
                        <span className={`txn-points ${txn.type === 'redeemed' ? 'negative' : 'positive'}`}>
                          {txn.type === 'redeemed' ? '-' : '+'}{txn.points}
                        </span>
                        <span className="txn-date">{new Date(txn.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowTxnModal(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={saving}>
                  {saving ? 'Processing...' : (txnForm.type === 'earned' ? 'Add Points' : 'Redeem Points')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
