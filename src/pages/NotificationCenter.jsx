import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, Search, Check, Trash, Calendar, CreditCard,
  Mail, Star, Clock, Settings, RefreshDouble, Archive,
  WarningTriangle, Megaphone, Heart, User, BellNotification,
  Xmark, SendDiagonal, Gift, ShoppingBag, UserPlus,
  CheckCircle, Package, InfoCircle, Filter, EyeEmpty
} from 'iconoir-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import SEO from '../components/SEO';
import './NotificationCenter.css';

/* ── Type / Category Configs ── */
const TYPE_CONFIG = {
  appointment:  { label: 'Appointments', Icon: Calendar,       color: '#6366f1', bg: '#eef2ff' },
  invoice:      { label: 'Invoices',     Icon: CreditCard,     color: '#10b981', bg: '#ecfdf5' },
  payment:      { label: 'Payments',     Icon: CreditCard,     color: '#f59e0b', bg: '#fff7ed' },
  reminder:     { label: 'Reminders',    Icon: Clock,          color: '#f59e0b', bg: '#fef3c7' },
  system:       { label: 'System',       Icon: InfoCircle,     color: '#3b82f6', bg: '#f0f4ff' },
  promotion:    { label: 'Promotions',   Icon: Megaphone,      color: '#ec4899', bg: '#fce7f3' },
  review:       { label: 'Reviews',      Icon: Star,           color: '#f2421b', bg: '#fff3ed' },
  inventory:    { label: 'Inventory',    Icon: Package,        color: '#22c55e', bg: '#f0fdf4' },
  loyalty:      { label: 'Loyalty',      Icon: Heart,          color: '#8b5cf6', bg: '#f5f3ff' },
  gift_card:    { label: 'Gift Cards',   Icon: Gift,           color: '#ec4899', bg: '#fce7f3' },
  client:       { label: 'Clients',      Icon: User,           color: '#0ea5e9', bg: '#e0f2fe' },
  staff:        { label: 'Team',         Icon: UserPlus,       color: '#7c3aed', bg: '#ede9fe' },
  pos:          { label: 'POS Sales',    Icon: ShoppingBag,    color: '#f97316', bg: '#fff7ed' },
  general:      { label: 'General',      Icon: Bell,           color: '#64748b', bg: '#f1f5f9' },
};

const CATEGORY_BADGES = {
  info:     { bg: '#eef2ff', color: '#6366f1' },
  success:  { bg: '#ecfdf5', color: '#10b981' },
  warning:  { bg: '#fef3c7', color: '#f59e0b' },
  error:    { bg: '#fef2f2', color: '#ef4444' },
  reminder: { bg: '#fff3ed', color: '#f2421b' },
};

