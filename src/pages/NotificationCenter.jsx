import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, Search, Check, CheckCircle, Trash, Calendar, CreditCard,
  Mail, Star, Package, Clock, Settings, RefreshDouble, Eye, Archive,
  WarningTriangle, InfoCircle, Megaphone, Heart, User, BellNotification,
  Xmark, SendDiagonal, Filter
} from 'iconoir-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import SEO from '../components/SEO';
import './NotificationCenter.css';

const TYPE_ICONS = {
  appointment: Calendar,
  invoice: CreditCard,
  payment: CreditCard,
  reminder: Clock,
  system: InfoCircle,
  promotion: Megaphone,
  review: Star,
  inventory: Package,
  loyalty: Heart,
  general: Bell,
};

const TYPE_LABELS = {
  appointment: 'Appointments',
  invoice: 'Invoices',
  payment: 'Payments',
  reminder: 'Reminders',
  system: 'System',
  promotion: 'Promotions',
  review: 'Reviews',
  inventory: 'Inventory',
  loyalty: 'Loyalty',
  general: 'General',
};

const REMINDER_TYPE_INFO = {
  appointment_upcoming: { label: 'Upcoming Appointments', desc: 'Remind clients before their appointment', icon: Calendar, color: '#6366f1', bg: '#eef2ff' },
  appointment_followup: { label: 'Follow-up After Visit', desc: 'Send follow-up message after service', icon: Heart, color: '#ec4899', bg: '#fce7f3' },
  review_request: { label: 'Review Request', desc: 'Ask clients to leave a review', icon: Star, color: '#f59e0b', bg: '#fef3c7' },
  birthday: { label: 'Birthday Wishes', desc: 'Send birthday greetings & offers', icon: Heart, color: '#ef4444', bg: '#fef2f2' },
  inactive_client: { label: 'Win-back Inactive Clients', desc: 'Re-engage clients who haven\'t visited', icon: User, color: '#8b5cf6', bg: '#f5f3ff' },
  payment_due: { label: 'Payment Reminders', desc: 'Remind about unpaid invoices', icon: CreditCard, color: '#10b981', bg: '#ecfdf5' },
  membership_expiry: { label: 'Membership Expiry', desc: 'Alert before membership expires', icon: User, color: '#f2421b', bg: '#fff3ed' },
  package_expiry: { label: 'Package Expiry', desc: 'Notify before package expires', icon: Package, color: '#3b82f6', bg: '#eff6ff' },
  stock_low: { label: 'Low Stock Alerts', desc: 'Notify when product stock is low', icon: Package, color: '#22c55e', bg: '#f0fdf4' },
};

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
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
      if (statsRes.success) {
        setStats(statsRes.data || {});
      }
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

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setStats(prev => ({ ...prev, unread: 0 }));
      Swal.fire({ icon: 'success', title: 'Done!', text: 'All notifications marked as read', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const archiveNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      Swal.fire({ icon: 'success', title: 'Archived', timer: 1200, showConfirmButton: false });
    } catch (error) {
      console.error('Archive error:', error);
    }
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
      } catch (error) {
        console.error('Clear all error:', error);
      }
    }
  };

  const generateReminders = async () => {
    try {
      const res = await api.post('/notifications/generate-reminders');
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Reminders Generated', text: `Created ${res.generated || 0} new reminder notifications`, timer: 2000, showConfirmButton: false });
        if (activeTab === 'notifications') fetchNotifications();
      }
    } catch (error) {
      console.error('Generate reminders error:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to generate reminders' });
    }
  };

  const sendTestNotification = async () => {
    try {
      await api.post('/notifications/send-test');
      Swal.fire({ icon: 'success', title: 'Test Sent! 🔔', text: 'Check your notifications', timer: 1500, showConfirmButton: false });
      fetchNotifications();
    } catch (error) {
      console.error('Send test error:', error);
    }
  };

  const updateReminder = async (id, updates) => {
    try {
      await api.patch(`/notifications/reminders/${id}`, updates);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) {
      console.error('Update reminder error:', error);
    }
  };

  const updatePreference = async (key, value) => {
    try {
      await api.patch('/notifications/preferences', { [key]: value });
      setPreferences(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Update preference error:', error);
    }
  };

  const typeCountMap = useMemo(() => {
    const map = {};
    (stats.by_type || []).forEach(t => { map[t.type] = t.count; });
    return map;
  }, [stats.by_type]);

  const getIcon = (type) => {
    const Icon = TYPE_ICONS[type] || Bell;
    return <Icon width={18} height={18} />;
  };

  return (
    <div className="notif-page">
      <SEO page="notifications" />

      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-left">
          <h1>
            <BellNotification width={24} height={24} style={{ color: '#f2421b' }} />
            Notification Center
          </h1>
          <p>Stay updated with everything happening in your business</p>
        </div>
        <div className="notif-header-actions">
          <button className="notif-btn outline" onClick={sendTestNotification}>
            <SendDiagonal width={14} height={14} /> Test
          </button>
          <button className="notif-btn outline" onClick={generateReminders}>
            <RefreshDouble width={14} height={14} /> Generate Reminders
          </button>
          {stats.unread > 0 && (
            <button className="notif-btn primary" onClick={markAllRead}>
              <CheckCircle width={14} height={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="notif-stats">
        <div className="notif-stat-card">
          <div className="notif-stat-icon unread"><Bell width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{stats.unread || 0}</h3>
            <p>Unread</p>
          </div>
        </div>
        <div className="notif-stat-card">
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
        <div className="notif-stat-card">
          <div className="notif-stat-icon reminders"><Clock width={22} height={22} /></div>
          <div className="notif-stat-info">
            <h3>{reminders.filter(r => r.is_enabled).length || '—'}</h3>
            <p>Active Reminders</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-tab-bar">
        <button className={`notif-tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell width={16} height={16} /> Notifications
        </button>
        <button className={`notif-tab ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')}>
          <Clock width={16} height={16} /> Reminders
        </button>
        <button className={`notif-tab ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
          <Settings width={16} height={16} /> Preferences
        </button>
      </div>

      {/* ═══════════ TAB: Notifications ═══════════ */}
      {activeTab === 'notifications' && (
        <>
          {/* Filters */}
          <div className="notif-filters">
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
              Unread
              <span className="chip-count">{stats.unread || 0}</span>
            </button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const count = typeCountMap[key] || 0;
              if (!count && filterType !== key) return null;
              return (
                <button
                  key={key}
                  className={`notif-filter-chip ${filterType === key ? 'active' : ''}`}
                  onClick={() => { setFilterType(filterType === key ? '' : key); setPage(1); }}
                >
                  {label}
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}

            <div className="notif-search">
              <Search className="notif-search-icon" width={14} height={14} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* List */}
          <div className="notif-list">
            <div className="notif-list-header">
              <h3>
                {filterType ? TYPE_LABELS[filterType] : 'All Notifications'}
                {filterRead === '0' ? ' (Unread)' : ''}
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
                <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Bell width={36} height={36} />
                </div>
                <h3>You're all caught up!</h3>
                <p>No notifications to display. Check back later.</p>
              </div>
            ) : (
              <>
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                    onClick={() => !notif.is_read && markRead(notif.id)}
                  >
                    <div className={`notif-item-icon ${notif.type || 'general'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="notif-item-body">
                      <p className="notif-item-title">{notif.title}</p>
                      <p className="notif-item-message">{notif.message}</p>
                      <div className="notif-item-meta">
                        <span className="notif-item-time">
                          <Clock width={11} height={11} />
                          {timeAgo(notif.created_at)}
                        </span>
                        <span className={`notif-item-badge ${notif.category || 'info'}`}>
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
                      <button className="notif-item-action delete" onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }} title="Archive">
                        <Xmark width={14} height={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="notif-pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                      <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ═══════════ TAB: Reminders ═══════════ */}
      {activeTab === 'reminders' && (
        <>
          {loadingReminders ? (
            <div className="notif-loading">
              <div className="notif-spinner" />
              <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Loading reminder settings...</span>
            </div>
          ) : (
            <div className="reminder-grid">
              {reminders.map(reminder => {
                const info = REMINDER_TYPE_INFO[reminder.reminder_type] || {};
                const Icon = info.icon || Clock;
                let channels = [];
                try { channels = typeof reminder.channels === 'string' ? JSON.parse(reminder.channels) : (reminder.channels || []); } catch (e) { channels = []; }

                return (
                  <div key={reminder.id} className="reminder-card">
                    <div className="reminder-card-header">
                      <div className="reminder-card-header-left">
                        <div className="reminder-icon" style={{ background: info.bg || '#f5f5f5', color: info.color || '#6c757d' }}>
                          <Icon width={18} height={18} />
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
                          {['in_app', 'email', 'sms', 'whatsapp'].map(ch => (
                            <button
                              key={ch}
                              className={`channel-tag ${channels.includes(ch) ? 'active' : ''}`}
                              onClick={() => {
                                const updated = channels.includes(ch)
                                  ? channels.filter(c => c !== ch)
                                  : [...channels, ch];
                                updateReminder(reminder.id, { channels: updated });
                              }}
                            >
                              {ch === 'in_app' ? '🔔 In-App' : ch === 'email' ? '📧 Email' : ch === 'sms' ? '📱 SMS' : '💬 WhatsApp'}
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
                          placeholder="Message template... Use {name}, {service}, {date}, {time} as placeholders"
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
              <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Loading preferences...</span>
            </div>
          ) : preferences ? (
            <>
              <div className="pref-card">
                <h3>Delivery Channels</h3>
                {[
                  { key: 'push_enabled', label: 'In-App Notifications', desc: 'Receive notifications inside the app' },
                  { key: 'email_enabled', label: 'Email Notifications', desc: 'Get notified via email' },
                  { key: 'sms_enabled', label: 'SMS Notifications', desc: 'Receive SMS alerts' },
                ].map(item => (
                  <div className="pref-row" key={item.key}>
                    <div className="pref-row-left">
                      <h4>{item.label}</h4>
                      <p>{item.desc}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!!preferences[item.key]}
                        onChange={(e) => updatePreference(item.key, e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pref-card">
                <h3>Notification Types</h3>
                {[
                  { key: 'appointment_notifications', label: 'Appointments', desc: 'Booking confirmations, reminders, and updates' },
                  { key: 'payment_notifications', label: 'Payments & Invoices', desc: 'Payment received, invoice generated, overdue' },
                  { key: 'promotion_notifications', label: 'Promotions & Deals', desc: 'New promotions, discount codes, campaigns' },
                  { key: 'review_notifications', label: 'Reviews & Ratings', desc: 'New reviews, responses, rating changes' },
                  { key: 'inventory_notifications', label: 'Inventory Alerts', desc: 'Low stock, out of stock, reorder reminders' },
                  { key: 'system_notifications', label: 'System Updates', desc: 'Feature updates, maintenance notices, security' },
                ].map(item => (
                  <div className="pref-row" key={item.key}>
                    <div className="pref-row-left">
                      <h4>{item.label}</h4>
                      <p>{item.desc}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!!preferences[item.key]}
                        onChange={(e) => updatePreference(item.key, e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pref-card">
                <h3>Quiet Hours</h3>
                <p style={{ fontSize: '0.82rem', color: '#6c757d', marginBottom: '12px' }}>
                  Don't send notifications during these hours
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
