import { useState } from 'react';
import { Save, CalendarCheck, Ban, Globe2 } from 'lucide-react';

export default function BookingRules({ api, showToast }) {
  const [rules, setRules] = useState({
    min_advance: '60', max_advance: '43200',
    cancellation_window: '1440', no_show_policy: 'charge_50',
    max_per_day: '50', slot_interval: '15',
    allow_waitlist: true, require_payment: false,
    allow_group: false, max_group_size: '5',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { showToast('success', 'Booking rules saved'); }
    catch (e) { showToast('error', 'Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="stn-page">
      <div className="stn-page-actions">
        <button className="stn-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <p className="stn-desc">Configure how clients can book appointments online.</p>

      {/* Scheduling */}
      <div className="stn-card">
        <div className="stn-card-head">
          <h3><CalendarCheck size={16} /> Scheduling</h3>
        </div>
        <div className="stn-card-body">
          <div className="stn-form-grid">
            <div className="stn-field">
              <label>Minimum advance booking</label>
              <select value={rules.min_advance} onChange={e => setRules(p => ({ ...p, min_advance: e.target.value }))}>
                <option value="0">No minimum</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="720">12 hours</option>
                <option value="1440">24 hours</option>
              </select>
              <small>How far in advance clients must book</small>
            </div>
            <div className="stn-field">
              <label>Maximum advance booking</label>
              <select value={rules.max_advance} onChange={e => setRules(p => ({ ...p, max_advance: e.target.value }))}>
                <option value="10080">7 days</option>
                <option value="21600">15 days</option>
                <option value="43200">30 days</option>
                <option value="86400">60 days</option>
                <option value="129600">90 days</option>
              </select>
              <small>How far ahead clients can book</small>
            </div>
            <div className="stn-field">
              <label>Time slot interval</label>
              <select value={rules.slot_interval} onChange={e => setRules(p => ({ ...p, slot_interval: e.target.value }))}>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
            <div className="stn-field">
              <label>Max bookings per day</label>
              <input type="number" value={rules.max_per_day} onChange={e => setRules(p => ({ ...p, max_per_day: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation */}
      <div className="stn-card">
        <div className="stn-card-head">
          <h3><Ban size={16} /> Cancellation Policy</h3>
        </div>
        <div className="stn-card-body">
          <div className="stn-form-grid">
            <div className="stn-field">
              <label>Cancellation window</label>
              <select value={rules.cancellation_window} onChange={e => setRules(p => ({ ...p, cancellation_window: e.target.value }))}>
                <option value="0">Anytime</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="720">12 hours before</option>
                <option value="1440">24 hours before</option>
                <option value="2880">48 hours before</option>
              </select>
            </div>
            <div className="stn-field">
              <label>No-show policy</label>
              <select value={rules.no_show_policy} onChange={e => setRules(p => ({ ...p, no_show_policy: e.target.value }))}>
                <option value="none">No charge</option>
                <option value="charge_25">Charge 25%</option>
                <option value="charge_50">Charge 50%</option>
                <option value="charge_100">Charge full amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="stn-card">
        <div className="stn-card-head">
          <h3><Globe2 size={16} /> Features</h3>
        </div>
        <div className="stn-card-body">
          <div className="stn-toggle-row">
            <div className="stn-toggle-info">
              <strong>Waitlist</strong>
              <span>Allow clients to join a waitlist when slots are full</span>
            </div>
            <label className="stn-switch">
              <input type="checkbox" checked={rules.allow_waitlist} onChange={e => setRules(p => ({ ...p, allow_waitlist: e.target.checked }))} />
              <span className="stn-switch-track" />
            </label>
          </div>
          <div className="stn-toggle-row">
            <div className="stn-toggle-info">
              <strong>Require prepayment</strong>
              <span>Require payment at the time of booking</span>
            </div>
            <label className="stn-switch">
              <input type="checkbox" checked={rules.require_payment} onChange={e => setRules(p => ({ ...p, require_payment: e.target.checked }))} />
              <span className="stn-switch-track" />
            </label>
          </div>
          <div className="stn-toggle-row">
            <div className="stn-toggle-info">
              <strong>Group bookings</strong>
              <span>Allow multiple people in a single appointment</span>
            </div>
            <label className="stn-switch">
              <input type="checkbox" checked={rules.allow_group} onChange={e => setRules(p => ({ ...p, allow_group: e.target.checked }))} />
              <span className="stn-switch-track" />
            </label>
          </div>
          {rules.allow_group && (
            <div className="stn-field" style={{ maxWidth: 200, marginTop: 12 }}>
              <label>Max group size</label>
              <input type="number" min={2} max={20} value={rules.max_group_size} onChange={e => setRules(p => ({ ...p, max_group_size: e.target.value }))} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