const REMINDER_TYPE_INFO = {
  appointment_upcoming: { label: 'Upcoming Appointments', desc: 'Remind clients before their appointment', Icon: Calendar, color: '#6366f1', bg: '#eef2ff' },
  appointment_followup: { label: 'Follow-up After Visit', desc: 'Send follow-up message after service', Icon: Heart, color: '#ec4899', bg: '#fce7f3' },
  review_request:       { label: 'Review Request', desc: 'Ask clients to leave a review', Icon: Star, color: '#f59e0b', bg: '#fef3c7' },
  birthday:             { label: 'Birthday Wishes', desc: 'Send birthday greetings & offers', Icon: Gift, color: '#ef4444', bg: '#fef2f2' },
  inactive_client:      { label: 'Win-back Inactive', desc: 'Re-engage clients who haven\'t visited', Icon: User, color: '#8b5cf6', bg: '#f5f3ff' },
  payment_due:          { label: 'Payment Reminders', desc: 'Remind about unpaid invoices', Icon: CreditCard, color: '#10b981', bg: '#ecfdf5' },
  membership_expiry:    { label: 'Membership Expiry', desc: 'Alert before membership expires', Icon: User, color: '#f2421b', bg: '#fff3ed' },
  package_expiry:       { label: 'Package Expiry', desc: 'Notify before package expires', Icon: Package, color: '#3b82f6', bg: '#eff6ff' },
  stock_low:            { label: 'Low Stock Alerts', desc: 'Notify when product stock is low', Icon: Package, color: '#22c55e', bg: '#f0fdf4' },
};

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, today: 0, by_type: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterRead, setFilterRead] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 30 });
      if (filterType) params.set('type', filterType);
      if (filterRead !== '') params.set('is_read', filterRead);
      if (search) params.set('search', search);

      const [notifRes, statsRes] = await Promise.all([
        api.get(`/notifications?${params}`),
        api.get('/notifications/stats'),
      ]);

      if (notifRes.success) {
        setNotifications(notifRes.data || []);
        setTotalPages(notifRes.pagination?.pages || 1);
      }
      if (statsRes.success) setStats(statsRes.data || {});
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterRead, search]);

  const fetchReminders = useCallback(async () => {
    try {
      setLoadingReminders(true);
      const res = await api.get('/notifications/reminders');
      if (res.success) setReminders(res.data || []);
    } catch (error) {
      console.error('Fetch reminders error:', error);
    } finally {
      setLoadingReminders(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoadingPrefs(true);
      const res = await api.get('/notifications/preferences');
      if (res.success) setPreferences(res.data);
    } catch (error) {
      console.error('Fetch preferences error:', error);
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') fetchNotifications();
    else if (activeTab === 'reminders') fetchReminders();
    else if (activeTab === 'preferences') fetchPreferences();
  }, [activeTab, fetchNotifications, fetchReminders, fetchPreferences]);

  // ── Actions ──
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) { console.error(error); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setStats(prev => ({ ...prev, unread: 0 }));
      Swal.fire({ icon: 'success', title: 'Done!', text: 'All marked as read', timer: 1500, showConfirmButton: false });
    } catch (error) { console.error(error); }
  };

  const archiveNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) { console.error(error); }
  };

  const clearAllRead = async () => {
    const result = await Swal.fire({
      title: 'Clear read notifications?',
      text: 'This will archive all read notifications',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Yes, clear them'
    });
    if (result.isConfirmed) {
      try {
        await api.delete('/notifications/clear-all');
        fetchNotifications();
        Swal.fire({ icon: 'success', title: 'Cleared!', timer: 1200, showConfirmButton: false });
      } catch (error) { console.error(error); }
    }
  };

  const generateReminders = async () => {
    try {
      const res = await api.post('/notifications/generate-reminders');
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Reminders Generated', text: `Created ${res.generated || 0} new notifications`, timer: 2000, showConfirmButton: false });
        if (activeTab === 'notifications') fetchNotifications();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to generate reminders' });
    }
  };

  const sendTestNotification = async () => {
    try {
      await api.post('/notifications/send-test');
      Swal.fire({ icon: 'success', title: 'Test Sent!', text: 'Check your notifications', timer: 1500, showConfirmButton: false });
      fetchNotifications();
    } catch (error) { console.error(error); }
  };

  const updateReminder = async (id, updates) => {
    try {
      await api.patch(`/notifications/reminders/${id}`, updates);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) { console.error(error); }
  };

  const updatePreference = async (key, value) => {
    try {
      await api.patch('/notifications/preferences', { [key]: value });
      setPreferences(prev => ({ ...prev, [key]: value }));
    } catch (error) { console.error(error); }
  };

  const typeCountMap = useMemo(() => {
    const map = {};
    (stats.by_type || []).forEach(t => { map[t.type] = t.count; });
    return map;
  }, [stats.by_type]);

  const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.general;

  // ── Grouped notifications by date ──
  const groupedNotifications = useMemo(() => {
    const groups = {};
    notifications.forEach(n => {
      const d = new Date(n.created_at);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      let label;
      if (d.toDateString() === today.toDateString()) label = 'Today';
      else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
      else label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return groups;
  }, [notifications]);

  return (
    <div className="notif-page">
      <SEO page="notifications" />

      {/* ═══ Header ═══ */}
      <div className="notif-header">
        <div className="notif-header-left">
          <h1>
            <BellNotification width={24} height={24} />
            Notification Center
          </h1>
          <p>Stay updated with everything happening in your business</p>
        </div>
        <div className="notif-header-actions">
          <button className="notif-btn outline" onClick={sendTestNotification} data-tooltip="Send test">
            <SendDiagonal width={14} height={14} /> Test
          </button>
          <button className="notif-btn outline" onClick={generateReminders} data-tooltip="Generate reminders">
            <RefreshDouble width={14} height={14} /> Scan Reminders
          </button>
          {stats.unread > 0 && (
            <button className="notif-btn primary" onClick={markAllRead}>
              <CheckCircle width={14} height={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="notif-stats">
        <div className="notif-stat-card" onClick={() => { setFilterRead('0'); setFilterType(''); setActiveTab('notifications'); }}>
          <div className="notif-stat-icon unread"><Bell width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{stats.unread || 0}</h3>
            <p>Unread</p>
          </div>
          {stats.unread > 0 && <span className="notif-stat-pulse" />}
        </div>
        <div className="notif-stat-card" onClick={() => { setFilterRead(''); setFilterType(''); setActiveTab('notifications'); }}>
          <div className="notif-stat-icon total"><BellNotification width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{stats.total || 0}</h3>
            <p>Total</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="notif-stat-icon today"><CheckCircle width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{stats.today || 0}</h3>
            <p>Today</p>
          </div>
        </div>
        <div className="notif-stat-card" onClick={() => setActiveTab('reminders')}>
          <div className="notif-stat-icon reminders"><Clock width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{reminders.filter(r => r.is_enabled).length || '—'}</h3>
            <p>Active Rules</p>
          </div>
        </div>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="notif-tab-bar">
        {[
          { id: 'notifications', label: 'Notifications', Icon: Bell, badge: stats.unread || null },
          { id: 'reminders', label: 'Automation', Icon: RefreshDouble },
          { id: 'preferences', label: 'Preferences', Icon: Settings },
        ].map(tab => (
          <button key={tab.id} className={`notif-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <tab.Icon width={15} height={15} />
            {tab.label}
            {tab.badge > 0 && <span className="notif-tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: Notifications ═══════════ */}
      {activeTab === 'notifications' && (
        <>
          {/* Filters */}
          <div className="notif-filters">
            <div className="notif-filter-row">
              <button
                className={`notif-filter-chip ${filterType === '' && filterRead === '' ? 'active' : ''}`}
                onClick={() => { setFilterType(''); setFilterRead(''); setPage(1); }}
              >
                All
                <span className="chip-count">{stats.total || 0}</span>
              </button>
              <button
                className={`notif-filter-chip ${filterRead === '0' ? 'active' : ''}`}
                onClick={() => { setFilterRead(filterRead === '0' ? '' : '0'); setPage(1); }}
              >
                <EyeEmpty width={12} height={12} />
                Unread
                <span className="chip-count">{stats.unread || 0}</span>
              </button>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const count = typeCountMap[key] || 0;
                if (!count && filterType !== key) return null;
                return (
                  <button
                    key={key}
                    className={`notif-filter-chip ${filterType === key ? 'active' : ''}`}
                    onClick={() => { setFilterType(filterType === key ? '' : key); setPage(1); }}
                  >
                    <cfg.Icon width={12} height={12} />
                    {cfg.label}
                    <span className="chip-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="notif-search">
              <Search width={14} height={14} className="notif-search-icon" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Notification List */}
          <div className="notif-list">
            <div className="notif-list-header">
              <h3>
                {filterType ? (TYPE_CONFIG[filterType]?.label || filterType) : 'All Notifications'}
                {filterRead === '0' ? ' — Unread' : ''}
              </h3>
              <div className="notif-list-actions">
                {notifications.some(n => n.is_read) && (
                  <button className="notif-btn ghost" onClick={clearAllRead}>
                    <Archive width={14} height={14} /> Clear Read
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="notif-loading">
                <div className="notif-spinner" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Bell width={40} height={40} />
                </div>
                <h3>You're all caught up!</h3>
                <p>No notifications to display. New activity will appear here automatically.</p>
              </div>
            ) : (
              <>
                {Object.entries(groupedNotifications).map(([dateLabel, items]) => (
                  <div key={dateLabel} className="notif-date-group">
                    <div className="notif-date-label">
                      <span>{dateLabel}</span>
                      <span className="notif-date-count">{items.length}</span>
                    </div>
                    {items.map(notif => {
                      const cfg = getTypeConfig(notif.type);
                      const catBadge = CATEGORY_BADGES[notif.category] || CATEGORY_BADGES.info;
                      return (
                        <div
                          key={notif.id}
                          className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                          onClick={() => !notif.is_read && markRead(notif.id)}
                        >
                          <div className="notif-item-icon" style={{ background: cfg.bg, color: cfg.color }}>
                            <cfg.Icon width={18} height={18} />
                          </div>
                          <div className="notif-item-body">
                            <p className="notif-item-title">{notif.title}</p>
                            {notif.message && <p className="notif-item-message">{notif.message}</p>}
                            <div className="notif-item-meta">
                              <span className="notif-item-time">
                                <Clock width={11} height={11} />
                                {timeAgo(notif.created_at)}
                              </span>
                              <span className="notif-item-type-tag" style={{ background: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                              </span>
                              <span className="notif-item-badge" style={{ background: catBadge.bg, color: catBadge.color }}>
                                {notif.category || 'info'}
                              </span>
                            </div>
                          </div>
                          {!notif.is_read && <div className="notif-unread-dot" />}
                          <div className="notif-item-actions">
                            {!notif.is_read && (
                              <button className="notif-item-action" onClick={(e) => { e.stopPropagation(); markRead(notif.id); }} title="Mark as read">
                                <Check width={14} height={14} />
                              </button>
                            )}
                            <button className="notif-item-action delete" onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }} title="Dismiss">
                              <Xmark width={14} height={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="notif-pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = i + 1;
                      return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
                    })}
                    {totalPages > 7 && <span style={{ padding: '0 6px', color: '#adb5bd' }}>…</span>}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ═══════════ TAB: Reminders / Automation ═══════════ */}
      {activeTab === 'reminders' && (
        <>
          <div className="notif-section-intro">
            <RefreshDouble width={18} height={18} />
            <div>
              <h3>Automated Reminders</h3>
              <p>Configure automatic notifications for appointments, payments, birthdays, and more</p>
            </div>
          </div>

          {loadingReminders ? (
            <div className="notif-loading">
              <div className="notif-spinner" />
              <span>Loading automation rules...</span>
            </div>
          ) : (
            <div className="reminder-grid">
              {reminders.map(reminder => {
                const info = REMINDER_TYPE_INFO[reminder.reminder_type] || {};
                const RIcon = info.Icon || Clock;
                let channels = [];
                try { channels = typeof reminder.channels === 'string' ? JSON.parse(reminder.channels) : (reminder.channels || []); } catch (e) { channels = []; }

                return (
                  <div key={reminder.id} className={`reminder-card ${reminder.is_enabled ? '' : 'disabled'}`}>
                    <div className="reminder-card-header">
                      <div className="reminder-card-header-left">
                        <div className="reminder-icon" style={{ background: info.bg || '#f5f5f5', color: info.color || '#6c757d' }}>
                          <RIcon width={18} height={18} />
                        </div>
                        <div>
                          <h4>{info.label || reminder.reminder_type}</h4>
                          <p>{info.desc || ''}</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!reminder.is_enabled}
                          onChange={(e) => updateReminder(reminder.id, { is_enabled: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="reminder-card-body">
                      {reminder.reminder_type !== 'birthday' && reminder.reminder_type !== 'stock_low' && (
                        <div className="reminder-field">
                          <label>Hours Before</label>
                          <input
                            type="number"
                            value={reminder.hours_before || 0}
                            min={0}
                            onChange={(e) => updateReminder(reminder.id, { hours_before: Number(e.target.value) })}
                          />
                        </div>
                      )}
                      <div className="reminder-field">
                        <label>Channels</label>
                        <div className="reminder-channels">
                          {[
                            { key: 'in_app', label: 'In-App', Icon: Bell },
                            { key: 'email', label: 'Email', Icon: Mail },
                            { key: 'sms', label: 'SMS', Icon: SendDiagonal },
                          ].map(ch => (
                            <button
                              key={ch.key}
                              className={`channel-tag ${channels.includes(ch.key) ? 'active' : ''}`}
                              onClick={() => {
                                const updated = channels.includes(ch.key)
                                  ? channels.filter(c => c !== ch.key)
                                  : [...channels, ch.key];
                                updateReminder(reminder.id, { channels: updated });
                              }}
                            >
                              <ch.Icon width={12} height={12} />
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="reminder-field">
                        <label>Subject</label>
                        <input
                          type="text"
                          value={reminder.template_subject || ''}
                          onChange={(e) => updateReminder(reminder.id, { template_subject: e.target.value })}
                          placeholder="Reminder subject..."
                        />
                      </div>
                      <div className="reminder-field">
                        <label>Template</label>
                        <textarea
                          value={reminder.template_body || ''}
                          onChange={(e) => updateReminder(reminder.id, { template_body: e.target.value })}
                          placeholder="Use {name}, {service}, {date}, {time} as placeholders"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ TAB: Preferences ═══════════ */}
      {activeTab === 'preferences' && (
        <>
          {loadingPrefs ? (
            <div className="notif-loading">
              <div className="notif-spinner" />
              <span>Loading preferences...</span>
            </div>
          ) : preferences ? (
            <>
              <div className="pref-card">
                <div className="pref-card-header">
                  <Settings width={18} height={18} />
                  <h3>Delivery Channels</h3>
                </div>
                {[
                  { key: 'push_enabled', label: 'In-App Notifications', desc: 'Receive notifications inside the app', Icon: Bell },
                  { key: 'email_enabled', label: 'Email Notifications', desc: 'Get notified via email', Icon: Mail },
                  { key: 'sms_enabled', label: 'SMS Notifications', desc: 'Receive SMS alerts (requires setup)', Icon: SendDiagonal },
                ].map(item => (
                  <div className="pref-row" key={item.key}>
                    <div className="pref-row-left">
                      <item.Icon width={16} height={16} style={{ color: '#6c757d', flexShrink: 0 }} />
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={!!preferences[item.key]} onChange={(e) => updatePreference(item.key, e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pref-card">
                <div className="pref-card-header">
                  <Filter width={18} height={18} />
                  <h3>Notification Types</h3>
                </div>
                {[
                  { key: 'appointment_notifications', label: 'Appointments', desc: 'Bookings, reminders, check-ins', Icon: Calendar },
                  { key: 'payment_notifications', label: 'Payments & Invoices', desc: 'Payments received, invoices, overdue', Icon: CreditCard },
                  { key: 'promotion_notifications', label: 'Promotions & Deals', desc: 'New promotions, campaigns', Icon: Megaphone },
                  { key: 'review_notifications', label: 'Reviews & Ratings', desc: 'New reviews, responses', Icon: Star },
                  { key: 'inventory_notifications', label: 'Inventory Alerts', desc: 'Low stock, reorder reminders', Icon: Package },
                  { key: 'system_notifications', label: 'System Updates', desc: 'Feature updates, security notices', Icon: InfoCircle },
                ].map(item => (
                  <div className="pref-row" key={item.key}>
                    <div className="pref-row-left">
                      <item.Icon width={16} height={16} style={{ color: '#6c757d', flexShrink: 0 }} />
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={!!preferences[item.key]} onChange={(e) => updatePreference(item.key, e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pref-card">
                <div className="pref-card-header">
                  <Clock width={18} height={18} />
                  <h3>Quiet Hours</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6c757d', margin: '0 0 12px 0' }}>
                  Pause notifications during these hours
                </p>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="reminder-field" style={{ marginBottom: 0, flex: 1 }}>
                    <label>From</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start || '22:00'}
                      onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="reminder-field" style={{ marginBottom: 0, flex: 1 }}>
                    <label>To</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end || '08:00'}
                      onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="notif-empty">
              <div className="notif-empty-icon"><Settings width={36} height={36} /></div>
              <h3>No preferences found</h3>
              <p>Preferences will be created automatically.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
