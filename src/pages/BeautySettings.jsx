import { useState } from 'react';
import './BeautySettings.css';

export default function BeautySettings() {
  const [activeTab, setActiveTab] = useState('business');
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Glamour Beauty Center',
    email: 'contact@glamourbeauty.com',
    phone: '+966 50 123 4567',
    address: 'King Fahd Road, Riyadh, Saudi Arabia',
    description: 'Premium beauty and wellness services for all your needs.',
    currency: 'SAR',
    timezone: 'Asia/Riyadh'
  });

  const [workingHours, setWorkingHours] = useState({
    saturday: { open: '09:00', close: '22:00', isOpen: true },
    sunday: { open: '09:00', close: '22:00', isOpen: true },
    monday: { open: '09:00', close: '22:00', isOpen: true },
    tuesday: { open: '09:00', close: '22:00', isOpen: true },
    wednesday: { open: '09:00', close: '22:00', isOpen: true },
    thursday: { open: '09:00', close: '22:00', isOpen: true },
    friday: { open: '14:00', close: '22:00', isOpen: true }
  });

  const [notifications, setNotifications] = useState({
    emailBookings: true,
    smsBookings: true,
    emailReminders: true,
    smsReminders: false,
    emailMarketing: false,
    smsMarketing: false
  });

  const handleBusinessChange = (field, value) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleNotificationChange = (field) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="beauty-settings-page">
      {/* Tabs */}
      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          🏪 Business Info
        </button>
        <button 
          className={`tab ${activeTab === 'hours' ? 'active' : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          🕐 Working Hours
        </button>
        <button 
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button 
          className={`tab ${activeTab === 'booking' ? 'active' : ''}`}
          onClick={() => setActiveTab('booking')}
        >
          📅 Booking Rules
        </button>
      </div>

      {/* Business Info Tab */}
      {activeTab === 'business' && (
        <div className="settings-card">
          <div className="card-header">
            <h3>Business Information</h3>
            <p>Manage your salon's basic information</p>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Business Name</label>
                <input 
                  type="text" 
                  value={businessInfo.name}
                  onChange={(e) => handleBusinessChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={businessInfo.email}
                  onChange={(e) => handleBusinessChange('email', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  type="tel" 
                  value={businessInfo.phone}
                  onChange={(e) => handleBusinessChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select 
                  value={businessInfo.currency}
                  onChange={(e) => handleBusinessChange('currency', e.target.value)}
                >
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <input 
                  type="text" 
                  value={businessInfo.address}
                  onChange={(e) => handleBusinessChange('address', e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea 
                  rows={3}
                  value={businessInfo.description}
                  onChange={(e) => handleBusinessChange('description', e.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-save">💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours Tab */}
      {activeTab === 'hours' && (
        <div className="settings-card">
          <div className="card-header">
            <h3>Working Hours</h3>
            <p>Set your salon's operating hours</p>
          </div>
          <div className="card-body">
            <div className="hours-list">
              {Object.entries(workingHours).map(([day, hours]) => (
                <div key={day} className="hours-row">
                  <div className="day-toggle">
                    <input 
                      type="checkbox" 
                      id={`toggle-${day}`}
                      checked={hours.isOpen}
                      onChange={(e) => handleHoursChange(day, 'isOpen', e.target.checked)}
                    />
                    <label htmlFor={`toggle-${day}`} className="day-name">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </label>
                  </div>
                  {hours.isOpen ? (
                    <div className="hours-inputs">
                      <input 
                        type="time" 
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      />
                      <span>to</span>
                      <input 
                        type="time" 
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="closed-badge">Closed</span>
                  )}
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn-save">💾 Save Hours</button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="settings-card">
          <div className="card-header">
            <h3>Notification Preferences</h3>
            <p>Control how you receive notifications</p>
          </div>
          <div className="card-body">
            <div className="notifications-section">
              <h4>Booking Notifications</h4>
              <div className="notification-row">
                <div className="notification-info">
                  <span className="notification-title">Email for new bookings</span>
                  <span className="notification-desc">Receive email when a new appointment is booked</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.emailBookings}
                    onChange={() => handleNotificationChange('emailBookings')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-row">
                <div className="notification-info">
                  <span className="notification-title">SMS for new bookings</span>
                  <span className="notification-desc">Receive SMS when a new appointment is booked</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.smsBookings}
                    onChange={() => handleNotificationChange('smsBookings')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="notifications-section">
              <h4>Reminder Notifications</h4>
              <div className="notification-row">
                <div className="notification-info">
                  <span className="notification-title">Email reminders</span>
                  <span className="notification-desc">Send email reminders to clients before appointments</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.emailReminders}
                    onChange={() => handleNotificationChange('emailReminders')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-row">
                <div className="notification-info">
                  <span className="notification-title">SMS reminders</span>
                  <span className="notification-desc">Send SMS reminders to clients before appointments</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.smsReminders}
                    onChange={() => handleNotificationChange('smsReminders')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-save">💾 Save Preferences</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Rules Tab */}
      {activeTab === 'booking' && (
        <div className="settings-card">
          <div className="card-header">
            <h3>Booking Rules</h3>
            <p>Configure appointment booking settings</p>
          </div>
          <div className="card-body">
            <div className="rules-grid">
              <div className="rule-card">
                <div className="rule-icon">⏰</div>
                <h4>Advance Booking</h4>
                <p>How far in advance can clients book?</p>
                <select defaultValue="30">
                  <option value="7">1 Week</option>
                  <option value="14">2 Weeks</option>
                  <option value="30">1 Month</option>
                  <option value="60">2 Months</option>
                </select>
              </div>
              <div className="rule-card">
                <div className="rule-icon">⚡</div>
                <h4>Minimum Notice</h4>
                <p>Minimum notice required for booking</p>
                <select defaultValue="2">
                  <option value="0">No minimum</option>
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>
              <div className="rule-card">
                <div className="rule-icon">❌</div>
                <h4>Cancellation Policy</h4>
                <p>How far in advance can clients cancel?</p>
                <select defaultValue="24">
                  <option value="0">Anytime</option>
                  <option value="2">2 Hours before</option>
                  <option value="24">24 Hours before</option>
                  <option value="48">48 Hours before</option>
                </select>
              </div>
              <div className="rule-card">
                <div className="rule-icon">📱</div>
                <h4>Online Booking</h4>
                <p>Allow clients to book online</p>
                <select defaultValue="yes">
                  <option value="yes">Enabled</option>
                  <option value="no">Disabled</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-save">💾 Save Rules</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
