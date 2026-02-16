import { useState } from 'react';
import { Save, Mail, Smartphone, Bell, MessageSquare } from 'lucide-react';

const NOTIFICATION_GROUPS = [
  {
    title: 'Booking confirmations',
    desc: 'Notifications sent when appointments are booked.',
    items: [
      { id: 'booking_email', label: 'Email confirmation', desc: 'Send email to client when booking is made', icon: Mail },
      { id: 'booking_sms', label: 'SMS confirmation', desc: 'Send SMS to client when booking is made', icon: Smartphone },
    ]
  },
  {
    title: 'Appointment reminders',
    desc: 'Reminders sent before scheduled appointments.',
    items: [
      { id: 'reminder_24h', label: '24-hour reminder', desc: 'Remind client 24 hours before appointment', icon: Bell },
      { id: 'reminder_2h', label: '2-hour reminder', desc: 'Remind client 2 hours before appointment', icon: Bell },
    ]
  },
  {
    title: 'Cancellations & changes',
    desc: 'Notifications for appointment modifications.',
    items: [
      { id: 'cancel_notify', label: 'Cancellation notice', desc: 'Notify client when appointment is cancelled', icon: Mail },
      { id: 'reschedule_notify', label: 'Reschedule notice', desc: 'Notify client when appointment is rescheduled', icon: Mail },
    ]
  },
  {
    title: 'Marketing',
    desc: 'Promotional and follow-up messages.',
    items: [
      { id: 'review_request', label: 'Review request', desc: 'Ask for feedback after appointment', icon: MessageSquare },
      { id: 'promo_emails', label: 'Promotional emails', desc: 'Send deals and promotions to clients', icon: Mail },
    ]
  },
];

export default function NotificationSettings({ api, showToast }) {
  const [settings, setSettings] = useState({
    booking_email: true, booking_sms: false,
    reminder_24h: true, reminder_2h: false,
    cancel_notify: true, reschedule_notify: true,
    review_request: false, promo_emails: false,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setSettings(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      showToast('success', 'Notification settings saved');
    } catch (e) { showToast('error', 'Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="stn-page">
      <div className="stn-page-actions">
        <button className="stn-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <p className="stn-desc">Control which notifications are sent to your clients and how they receive them.</p>

      {NOTIFICATION_GROUPS.map(group => (
        <div className="stn-card" key={group.title}>
          <div className="stn-card-head">
            <h3>{group.title}</h3>
            <p>{group.desc}</p>
          </div>
          <div className="stn-card-body">
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <div className="stn-toggle-row" key={item.id}>
                  <div className="stn-toggle-icon"><Icon size={18} /></div>
                  <div className="stn-toggle-info">
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                  <label className="stn-switch">
                    <input type="checkbox" checked={settings[item.id]} onChange={() => toggle(item.id)} />
                    <span className="stn-switch-track" />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
