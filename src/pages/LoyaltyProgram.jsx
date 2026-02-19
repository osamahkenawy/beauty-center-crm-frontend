import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, Search, Plus, Xmark, WarningTriangle, Check,
  User, Trophy, ArrowUp, ArrowDown, Refresh, Settings,
  Trash, Gift, Calculator, Eye, EyeClosed
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import useCurrency from '../hooks/useCurrency';
import CurrencySymbol from '../components/CurrencySymbol';
import './LoyaltyProgram.css';

const TIERS = {
  bronze:   { label: 'Bronze',   icon: '🥉', color: '#E65100', bg: '#FFF3E0', min: 0,     gradient: 'linear-gradient(135deg, #CD7F32, #A0522D)' },
  silver:   { label: 'Silver',   icon: '🥈', color: '#546E7A', bg: '#ECEFF1', min: 2000,  gradient: 'linear-gradient(135deg, #C0C0C0, #808080)' },
  gold:     { label: 'Gold',     icon: '🥇', color: '#F57F17', bg: '#FFF8E1', min: 5000,  gradient: 'linear-gradient(135deg, #FFD700, #DAA520)' },
  platinum: { label: 'Platinum', icon: '💎', color: '#7B1FA2', bg: '#EDE7F6', min: 10000, gradient: 'linear-gradient(135deg, #B388FF, #7C4DFF)' },
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
const AVATAR_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#009688', '#FF5722', '#795548', '#607D8B'];

function getAvatarColor(name) {
  const code = (name || 'U').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getTierProgress(totalEarned, tiers) {
  const thresholds = tiers || TIERS;
  const currentIdx = TIER_ORDER.findIndex((t, i) => {
    const nextTier = TIER_ORDER[i + 1];
    return !nextTier || totalEarned < (thresholds[nextTier]?.min ?? TIERS[nextTier].min);
  });
  const currentTier = TIER_ORDER[currentIdx] || 'bronze';
  const nextTier = TIER_ORDER[currentIdx + 1] || null;
  
  if (!nextTier) return { currentTier, nextTier: null, progress: 100, remaining: 0 };
  
  const currentMin = thresholds[currentTier]?.min ?? TIERS[currentTier].min;
  const nextMin = thresholds[nextTier]?.min ?? TIERS[nextTier].min;
  const progress = Math.min(100, ((totalEarned - currentMin) / (nextMin - currentMin)) * 100);
  const remaining = nextMin - totalEarned;
  
  return { currentTier, nextTier, progress, remaining };
}

export default function LoyaltyProgram() {
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [txnType, setTxnType] = useState('earned');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'activity'

  // Loyalty Settings
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // Calculator
  const [calcAmount, setCalcAmount] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  // Forms
  const [enrollForm, setEnrollForm] = useState({ customer_id: '', tier: 'bronze' });
  const [txnForm, setTxnForm] = useState({ points: '', description: '' });
  const [settingsForm, setSettingsForm] = useState({});

  // Currency
  const { symbol: currencySymbol, currency } = useCurrency();
  const CS = () => <CurrencySymbol currency={currency} symbol={currencySymbol} style={{ display: 'inline', fontSize: 'inherit', verticalAlign: 'baseline' }} />;

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  // ── Data fetching ──
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const [loyaltyData, contactsData, statsData, settingsData] = await Promise.all([
        api.get('/loyalty'),
        api.get('/contacts?limit=500'),
        api.get('/loyalty/stats'),
        api.get('/loyalty/settings'),
      ]);
      if (loyaltyData.success) {
        let list = loyaltyData.data || [];
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(m => (m.customer_name || '').toLowerCase().includes(s) || (m.customer_email || '').toLowerCase().includes(s));
        }
        if (filterTier) {
          list = list.filter(m => m.tier === filterTier);
        }
        setMembers(list);
        if (selectedMember) {
          const updated = list.find(m => m.id === selectedMember.id);
          if (updated) {
            setSelectedMember(updated);
            fetchTransactions(updated.id);
          }
        }
      }
      if (contactsData.success) setContacts(contactsData.data || []);
      if (statsData.success) setStats(statsData.data || {});
      if (settingsData.success) setLoyaltySettings(settingsData.data || {});
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterTier]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const fetchTransactions = async (loyaltyId) => {
    try {
      const data = await api.get(`/loyalty/${loyaltyId}/transactions`);
      if (data.success) setTransactions(data.data || []);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    }
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    fetchTransactions(member.id);
  };

  // ── Enroll ──
  const handleEnroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/loyalty', enrollForm);
      if (data.success) {
        showToast('success', data.message || 'Client enrolled!');
        setShowEnrollModal(false);
        fetchMembers();
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to enroll client');
    } finally {
      setSaving(false);
    }
  };

  // ── Transaction ──
  const openTxnModal = (type) => {
    setTxnType(type);
    setTxnForm({ points: '', description: '' });
    setShowTxnModal(true);
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    try {
      const data = await api.post(`/loyalty/${selectedMember.id}/transaction`, {
        ...txnForm,
        type: txnType,
      });
      if (data.success) {
        showToast('success', data.message || 'Transaction processed!');
        setShowTxnModal(false);
        fetchMembers();
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to process transaction');
    } finally {
      setSaving(false);
    }
  };

  // ── Remove member ──
  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      const data = await api.delete(`/loyalty/${selectedMember.id}`);
      if (data.success) {
        showToast('success', 'Member removed from loyalty program');
        setSelectedMember(null);
        setShowRemoveConfirm(false);
        fetchMembers();
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  // ── Settings ──
  const openSettingsModal = () => {
    setSettingsForm(loyaltySettings ? { ...loyaltySettings } : {});
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        earn_rate: parseFloat(settingsForm.earn_rate) || 1,
        min_spend_to_earn: parseFloat(settingsForm.min_spend_to_earn) || 0,
        auto_enroll: !!settingsForm.auto_enroll,
        auto_earn_on_payment: settingsForm.auto_earn_on_payment !== false,
        point_value: parseFloat(settingsForm.point_value) || 0.01,
        max_redeem_percent: parseInt(settingsForm.max_redeem_percent) || 50,
        birthday_bonus: parseInt(settingsForm.birthday_bonus) || 0,
        referral_bonus: parseInt(settingsForm.referral_bonus) || 0,
        welcome_bonus: parseInt(settingsForm.welcome_bonus) || 0,
        tiers: settingsForm.tiers || undefined,
      };
      const data = await api.put('/loyalty/settings', payload);
      if (data.success) {
        showToast('success', 'Settings saved!');
        setLoyaltySettings(data.data);
        setShowSettingsModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Calculator ──
  const handleCalculate = async () => {
    try {
      const data = await api.post('/loyalty/calculate', {
        amount: parseFloat(calcAmount) || 0,
        customer_id: selectedMember?.customer_id || null,
      });
      if (data.success) setCalcResult(data.data);
    } catch (error) {
      console.error('Calc error:', error);
    }
  };

  // ── Tier distribution for mini donut ──
  const tierBreakdown = stats.tierBreakdown || {};
  const totalMemberCount = Object.values(tierBreakdown).reduce((s, v) => s + v, 0);

  // Already enrolled customer IDs (for filtering enroll dropdown)
  const enrolledIds = useMemo(() => new Set(members.map(m => m.customer_id)), [members]);

  // Recent activity from stats
  const recentActivity = stats.recentActivity || [];

  return (
    <div className="loyalty-page">
      <SEO page="loyalty" />

      {toast.show && (
        <div className={`loyalty-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check width={18} height={18} /> : <WarningTriangle width={18} height={18} />}
          {toast.message}
        </div>
      )}

      {/* ═══ Page Header ═══ */}
      <div className="loyalty-header">
        <div>
          <h1><Star width={24} height={24} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} /> Loyalty Program</h1>
          <p>Reward your clients & keep them coming back</p>
        </div>
        <div className="loyalty-header-actions">
          <button className="loyalty-header-btn calc" data-tooltip="Calculate points" onClick={() => { setCalcAmount(''); setCalcResult(null); setShowCalcModal(true); }}>
            <Calculator width={16} height={16} /> Points Calculator
          </button>
          <button className="loyalty-header-btn settings" data-tooltip="Program settings" onClick={openSettingsModal}>
            <Settings width={16} height={16} /> Settings
          </button>
        </div>
      </div>

      {/* ═══ Stats Row ═══ */}
      <div className="loyalty-stats">
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-icon" style={{ background: '#FCE4EC', color: '#E91E63' }}>
            <User width={22} height={22} />
          </div>
          <div className="loyalty-stat-body">
            <h3>{stats.totalMembers || 0}</h3>
            <p>Members</p>
            {stats.newThisMonth > 0 && <span className="loyalty-stat-sub">+{stats.newThisMonth} this month</span>}
          </div>
        </div>
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-icon" style={{ background: '#FFF8E1', color: '#FFC107' }}>
            <Star width={22} height={22} />
          </div>
          <div className="loyalty-stat-body">
            <h3>{(stats.totalPoints || 0).toLocaleString()}</h3>
            <p>Active Points</p>
            {loyaltySettings?.point_value > 0 && (
              <span className="loyalty-stat-sub">≈ <CS /> {((stats.totalPoints || 0) * loyaltySettings.point_value).toFixed(0)} value</span>
            )}
          </div>
        </div>
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>
            <ArrowUp width={22} height={22} />
          </div>
          <div className="loyalty-stat-body">
            <h3>{(stats.monthlyEarned || 0).toLocaleString()}</h3>
            <p>Earned This Month</p>
            <span className="loyalty-stat-sub">{(stats.totalEarned || 0).toLocaleString()} total</span>
          </div>
        </div>
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>
            <Trophy width={22} height={22} />
          </div>
          <div className="loyalty-stat-body">
            <h3>{stats.goldPlus || 0}</h3>
            <p>Gold+ Members</p>
            <span className="loyalty-stat-sub">{stats.monthlyRedeemed ? `${(stats.monthlyRedeemed || 0).toLocaleString()} redeemed` : 'Top tier clients'}</span>
          </div>
        </div>
      </div>

      {/* ═══ Tier Overview ═══ */}
      <div className="tier-overview">
        {TIER_ORDER.map(t => {
          const count = tierBreakdown[t] || 0;
          const pct = totalMemberCount > 0 ? ((count / totalMemberCount) * 100).toFixed(0) : 0;
          const tierSettings = loyaltySettings?.tiers?.[t] || {};
          return (
            <div className="tier-chip" key={t} title={tierSettings.perks || ''}>
              <span className="tier-chip-icon">{TIERS[t].icon}</span>
              <div className="tier-chip-body">
                <h4>{TIERS[t].label}</h4>
                <span>{count} members · {pct}%</span>
                {tierSettings.multiplier > 1 && (
                  <span className="tier-chip-mult">{tierSettings.multiplier}x points</span>
                )}
              </div>
              <div className="tier-chip-bar">
                <div className="tier-chip-bar-fill" style={{ width: `${pct}%`, background: TIERS[t].gradient }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Tab Toggle ═══ */}
      <div className="loyalty-tabs">
        <button className={`loyalty-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <User width={15} height={15} /> Members ({members.length})
        </button>
        <button className={`loyalty-tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <Refresh width={15} height={15} /> Recent Activity
        </button>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className={`loyalty-content ${selectedMember ? '' : 'no-detail'}`}>
        
        {/* ── Members List / Activity Feed ── */}
        <div className="loyalty-members-card">
          {activeTab === 'members' && (
            <>
              <div className="loyalty-toolbar">
                <div className="loyalty-search">
                  <Search width={16} height={16} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="loyalty-filter-select"
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                >
                  <option value="">All Tiers</option>
                  {TIER_ORDER.map(t => (
                    <option key={t} value={t}>{TIERS[t].icon} {TIERS[t].label}</option>
                  ))}
                </select>
                <button
                  className="loyalty-btn-enroll"
                  onClick={() => { setEnrollForm({ customer_id: '', tier: 'bronze' }); setShowEnrollModal(true); }}
                >
                  <Plus width={18} height={18} /> Enroll
                </button>
              </div>

              <div className="loyalty-members-list">
                {loading ? (
                  <div className="loyalty-empty"><p>Loading members...</p></div>
                ) : members.length === 0 ? (
                  <div className="loyalty-empty">
                    <Star width={48} height={48} />
                    <h3>No loyalty members yet</h3>
                    <p>Enroll your first client to start the loyalty program</p>
                    <button className="loyalty-btn-enroll" onClick={() => { setEnrollForm({ customer_id: '', tier: 'bronze' }); setShowEnrollModal(true); }}>
                      <Plus width={18} height={18} /> Enroll First Client
                    </button>
                  </div>
                ) : (
                  members.map(member => {
                    const tierInfo = TIERS[member.tier] || TIERS.bronze;
                    const avatarColor = getAvatarColor(member.customer_name);
                    return (
                      <div
                        key={member.id}
                        className={`loyalty-member-row ${selectedMember?.id === member.id ? 'active' : ''}`}
                        onClick={() => selectMember(member)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${member.customer_name || 'Unknown'} - ${tierInfo.label} - ${member.current_points || 0} points`}
                      >
                        <div className="loyalty-member-avatar" style={{ background: avatarColor }}>
                          {(member.customer_name || 'U').charAt(0)}
                        </div>
                        <div className="loyalty-member-info">
                          <div className="loyalty-member-name">{member.customer_name || 'Unknown'}</div>
                          <div className="loyalty-member-meta">
                            {member.customer_email || 'No email'}
                            {member.last_activity && (
                              <> · Last active {new Date(member.last_activity).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <span className={`loyalty-tier-badge tier-${member.tier}`}>
                          {tierInfo.icon} {tierInfo.label}
                        </span>
                        <div className="loyalty-member-points">
                          <div className="pts-value">{(member.current_points || 0).toLocaleString()}</div>
                          <div className="pts-label">points</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <div className="loyalty-activity-feed">
              <div className="loyalty-activity-header">
                <h3>📊 Recent Activity</h3>
                <button className="loyalty-refresh-btn" data-tooltip="Refresh members" onClick={fetchMembers}><Refresh width={16} height={16} /></button>
              </div>
              {recentActivity.length === 0 ? (
                <div className="loyalty-empty">
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActivity.map((act, idx) => {
                  const isNeg = act.transaction_type === 'redeem' || act.transaction_type === 'expire';
                  return (
                    <div key={act.id || idx} className="loyalty-activity-row">
                      <div className={`loyalty-txn-icon ${act.transaction_type}`}>
                        {act.transaction_type === 'earn' ? '⬆️' : act.transaction_type === 'redeem' ? '⬇️' : act.transaction_type === 'expire' ? '⏰' : '🔄'}
                      </div>
                      <div className="loyalty-activity-body">
                        <div className="loyalty-activity-name">{act.customer_name || 'Unknown'}</div>
                        <div className="loyalty-activity-desc">{act.description || act.transaction_type}</div>
                        <div className="loyalty-activity-date">{new Date(act.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <span className={`loyalty-txn-pts ${isNeg ? 'negative' : 'positive'}`}>
                        {isNeg ? '−' : '+'}{act.points}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Detail Panel ── */}
        {selectedMember && (
          <div className="loyalty-detail-panel">
            {/* Visual Loyalty Card */}
            <div className="loyalty-card-visual" style={{ background: TIERS[selectedMember.tier]?.gradient || TIERS.bronze.gradient }}>
              <div className="loyalty-card-pattern" />
              <button className="loyalty-detail-close" onClick={() => setSelectedMember(null)}>
                <Xmark width={18} height={18} />
              </button>
              <div className="loyalty-card-tier-icon">{TIERS[selectedMember.tier]?.icon}</div>
              <div className="loyalty-card-name">{selectedMember.customer_name || 'Unknown'}</div>
              <div className="loyalty-card-email">{selectedMember.customer_email || ''}</div>
              <div className="loyalty-card-points-row">
                <div className="loyalty-card-pts">
                  <span className="loyalty-card-pts-num">{(selectedMember.current_points || 0).toLocaleString()}</span>
                  <span className="loyalty-card-pts-label">POINTS</span>
                </div>
                <span className="loyalty-card-tier">{TIERS[selectedMember.tier]?.label} Tier</span>
              </div>
              <div className="loyalty-card-since">
                Member since {new Date(selectedMember.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Tier Progress */}
            {(() => {
              const tierThresholds = loyaltySettings?.tiers || TIERS;
              const progress = getTierProgress(selectedMember.total_earned || 0, tierThresholds);
              return (
                <div className="tier-progress">
                  <div className="tier-progress-bar">
                    <div
                      className="tier-progress-fill"
                      style={{
                        width: `${progress.progress}%`,
                        background: TIERS[progress.currentTier]?.gradient || '#f2421b',
                      }}
                    />
                  </div>
                  <div className="tier-progress-labels">
                    <span>{TIERS[progress.currentTier]?.icon} {TIERS[progress.currentTier]?.label}</span>
                    {progress.nextTier && (
                      <span>{TIERS[progress.nextTier]?.icon} {TIERS[progress.nextTier]?.label}</span>
                    )}
                  </div>
                  {progress.nextTier ? (
                    <p className="tier-progress-next">
                      <strong>{progress.remaining.toLocaleString()}</strong> more pts to {TIERS[progress.nextTier]?.label}
                    </p>
                  ) : (
                    <p className="tier-progress-next" style={{ color: '#7B1FA2' }}>
                      🎉 Highest tier reached!
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Points Summary */}
            <div className="loyalty-points-grid">
              <div className="loyalty-points-box">
                <h4>{(selectedMember.current_points || 0).toLocaleString()}</h4>
                <p>Available</p>
              </div>
              <div className="loyalty-points-box earned">
                <h4>{(selectedMember.total_earned || 0).toLocaleString()}</h4>
                <p>Total Earned</p>
              </div>
              <div className="loyalty-points-box redeemed">
                <h4>{(selectedMember.total_redeemed || 0).toLocaleString()}</h4>
                <p>Redeemed</p>
              </div>
              <div className="loyalty-points-box">
                <h4>{loyaltySettings?.point_value > 0 ? <><CS /> {((selectedMember.current_points || 0) * loyaltySettings.point_value).toFixed(2)}</> : '—'}</h4>
                <p>Points Value</p>
              </div>
            </div>

            {/* Perks */}
            {loyaltySettings?.tiers?.[selectedMember.tier]?.perks && (
              <div className="loyalty-perks-box">
                <Gift width={16} height={16} />
                <div>
                  <strong>Tier Perks</strong>
                  <p>{loyaltySettings.tiers[selectedMember.tier].perks}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="loyalty-detail-actions">
              <button className="loyalty-action-btn earn" data-tooltip="Add earned points" onClick={() => openTxnModal('earned')}>
                <ArrowUp width={16} height={16} /> Earn
              </button>
              <button className="loyalty-action-btn redeem" data-tooltip="Redeem points" onClick={() => openTxnModal('redeemed')}>
                <ArrowDown width={16} height={16} /> Redeem
              </button>
              <button className="loyalty-action-btn adjust" data-tooltip="Adjust points" onClick={() => openTxnModal('adjusted')}>
                <Settings width={16} height={16} /> Adjust
              </button>
              <button className="loyalty-action-btn remove" data-tooltip="Remove from program" onClick={() => setShowRemoveConfirm(true)}>
                <Trash width={16} height={16} />
              </button>
            </div>

            {/* Transaction History */}
            <div className="loyalty-txn-section">
              <h4>Transaction History ({transactions.length})</h4>
              {transactions.length === 0 ? (
                <div className="loyalty-txn-empty">No transactions yet</div>
              ) : (
                transactions.slice(0, 20).map(txn => {
                  const isRedeem = txn.transaction_type === 'redeem';
                  const isExpire = txn.transaction_type === 'expire';
                  const isNegative = isRedeem || isExpire;
                  return (
                    <div key={txn.id} className="loyalty-txn-item">
                      <div className={`loyalty-txn-icon ${txn.transaction_type}`}>
                        {txn.transaction_type === 'earn' ? '⬆️' : isRedeem ? '⬇️' : isExpire ? '⏰' : '🔄'}
                      </div>
                      <div className="loyalty-txn-body">
                        <div className="loyalty-txn-desc">{txn.description || txn.transaction_type}</div>
                        <div className="loyalty-txn-date">{new Date(txn.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <span className={`loyalty-txn-pts ${isNegative ? 'negative' : 'positive'}`}>
                        {isNegative ? '−' : '+'}{txn.points}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════ */}

      {/* ── Enroll Modal ── */}
      {showEnrollModal && (
        <div className="loyalty-modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="loyalty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loyalty-modal-header">
              <h2>⭐ Enroll Client</h2>
              <button onClick={() => setShowEnrollModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleEnroll}>
              <div className="loyalty-modal-body">
                {loyaltySettings?.welcome_bonus > 0 && (
                  <div className="loyalty-info-banner">
                    🎁 New members receive <strong>{loyaltySettings.welcome_bonus} welcome bonus points!</strong>
                  </div>
                )}
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={enrollForm.customer_id}
                    onChange={(e) => setEnrollForm(p => ({ ...p, customer_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a client...</option>
                    {contacts.filter(c => !enrolledIds.has(c.id)).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint">{contacts.length - enrolledIds.size} clients available to enroll</small>
                </div>
                <div className="form-group">
                  <label>Starting Tier</label>
                  <select
                    value={enrollForm.tier}
                    onChange={(e) => setEnrollForm(p => ({ ...p, tier: e.target.value }))}
                  >
                    {TIER_ORDER.map(t => (
                      <option key={t} value={t}>{TIERS[t].icon} {TIERS[t].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="loyalty-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowEnrollModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Enrolling...' : '⭐ Enroll Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Modal ── */}
      {showTxnModal && selectedMember && (
        <div className="loyalty-modal-overlay" onClick={() => setShowTxnModal(false)}>
          <div className="loyalty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loyalty-modal-header">
              <h2>
                {txnType === 'earned' ? '⬆️ Add Points' : txnType === 'redeemed' ? '⬇️ Redeem Points' : '🔄 Adjust Points'}
              </h2>
              <button onClick={() => setShowTxnModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleTransaction}>
              <div className="loyalty-modal-body">
                <div className="loyalty-balance-display">
                  <div className="loyalty-balance-label">Current Balance</div>
                  <div className="loyalty-balance-value">
                    {(selectedMember.current_points || 0).toLocaleString()} <span>pts</span>
                  </div>
                  {loyaltySettings?.point_value > 0 && (
                    <div className="loyalty-balance-worth">
                      Worth <CS /> {((selectedMember.current_points || 0) * loyaltySettings.point_value).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Points *</label>
                  <div className="points-input-wrapper">
                    <input
                      type="number"
                      value={txnForm.points}
                      onChange={(e) => setTxnForm(p => ({ ...p, points: e.target.value }))}
                      min="1"
                      max={txnType === 'redeemed' ? (selectedMember.current_points || 0) : undefined}
                      required
                      placeholder="0"
                      autoFocus
                    />
                    <span className="points-input-suffix">pts</span>
                  </div>
                  {txnType === 'redeemed' && txnForm.points && parseInt(txnForm.points) > (selectedMember.current_points || 0) && (
                    <small className="form-error">
                      Exceeds available balance ({(selectedMember.current_points || 0).toLocaleString()} pts)
                    </small>
                  )}
                  {txnType === 'redeemed' && txnForm.points && loyaltySettings?.point_value > 0 && (
                    <small className="form-hint">
                      Redemption value: <CS /> {(parseInt(txnForm.points) * loyaltySettings.point_value).toFixed(2)}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={txnForm.description}
                    onChange={(e) => setTxnForm(p => ({ ...p, description: e.target.value }))}
                    placeholder={txnType === 'earned' ? 'e.g. Service booking, Birthday bonus...' : txnType === 'redeemed' ? 'e.g. Discount redemption, Free service...' : 'e.g. Manual adjustment...'}
                  />
                </div>
              </div>
              <div className="loyalty-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowTxnModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Processing...' : (
                    txnType === 'earned' ? '⬆️ Add Points' :
                    txnType === 'redeemed' ? '⬇️ Redeem Points' : '🔄 Adjust Points'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettingsModal && (
        <div className="loyalty-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="loyalty-modal loyalty-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="loyalty-modal-header">
              <h2>⚙️ Loyalty Settings</h2>
              <button onClick={() => setShowSettingsModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="loyalty-modal-body loyalty-settings-body">
                {/* Earning */}
                <div className="loyalty-settings-section">
                  <h3>💰 Points Earning</h3>
                  <div className="loyalty-settings-grid">
                    <div className="form-group">
                      <label>Earn Rate <small>(pts per <CS /> 1)</small></label>
                      <input
                        type="number"
                        value={settingsForm.earn_rate ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, earn_rate: e.target.value }))}
                        min="0.1" step="0.1"
                        placeholder="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Min Spend to Earn <small>(<CS />)</small></label>
                      <input
                        type="number"
                        value={settingsForm.min_spend_to_earn ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, min_spend_to_earn: e.target.value }))}
                        min="0" step="1"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="loyalty-settings-grid">
                    <div className="form-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={settingsForm.auto_earn_on_payment !== false}
                          onChange={(e) => setSettingsForm(p => ({ ...p, auto_earn_on_payment: e.target.checked }))}
                        />
                        Auto-earn on invoice payment
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={!!settingsForm.auto_enroll}
                          onChange={(e) => setSettingsForm(p => ({ ...p, auto_enroll: e.target.checked }))}
                        />
                        Auto-enroll on first purchase
                      </label>
                    </div>
                  </div>
                </div>

                {/* Redemption */}
                <div className="loyalty-settings-section">
                  <h3>🎁 Redemption</h3>
                  <div className="loyalty-settings-grid">
                    <div className="form-group">
                      <label>Point Value <small>(<CS /> per 1 pt)</small></label>
                      <input
                        type="number"
                        value={settingsForm.point_value ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, point_value: e.target.value }))}
                        min="0.001" step="0.001"
                        placeholder="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Redeem % <small>(of invoice)</small></label>
                      <input
                        type="number"
                        value={settingsForm.max_redeem_percent ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, max_redeem_percent: e.target.value }))}
                        min="1" max="100"
                        placeholder="50"
                      />
                    </div>
                  </div>
                </div>

                {/* Bonuses */}
                <div className="loyalty-settings-section">
                  <h3>🎂 Bonuses</h3>
                  <div className="loyalty-settings-grid three-col">
                    <div className="form-group">
                      <label>Welcome Bonus <small>(pts)</small></label>
                      <input
                        type="number"
                        value={settingsForm.welcome_bonus ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, welcome_bonus: e.target.value }))}
                        min="0" placeholder="50"
                      />
                    </div>
                    <div className="form-group">
                      <label>Birthday Bonus <small>(pts)</small></label>
                      <input
                        type="number"
                        value={settingsForm.birthday_bonus ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, birthday_bonus: e.target.value }))}
                        min="0" placeholder="100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Referral Bonus <small>(pts)</small></label>
                      <input
                        type="number"
                        value={settingsForm.referral_bonus ?? ''}
                        onChange={(e) => setSettingsForm(p => ({ ...p, referral_bonus: e.target.value }))}
                        min="0" placeholder="200"
                      />
                    </div>
                  </div>
                </div>

                {/* Tiers */}
                <div className="loyalty-settings-section">
                  <h3>🏆 Tier Configuration</h3>
                  <div className="loyalty-tier-settings">
                    {TIER_ORDER.map(t => (
                      <div key={t} className={`loyalty-tier-setting-row tier-${t}`}>
                        <span className="tier-setting-icon">{TIERS[t].icon}</span>
                        <div className="tier-setting-name">{TIERS[t].label}</div>
                        <div className="form-group compact">
                          <label>Min Points</label>
                          <input
                            type="number"
                            value={settingsForm.tiers?.[t]?.min ?? TIERS[t].min}
                            onChange={(e) => {
                              const newTiers = { ...(settingsForm.tiers || {}) };
                              newTiers[t] = { ...(newTiers[t] || {}), min: parseInt(e.target.value) || 0 };
                              setSettingsForm(p => ({ ...p, tiers: newTiers }));
                            }}
                            min="0"
                            disabled={t === 'bronze'}
                          />
                        </div>
                        <div className="form-group compact">
                          <label>Multiplier</label>
                          <input
                            type="number"
                            value={settingsForm.tiers?.[t]?.multiplier ?? 1}
                            onChange={(e) => {
                              const newTiers = { ...(settingsForm.tiers || {}) };
                              newTiers[t] = { ...(newTiers[t] || {}), multiplier: parseFloat(e.target.value) || 1 };
                              setSettingsForm(p => ({ ...p, tiers: newTiers }));
                            }}
                            min="1" step="0.25"
                          />
                        </div>
                        <div className="form-group compact perks-input">
                          <label>Perks</label>
                          <input
                            type="text"
                            value={settingsForm.tiers?.[t]?.perks ?? ''}
                            onChange={(e) => {
                              const newTiers = { ...(settingsForm.tiers || {}) };
                              newTiers[t] = { ...(newTiers[t] || {}), perks: e.target.value };
                              setSettingsForm(p => ({ ...p, tiers: newTiers }));
                            }}
                            placeholder="Describe perks..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="loyalty-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Points Calculator Modal ── */}
      {showCalcModal && (
        <div className="loyalty-modal-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="loyalty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loyalty-modal-header">
              <h2><Calculator width={20} height={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} /> Points Calculator</h2>
              <button onClick={() => setShowCalcModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <div className="loyalty-modal-body">
              <div className="form-group">
                <label>Spend Amount (<CS />)</label>
                <div className="points-input-wrapper">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => { setCalcAmount(e.target.value); setCalcResult(null); }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                  <span className="points-input-suffix"><CS /></span>
                </div>
              </div>
              <button
                type="button"
                className="btn-submit"
                style={{ width: '100%', marginTop: 8 }}
                onClick={handleCalculate}
                disabled={!calcAmount || parseFloat(calcAmount) <= 0}
              >
                Calculate Points
              </button>

              {calcResult && (
                <div className="calc-result">
                  <div className="calc-result-main">
                    <div className="calc-result-pts">{calcResult.total_points}</div>
                    <div className="calc-result-label">Points Earned</div>
                  </div>
                  <div className="calc-result-details">
                    <div className="calc-detail-row">
                      <span>Spend</span>
                      <span><CS /> {parseFloat(calcResult.amount).toFixed(2)}</span>
                    </div>
                    <div className="calc-detail-row">
                      <span>Earn Rate</span>
                      <span>{calcResult.earn_rate} pts / <CS /> 1</span>
                    </div>
                    <div className="calc-detail-row">
                      <span>Base Points</span>
                      <span>{calcResult.base_points}</span>
                    </div>
                    {calcResult.bonus_points > 0 && (
                      <div className="calc-detail-row bonus">
                        <span>{TIERS[calcResult.tier]?.icon} {TIERS[calcResult.tier]?.label} Bonus ({calcResult.multiplier}x)</span>
                        <span>+{calcResult.bonus_points}</span>
                      </div>
                    )}
                    <div className="calc-detail-row total">
                      <span>Redemption Value</span>
                      <span><CS /> {calcResult.redemption_value?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ── */}
      {showRemoveConfirm && selectedMember && (
        <div className="loyalty-modal-overlay" onClick={() => setShowRemoveConfirm(false)}>
          <div className="loyalty-modal loyalty-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="loyalty-modal-header danger">
              <h2>⚠️ Remove Member</h2>
              <button onClick={() => setShowRemoveConfirm(false)}><Xmark width={20} height={20} /></button>
            </div>
            <div className="loyalty-modal-body">
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 16 }}>
                Are you sure you want to remove <strong>{selectedMember.customer_name}</strong> from the loyalty program?
              </p>
              <div className="loyalty-remove-warning">
                <WarningTriangle width={20} height={20} />
                <div>
                  <strong>This will permanently delete:</strong>
                  <ul>
                    <li>{(selectedMember.current_points || 0).toLocaleString()} available points</li>
                    <li>All transaction history</li>
                    <li>{TIERS[selectedMember.tier]?.label} tier status</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="loyalty-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowRemoveConfirm(false)}>Keep Member</button>
              <button type="button" className="btn-submit danger" onClick={handleRemoveMember} disabled={saving}>
                {saving ? 'Removing...' : '🗑️ Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
