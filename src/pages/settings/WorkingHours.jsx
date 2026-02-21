import { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Clock, Building2, CheckCircle2, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_WORKING_HOURS } from './settingsConstants';

// ─── Break-slots localStorage persistence ─────────────────────────────────────
const BREAK_KEY = 'beauty_crm_break_slots';
const DEFAULT_BREAKS = [
  { id: 'lunch', label: 'Lunch Break', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#fef3c7' },
];
function loadBreaks() {
  try { const s = localStorage.getItem(BREAK_KEY); return s ? JSON.parse(s) : DEFAULT_BREAKS; }
  catch (e) { return DEFAULT_BREAKS; }
}
function saveBreaks(slots) {
  try { localStorage.setItem(BREAK_KEY, JSON.stringify(slots)); } catch (e) { /* ignore */ }
}

const BREAK_COLORS = [
  { hex: '#fef3c7', name: 'Amber' },
  { hex: '#dcfce7', name: 'Green' },
  { hex: '#dbeafe', name: 'Blue' },
  { hex: '#f3e8ff', name: 'Purple' },
  { hex: '#ffe4e6', name: 'Rose' },
  { hex: '#e2e8f0', name: 'Slate' },
  { hex: '#fce7f3', name: 'Pink' },
  { hex: '#ecfdf5', name: 'Teal' },
];

const pad = n => String(n).padStart(2, '0');
function slotOptions() {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    opts.push({ h, m: 0,  label: `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}` });
    opts.push({ h, m: 30, label: `${h % 12 || 12}:30 ${h >= 12 ? 'PM' : 'AM'}` });
  }
  return opts;
}
const SLOT_OPTIONS = slotOptions();
function fmtBreakTime(h, m) {
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

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

  // ── Break times ──
  const [breakSlots, setBreakSlots]     = useState(() => loadBreaks());
  const [breakDirty, setBreakDirty]     = useState(false);
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [newBreak, setNewBreak]         = useState({ label: '', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#fef3c7' });
  const [editingBreak, setEditingBreak] = useState(null); // id of break being edited

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

  // ── Break time handlers ───────────────────────────────────────────────────
  const handleBreakChange = (id, field, value) => {
    setBreakSlots(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    setBreakDirty(true);
  };

  const handleAddBreak = () => {
    if (!newBreak.label.trim()) return;
    const slot = { ...newBreak, id: `break-${Date.now()}`, label: newBreak.label.trim() };
    const updated = [...breakSlots, slot];
    setBreakSlots(updated);
    saveBreaks(updated);
    setNewBreak({ label: '', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#fef3c7' });
    setShowAddBreak(false);
    setBreakDirty(false);
  };

  const handleRemoveBreak = (id) => {
    const updated = breakSlots.filter(b => b.id !== id);
    setBreakSlots(updated);
    saveBreaks(updated);
    setBreakDirty(false);
  };

  const handleSaveBreaks = () => {
    // Commit any in-line edits
    saveBreaks(breakSlots);
    setBreakDirty(false);
    setEditingBreak(null);
  };
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

      {/* ── Break Times ────────────────────────────────────────────────── */}
      <div className="wh-section-divider" />
      <div className="wh-break-header">
        <div className="wh-header-text">
          <h2 className="wh-title">
            <Clock size={20} />
            Break Times
          </h2>
          <p className="wh-subtitle">
            Configure regular breaks (lunch, prayers, etc.). These are shown as blocked slots in the appointment calendar.
          </p>
        </div>
        <div className="wh-header-actions">
          {breakDirty && (
            <button className="stn-btn-primary" onClick={handleSaveBreaks}>
              <Save size={14} /> Save breaks
            </button>
          )}
          <button className="stn-btn-outline" onClick={() => { setShowAddBreak(s => !s); setNewBreak({ label: '', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#fef3c7' }); }}>
            <Plus size={14} /> Add break
          </button>
        </div>
      </div>

      {/* Add break form */}
      {showAddBreak && (
        <div className="wh-break-form">
          <div className="wh-break-form-row">
            <div className="wh-break-field wh-break-field-label">
              <label>Break name</label>
              <input
                type="text"
                placeholder="e.g. Lunch Break, Prayer…"
                value={newBreak.label}
                onChange={e => setNewBreak(p => ({ ...p, label: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddBreak()}
                autoFocus
              />
            </div>
            <div className="wh-break-field">
              <label>Start</label>
              <select value={`${newBreak.startHour}:${newBreak.startMin}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setNewBreak(p => ({ ...p, startHour: h, startMin: m })); }}>
                {SLOT_OPTIONS.map(o => <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>)}
              </select>
            </div>
            <div className="wh-break-field">
              <label>End</label>
              <select value={`${newBreak.endHour}:${newBreak.endMin}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setNewBreak(p => ({ ...p, endHour: h, endMin: m })); }}>
                {SLOT_OPTIONS.map(o => <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>)}
              </select>
            </div>
            <div className="wh-break-field">
              <label>Highlight</label>
              <div className="wh-color-swatches">
                {BREAK_COLORS.map(c => (
                  <div
                    key={c.hex}
                    className={`wh-color-dot${newBreak.color === c.hex ? ' active' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    onClick={() => setNewBreak(p => ({ ...p, color: c.hex }))}
                  />
                ))}
              </div>
            </div>
            <div className="wh-break-field wh-break-actions">
              <button className="stn-btn-primary" onClick={handleAddBreak} disabled={!newBreak.label.trim()} style={{ marginTop: 22 }}>Add</button>
              <button className="stn-btn-outline" onClick={() => setShowAddBreak(false)} style={{ marginTop: 22 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Break list */}
      {breakSlots.length === 0 && !showAddBreak && (
        <div className="wh-no-breaks">
          <Clock size={22} style={{ opacity: 0.3 }} />
          <p>No break times configured. Click <strong>+ Add break</strong> to create one.</p>
        </div>
      )}

      {breakSlots.length > 0 && (
        <div className="wh-break-list">
          {breakSlots.map(slot => (
            <div key={slot.id} className={`wh-break-row${editingBreak === slot.id ? ' editing' : ''}`}>
              <div className="wh-break-color-bar" style={{ background: slot.color }} />
              {editingBreak === slot.id ? (
                /* Inline edit mode */
                <div className="wh-break-edit-inner">
                  <input
                    type="text"
                    className="wh-break-edit-name"
                    value={slot.label}
                    onChange={e => handleBreakChange(slot.id, 'label', e.target.value)}
                    autoFocus
                  />
                  <select value={`${slot.startHour}:${slot.startMin}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); handleBreakChange(slot.id, 'startHour', h); handleBreakChange(slot.id, 'startMin', m); }}>
                    {SLOT_OPTIONS.map(o => <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>)}
                  </select>
                  <span className="wh-break-sep">–</span>
                  <select value={`${slot.endHour}:${slot.endMin}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); handleBreakChange(slot.id, 'endHour', h); handleBreakChange(slot.id, 'endMin', m); }}>
                    {SLOT_OPTIONS.map(o => <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>)}
                  </select>
                  <div className="wh-color-swatches">
                    {BREAK_COLORS.map(c => (
                      <div key={c.hex} className={`wh-color-dot${slot.color === c.hex ? ' active' : ''}`} style={{ background: c.hex }} title={c.name} onClick={() => handleBreakChange(slot.id, 'color', c.hex)} />
                    ))}
                  </div>
                  <button className="stn-btn-primary wh-save-inline" onClick={() => { saveBreaks(breakSlots); setBreakDirty(false); setEditingBreak(null); }}>
                    <Save size={12} /> Save
                  </button>
                  <button className="stn-btn-outline wh-save-inline" onClick={() => { setEditingBreak(null); setBreakSlots(loadBreaks()); setBreakDirty(false); }}>
                    Cancel
                  </button>
                </div>
              ) : (
                /* Display mode */
                <div className="wh-break-info">
                  <span className="wh-break-name">{slot.label}</span>
                  <span className="wh-break-time">{fmtBreakTime(slot.startHour, slot.startMin)} – {fmtBreakTime(slot.endHour, slot.endMin)}</span>
                  <span className="wh-break-duration">
                    {(() => { const mins = (slot.endHour * 60 + slot.endMin) - (slot.startHour * 60 + slot.startMin); return mins > 0 ? `${mins} min` : ''; })()}
                  </span>
                </div>
              )}
              {editingBreak !== slot.id && (
                <div className="wh-break-row-actions">
                  <button className="wh-break-edit-btn" title="Edit" onClick={() => setEditingBreak(slot.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button className="wh-break-del-btn" title="Remove" onClick={() => handleRemoveBreak(slot.id)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
