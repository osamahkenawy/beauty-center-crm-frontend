import { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Clock, Building2, CheckCircle2, RotateCcw } from 'lucide-react';
import { DEFAULT_WORKING_HOURS } from './settingsConstants';

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_FULL = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday',
  wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday'
};

/** Merge saved hours with defaults so all 7 days always exist */
function mergeHours(raw) {
  if (!raw) return { ...DEFAULT_WORKING_HOURS };
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const merged = {};
  for (const day of DAY_ORDER) {
    merged[day] = parsed[day]
      ? { ...parsed[day], isOpen: !!parsed[day].isOpen }
      : (DEFAULT_WORKING_HOURS[day] || { open: '09:00', close: '22:00', isOpen: false });
  }
  return merged;
}

export default function WorkingHours({ branches, fetchBranches, api, showToast }) {
  // Default to HQ branch or first branch
  const defaultBranchId = useMemo(() => {
    if (!branches.length) return '';
    const hq = branches.find(b => b.is_headquarters);
    return String((hq || branches[0]).id);
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [hours, setHours] = useState(() => mergeHours(null));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Set default branch when branches load
  useEffect(() => {
    if (defaultBranchId && !selectedBranch) {
      setSelectedBranch(defaultBranchId);
    }
  }, [defaultBranchId, selectedBranch]);

  // Load hours when branch selection changes
  const loadBranchHours = useCallback(() => {
    if (!selectedBranch || !branches.length) return;
    const branch = branches.find(b => String(b.id) === selectedBranch);
    if (branch) {
      setHours(mergeHours(branch.working_hours));
      setDirty(false);
    }
  }, [selectedBranch, branches]);

  useEffect(() => {
    loadBranchHours();
  }, [loadBranchHours]);

  const handleBranchChange = (e) => {
    if (dirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedBranch(e.target.value);
  };

  const handleChange = (day, field, value) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
    setDirty(true);
  };

  const handleReset = () => {
    loadBranchHours();
    setDirty(false);
  };

  const handleSave = async () => {
    if (!selectedBranch) {
      showToast('error', 'Please select a branch');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/branches/${selectedBranch}`, {
        working_hours: JSON.stringify(hours)
      });
      if (res.success) {
        showToast('success', 'Working hours saved successfully');
        setDirty(false);
        setLastSaved(new Date());
        if (fetchBranches) fetchBranches(); // Refresh branch data so other pages stay in sync
      } else {
        showToast('error', res.message || 'Failed to save');
      }
    } catch (e) {
      showToast('error', 'Failed to save working hours');
    }
    setSaving(false);
  };

  // Copy hours to all branches
  const handleCopyToAll = async () => {
    if (!window.confirm('Copy these working hours to ALL branches?')) return;
    setSaving(true);
    try {
      let success = 0;
      for (const b of branches) {
        const res = await api.patch(`/branches/${b.id}`, {
          working_hours: JSON.stringify(hours)
        });
        if (res.success) success++;
      }
      showToast('success', `Hours applied to ${success}/${branches.length} branches`);
      setDirty(false);
      if (fetchBranches) fetchBranches();
    } catch (e) {
      showToast('error', 'Failed to copy hours');
    }
    setSaving(false);
  };

  const selectedBranchObj = branches.find(b => String(b.id) === selectedBranch);
  const today = DAY_ORDER[new Date().getDay()];

  // Count open days
  const openCount = DAY_ORDER.filter(d => hours[d]?.isOpen).length;

  return (
    <div className="stn-page">
      {/* Header */}
      <div className="wh-header">
        <div className="wh-header-text">
          <h2 className="wh-title">
            <Clock size={22} />
            Working Hours
          </h2>
          <p className="wh-subtitle">
            Set your regular opening hours for each location. These apply to online booking and staff availability.
          </p>
        </div>
        <div className="wh-header-actions">
          {dirty && (
            <button className="stn-btn-outline" onClick={handleReset} disabled={saving}>
              <RotateCcw size={13} /> Discard
            </button>
          )}
          <button className="stn-btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Branch Selector */}
      {branches.length > 0 && (
        <div className="wh-branch-bar">
          <div className="wh-branch-picker">
            <Building2 size={16} />
            <select value={selectedBranch} onChange={handleBranchChange}>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.is_headquarters ? '(HQ)' : ''}
                </option>
              ))}
            </select>
          </div>

          {branches.length > 1 && (
            <button className="wh-copy-btn" onClick={handleCopyToAll} disabled={saving} title="Apply to all branches">
              Copy to all branches
            </button>
          )}

          {/* Status summary */}
          <div className="wh-summary">
            <span className="wh-summary-pill open">{openCount} open</span>
            <span className="wh-summary-pill closed">{7 - openCount} closed</span>
          </div>
        </div>
      )}

      {branches.length === 0 && (
        <div className="wh-no-branches">
          <Building2 size={24} />
          <p>Add a location first to manage working hours.</p>
        </div>
      )}

      {/* Schedule Grid */}
      {selectedBranch && (
        <div className="wh-grid">
          <div className="wh-grid-header">
            <span>Day</span>
            <span>Status</span>
            <span>Opening</span>
            <span></span>
            <span>Closing</span>
          </div>

          {DAY_ORDER.map(day => {
            const cfg = hours[day] || { open: '09:00', close: '22:00', isOpen: false };
            const isToday = day === today;

            return (
              <div className={`wh-row ${cfg.isOpen ? 'open' : 'off'} ${isToday ? 'today' : ''}`} key={day}>
                <div className="wh-row-day">
                  <span className="wh-dot" />
                  <span className="wh-day-name">{DAY_FULL[day]}</span>
                  {isToday && <span className="wh-today-tag">Today</span>}
                </div>
                <div className="wh-row-toggle">
                  <label className="stn-switch small">
                    <input
                      type="checkbox"
                      checked={cfg.isOpen}
                      onChange={e => handleChange(day, 'isOpen', e.target.checked)}
                    />
                    <span className="stn-switch-track" />
                  </label>
                </div>
                {cfg.isOpen ? (
                  <>
                    <div className="wh-row-time">
                      <input
                        type="time"
                        value={cfg.open}
                        onChange={e => handleChange(day, 'open', e.target.value)}
                      />
                    </div>
                    <div className="wh-row-sep">–</div>
                    <div className="wh-row-time">
                      <input
                        type="time"
                        value={cfg.close}
                        onChange={e => handleChange(day, 'close', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="wh-row-closed" style={{ gridColumn: 'span 3' }}>
                    Closed all day
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Last saved hint */}
      {lastSaved && !dirty && (
        <div className="wh-saved-hint">
          <CheckCircle2 size={13} />
          Last saved {lastSaved.toLocaleTimeString()}
          {selectedBranchObj ? ` for ${selectedBranchObj.name}` : ''}
        </div>
      )}
    </div>
  );
}
