import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import './AppointmentCalendar.css';

// ─── Palette & constants ──────────────────────────────────────────────────────
const SERVICE_PALETTE = [
  '#6366f1','#8b5cf6','#ec4899','#f97316','#eab308',
  '#22c55e','#14b8a6','#0ea5e9','#f43f5e','#a855f7',
  '#06b6d4','#10b981','#84cc16','#fb923c','#e879f9',
];

const STATUS_COLORS = {
  scheduled:   '#4CAF50',
  confirmed:   '#2196F3',
  in_progress: '#FF9800',
  completed:   '#9C27B0',
  cancelled:   '#F44336',
  no_show:     '#757575',
};

const STATUS_LABELS = {
  scheduled:   'Scheduled',
  confirmed:   'Confirmed',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  no_show:     'No Show',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_START = 7;
const DAY_END   = 21;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => i + DAY_START);

// ─── Utility helpers ──────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');

function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(m)} ${ampm}`;
}

function formatHour(h) {
  return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatHourMin(h, m) {
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function toDateKey(dt) {
  const d = new Date(dt);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth()    === db.getMonth()    &&
         da.getDate()     === db.getDate();
}

function shiftDate(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekDate(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(date) {
  const start = startOfWeekDate(date);
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => shiftDate(start, i));
}

function getServiceColor(serviceId, services) {
  if (!serviceId || !services?.length) return '#6c757d';
  const idx = services.findIndex(s => Number(s.id) === Number(serviceId));
  return idx >= 0 ? SERVICE_PALETTE[idx % SERVICE_PALETTE.length] : '#6c757d';
}

function getAptColor(apt, colorMode, services) {
  if (colorMode === 'service') return getServiceColor(apt.service_id, services);
  return STATUS_COLORS[apt.status] ?? '#6c757d';
}

// ─── iCal generator (RFC 5545) ────────────────────────────────────────────────
function fmtIcal(dt) {
  const d = new Date(dt);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T` +
         `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function buildICal(appointments) {
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//Beauty CRM//Appointment Calendar//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH',
  ];
  const now = fmtIcal(new Date());
  for (const a of appointments) {
    if (!a.start_time) continue;
    const name = [a.customer_first_name, a.customer_last_name].filter(Boolean).join(' ');
    const summary = name + (a.service_name ? ` – ${a.service_name}` : '');
    const icalStatus = a.status === 'confirmed' ? 'CONFIRMED' : a.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE';
    lines.push(
      'BEGIN:VEVENT',
      `UID:apt-${a.id}@beauty-crm`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmtIcal(a.start_time)}`,
      `DTEND:${fmtIcal(a.end_time || a.start_time)}`,
      `SUMMARY:${summary}`,
      `STATUS:${icalStatus}`,
      ...(a.notes ? [`DESCRIPTION:${a.notes.replace(/\n/g,'\\n').replace(/,/g,'\\,')}`] : []),
      ...(a.staff_name ? [`ORGANIZER;CN="${a.staff_name}":MAILTO:noreply@salon.com`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICal(appointments, filename) {
  const blob = new Blob([buildICal(appointments)], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename || 'appointments.ics';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
// ─── Break slots localStorage sync ────────────────────────────────────────────
const BREAK_KEY = 'beauty_crm_break_slots';
const DEFAULT_BLOCK_SLOTS = [
  { id: 'lunch', label: 'Lunch Break', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#fef3c7' },
];
function loadBlockSlots() {
  try { const s = localStorage.getItem(BREAK_KEY); return s ? JSON.parse(s) : DEFAULT_BLOCK_SLOTS; }
  catch (e) { return DEFAULT_BLOCK_SLOTS; }
}
function persistBlockSlots(slots) {
  try { localStorage.setItem(BREAK_KEY, JSON.stringify(slots)); } catch (e) { /* ignore */ }
}
// ─── Safe date parser ───────────────────────────────────────────────────────
function parseDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : new Date(val);
  if (typeof val === 'string') {
    // ISO date string like "2026-02-21" – append local midnight to avoid UTC shift
    const d = new Date(val.includes('T') ? val : val + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AppointmentCalendar({
  appointments  = [],
  selectedDate,
  onDateSelect,
  onAppointmentClick,
  onNewAppointment,
  onReschedule,
  staff         = [],
  services      = [],
}) {
  // ── View / navigation ──
  const [viewMode,    setViewMode]    = useState('month');
  const [currentDate, setCurrentDate] = useState(() => parseDate(selectedDate));
  const [expandedDay, setExpandedDay] = useState(null);

  // Sync currentDate when selectedDate prop changes (e.g. parent applies a date filter)
  useEffect(() => {
    if (selectedDate) {
      const d = parseDate(selectedDate);
      setCurrentDate(d);
    }
  }, [selectedDate]);


  // ── Filters ──
  const [showFilters,   setShowFilters]   = useState(false);
  const [filterStaff,   setFilterStaff]   = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterService, setFilterService] = useState('');
  const [colorMode,     setColorMode]     = useState('status');

  // ── Block time slots ──
  const [blockSlots,     setBlockSlots]     = useState(() => loadBlockSlots());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlock,       setNewBlock]       = useState({ label: 'Break', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#e2e8f0' });

  // Sync blockSlots with localStorage (Settings page may have updated them)
  useEffect(() => {
    const sync = () => setBlockSlots(loadBlockSlots());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // ── Drag state ──
  const dragRef = useRef(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // ─── Filtered appointments ────────────────────────────────────────────────
  const filtered = useMemo(() => appointments.filter(a => {
    if (filterStaff   && String(a.staff_id)   !== String(filterStaff))   return false;
    if (filterStatus  && a.status             !== filterStatus)           return false;
    if (filterService && String(a.service_id) !== String(filterService))  return false;
    return true;
  }), [appointments, filterStaff, filterStatus, filterService]);

  const activeFilterCount = [filterStaff, filterStatus, filterService].filter(Boolean).length;

  // ─── Time slots (7am–9pm, 30-min) ────────────────────────────────────────
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = DAY_START; h < DAY_END; h++) {
      slots.push({ hour: h, min: 0 });
      slots.push({ hour: h, min: 30 });
    }
    return slots;
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const navigate = useCallback(dir => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if      (viewMode === 'month')     d.setMonth(d.getMonth() + dir);
      else if (viewMode === 'week')      d.setDate(d.getDate() + dir * 7);
      else                               d.setDate(d.getDate() + dir);
      return d;
    });
  }, [viewMode]);

  const goToday = () => setCurrentDate(new Date());

  const goToDay = useCallback(day => {
    const d = day instanceof Date ? day : new Date(day);
    setCurrentDate(d);
    setViewMode('day');
    // Pass a YYYY-MM-DD string so the parent's fromDate state stays a string
    onDateSelect?.(toDateKey(d));
  }, [onDateSelect]);

  const navTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const days = getWeekDays(currentDate);
      return `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }, [currentDate, viewMode]);

  // ─── iCal export ──────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    let toExport = filtered;
    if (viewMode === 'month') {
      const y = currentDate.getFullYear(), m = currentDate.getMonth();
      toExport = filtered.filter(a => { const d = new Date(a.start_time); return d.getFullYear() === y && d.getMonth() === m; });
    } else if (viewMode === 'week') {
      const days = getWeekDays(currentDate);
      toExport = filtered.filter(a => { const d = new Date(a.start_time); return d >= days[0] && d <= shiftDate(days[6], 1); });
    } else {
      toExport = filtered.filter(a => sameDay(new Date(a.start_time), currentDate));
    }
    downloadICal(toExport, `appointments-${toDateKey(currentDate)}.ics`);
  }, [filtered, viewMode, currentDate]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, apt) => {
    const start = new Date(apt.start_time);
    const end   = new Date(apt.end_time || start.getTime() + 3600000);
    dragRef.current = { aptId: apt.id, durationMs: end - start };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(apt.id));
  }, []);

  const handleDragOver = useCallback((e, slotKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotKey);
  }, []);

  const handleDragLeave = useCallback(() => setDragOverSlot(null), []);

  const handleDrop = useCallback((e, targetDate, targetHour, targetMin = 0) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!dragRef.current || !onReschedule) return;
    const { aptId, durationMs } = dragRef.current;
    const newStart = new Date(targetDate);
    newStart.setHours(targetHour, targetMin, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);
    onReschedule(aptId, newStart.toISOString(), newEnd.toISOString());
    dragRef.current = null;
  }, [onReschedule]);

  // ─── Block helpers ────────────────────────────────────────────────────────
  const isSlotBlocked = useCallback((hour, min) => {
    const t = hour * 60 + min;
    return blockSlots.some(b => t >= b.startHour * 60 + b.startMin && t < b.endHour * 60 + b.endMin);
  }, [blockSlots]);

  const getBlockForSlot = useCallback((hour, min) => {
    const t = hour * 60 + min;
    return blockSlots.find(b => t >= b.startHour * 60 + b.startMin && t < b.endHour * 60 + b.endMin) || null;
  }, [blockSlots]);

  const addBlock = useCallback(() => {
    setBlockSlots(prev => {
      const updated = [...prev, { ...newBlock, id: `block-${Date.now()}` }];
      persistBlockSlots(updated);
      return updated;
    });
    setShowBlockModal(false);
    setNewBlock({ label: 'Break', startHour: 12, startMin: 0, endHour: 13, endMin: 0, color: '#e2e8f0' });
  }, [newBlock]);

  const removeBlock = useCallback(id => {
    setBlockSlots(prev => {
      const updated = prev.filter(b => b.id !== id);
      persistBlockSlots(updated);
      return updated;
    });
  }, []);

  // ─── MONTH VIEW ───────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const grid  = getMonthGrid(year, month);

    const byDay = {};
    for (const apt of filtered) {
      if (!apt.start_time) continue;
      const key = toDateKey(apt.start_time);
      (byDay[key] = byDay[key] || []).push(apt);
    }
    Object.values(byDay).forEach(arr =>
      arr.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    );

    return (
      <div className="acal-month">
        <div className="acal-weekdays">
          {WEEKDAYS.map(d => <div key={d} className="acal-weekday">{d}</div>)}
        </div>
        <div className="acal-month-grid">
          {grid.map((day, i) => {
            const key     = toDateKey(day);
            const dayApts = byDay[key] || [];
            const overflow = Math.max(0, dayApts.length - 3);
            const visible  = dayApts.slice(0, 3);
            const slotKey  = `${key}_9_0`;
            return (
              <div
                key={i}
                className={[
                  'acal-month-day',
                  day.getMonth() !== month  ? 'other-month' : '',
                  sameDay(day, today)       ? 'today'       : '',
                  sameDay(day, currentDate) ? 'selected'    : '',
                  dayApts.length > 0        ? 'has-apts'    : '',
                  dragOverSlot === slotKey  ? 'drag-target' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => goToDay(day)}
                onDragOver={e => handleDragOver(e, slotKey)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, day, 9, 0)}
              >
                <span className="acal-day-num">{day.getDate()}</span>
                <div className="acal-day-apts">
                  {visible.map(apt => (
                    <div
                      key={apt.id}
                      className={`acal-apt-pill${apt.status === 'cancelled' ? ' cancelled' : ''}`}
                      style={{ background: getAptColor(apt, colorMode, services) }}
                      draggable
                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, apt); }}
                      onClick={e => { e.stopPropagation(); onAppointmentClick?.(apt); }}
                      title={`${formatTime(apt.start_time)} · ${apt.customer_first_name} ${apt.customer_last_name || ''} · ${apt.service_name || ''}`}
                    >
                      <span className="pill-time">{formatTime(apt.start_time)}</span>
                      <span className="pill-name">{apt.customer_first_name}</span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="acal-more-pill" onClick={e => { e.stopPropagation(); setExpandedDay({ day, apts: dayApts }); }}>
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── WEEK VIEW ────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const today    = new Date();
    return (
      <div className="acal-week">
        <div className="acal-week-head">
          <div className="acal-gutter" />
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`acal-week-col-head${sameDay(day, today) ? ' today' : ''}${sameDay(day, currentDate) ? ' selected' : ''}`}
              onClick={() => goToDay(day)}
            >
              <span className="wh-wd">{day.toLocaleDateString('en-US',{weekday:'short'})}</span>
              <span className="wh-dn">{day.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="acal-week-body">
          {HOURS.map(hour => (
            <div key={hour} className="acal-week-row">
              <div className="acal-gutter"><span>{formatHour(hour)}</span></div>
              {weekDays.map((day, di) => {
                const dayApts   = filtered.filter(a => a.start_time && sameDay(new Date(a.start_time), day) && new Date(a.start_time).getHours() === hour);
                const blocked   = isSlotBlocked(hour, 0);
                const blockInfo = blocked ? getBlockForSlot(hour, 0) : null;
                const slotKey   = `${toDateKey(day)}_${hour}_0`;
                return (
                  <div
                    key={di}
                    className={['acal-week-cell', blocked ? 'blocked' : '', dragOverSlot === slotKey ? 'drag-target' : ''].filter(Boolean).join(' ')}
                    style={blocked && blockInfo ? { background: blockInfo.color } : {}}
                    onDragOver={e => handleDragOver(e, slotKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, day, hour, 0)}
                    onClick={() => { if (!dayApts.length && !blocked) onNewAppointment?.(day); }}
                  >
                    {blocked && blockInfo && <div className="acal-block-stripe">{blockInfo.label}</div>}
                    {dayApts.map(apt => {
                      const aptColor = getAptColor(apt, colorMode, services);
                      return (
                        <div
                          key={apt.id}
                          className={`acal-week-apt${apt.status === 'cancelled' ? ' cancelled' : ''}`}
                          style={{ borderLeftColor: aptColor, background: aptColor + '20' }}
                          draggable
                          onDragStart={e => { e.stopPropagation(); handleDragStart(e, apt); }}
                          onClick={e => { e.stopPropagation(); onAppointmentClick?.(apt); }}
                        >
                          <div className="wapt-time">{formatTime(apt.start_time)}</div>
                          <div className="wapt-client">{apt.customer_first_name} {apt.customer_last_name || ''}</div>
                          <div className="wapt-service">{apt.service_name || ''}</div>
                        </div>
                      );
                    })}
                    {!dayApts.length && !blocked && <div className="empty-click-hint">+</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── DAY VIEW ─────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const today   = new Date();
    const isToday = sameDay(currentDate, today);
    const dayApts = filtered.filter(a => a.start_time && sameDay(new Date(a.start_time), currentDate));
    return (
      <div className="acal-day">
        <div className="acal-day-head">
          <div>
            <h3 className={isToday ? 'is-today' : ''}>
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {isToday && <span className="today-badge">Today</span>}
            </h3>
            <p className="day-sub">{dayApts.length} appointment{dayApts.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="new-apt-inline" onClick={() => onNewAppointment?.(currentDate)}>
            + New Appointment
          </button>
        </div>
        <div className="acal-day-body">
          {timeSlots.map(({ hour, min }) => {
            const slotApts  = dayApts.filter(a => { const d = new Date(a.start_time); return d.getHours() === hour && d.getMinutes() >= min && d.getMinutes() < min + 30; });
            const blocked   = isSlotBlocked(hour, min);
            const blockInfo = blocked ? getBlockForSlot(hour, min) : null;
            const slotKey   = `${toDateKey(currentDate)}_${hour}_${min}`;
            const isHour    = min === 0;
            return (
              <div
                key={`${hour}-${min}`}
                className={['acal-day-slot', isHour ? 'hour-mark' : 'half-mark', blocked ? 'blocked' : '', dragOverSlot === slotKey ? 'drag-target' : '', !slotApts.length && !blocked ? 'open-slot' : ''].filter(Boolean).join(' ')}
                style={blocked && blockInfo ? { background: blockInfo.color + '55' } : {}}
                onDragOver={e => handleDragOver(e, slotKey)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, currentDate, hour, min)}
                onClick={() => { if (!slotApts.length && !blocked) onNewAppointment?.(currentDate); }}
              >
                <div className="acal-slot-label">
                  {isHour ? formatHour(hour) : `·${pad(min)}`}
                </div>
                <div className="acal-slot-content">
                  {blocked && blockInfo && hour === blockInfo.startHour && min === blockInfo.startMin && (
                    <div className="block-band" style={{ borderLeftColor: '#94a3b8', background: blockInfo.color }}>
                      <span className="block-icon">🚫</span>
                      <span className="block-name">{blockInfo.label}</span>
                      <span className="block-time">{formatHourMin(blockInfo.startHour, blockInfo.startMin)} – {formatHourMin(blockInfo.endHour, blockInfo.endMin)}</span>
                    </div>
                  )}
                  {slotApts.map(apt => {
                    const aptColor = getAptColor(apt, colorMode, services);
                    return (
                      <div
                        key={apt.id}
                        className={`acal-day-apt${apt.status === 'cancelled' ? ' cancelled' : ''}`}
                        style={{ borderLeftColor: aptColor }}
                        draggable
                        onDragStart={e => { e.stopPropagation(); handleDragStart(e, apt); }}
                        onClick={e => { e.stopPropagation(); onAppointmentClick?.(apt); }}
                      >
                        <div className="dapt-header">
                          <span className="dapt-time">{formatTime(apt.start_time)} – {formatTime(apt.end_time)}</span>
                          <span className="dapt-badge" style={{ background: STATUS_COLORS[apt.status] }}>{STATUS_LABELS[apt.status] || apt.status}</span>
                        </div>
                        <div className="dapt-client">{apt.customer_first_name} {apt.customer_last_name || ''}</div>
                        <div className="dapt-meta">
                          {apt.service_name && <span className="dapt-service">{apt.service_name}</span>}
                          {apt.staff_name   && <span className="dapt-staff"> · {apt.staff_name}</span>}
                        </div>
                        {apt.notes && <div className="dapt-notes">{apt.notes}</div>}
                        {onReschedule && <div className="drag-hint">↕ drag to reschedule</div>}
                      </div>
                    );
                  })}
                  {!slotApts.length && !blocked && <div className="open-slot-hint">+ Click to book</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── MULTI-STAFF VIEW ─────────────────────────────────────────────────────
  const renderMultiStaffView = () => {
    const staffList = staff.slice(0, 6);
    if (!staffList.length) {
      return (
        <div className="acal-empty-state">
          <p>No staff members available. Add staff members to use this view.</p>
          <button className="cal-btn-primary" onClick={() => setViewMode('day')}>Switch to Day View</button>
        </div>
      );
    }
    const today   = new Date();
    const isToday = sameDay(currentDate, today);
    const dayApts = filtered.filter(a => a.start_time && sameDay(new Date(a.start_time), currentDate));
    return (
      <div className="acal-multistaff">
        <div className="ms-top">
          <h3 className={isToday ? 'is-today' : ''}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {isToday && <span className="today-badge">Today</span>}
          </h3>
        </div>
        <div className="ms-scroll-wrap">
          <div className="ms-head">
            <div className="ms-time-col" />
            {staffList.map(s => (
              <div key={s.id} className="ms-staff-head">
                <div className="ms-avatar">{(s.full_name || '?')[0].toUpperCase()}</div>
                <span className="ms-staff-name">{s.full_name}</span>
                <span className="ms-staff-count">{dayApts.filter(a => String(a.staff_id) === String(s.id)).length} apt</span>
              </div>
            ))}
          </div>
          <div className="ms-body">
            {timeSlots.map(({ hour, min }) => {
              const blocked   = isSlotBlocked(hour, min);
              const blockInfo = blocked ? getBlockForSlot(hour, min) : null;
              const isHour    = min === 0;
              return (
                <div key={`${hour}-${min}`} className={`ms-row${isHour ? ' hour-mark' : ' half-mark'}`}>
                  <div className="ms-time-label">{isHour ? formatHour(hour) : ''}</div>
                  {staffList.map(s => {
                    const cellApts = dayApts.filter(a => {
                      if (String(a.staff_id) !== String(s.id)) return false;
                      const d = new Date(a.start_time);
                      return d.getHours() === hour && d.getMinutes() >= min && d.getMinutes() < min + 30;
                    });
                    const slotKey = `${toDateKey(currentDate)}_${s.id}_${hour}_${min}`;
                    return (
                      <div
                        key={s.id}
                        className={['ms-cell', blocked ? 'blocked' : '', dragOverSlot === slotKey ? 'drag-target' : ''].filter(Boolean).join(' ')}
                        style={blocked && blockInfo ? { background: blockInfo.color + '80' } : {}}
                        onDragOver={e => handleDragOver(e, slotKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, currentDate, hour, min)}
                        onClick={() => { if (!cellApts.length && !blocked) onNewAppointment?.(currentDate); }}
                      >
                        {blocked && blockInfo && hour === blockInfo.startHour && min === blockInfo.startMin && <div className="ms-block-label">{blockInfo.label}</div>}
                        {cellApts.map(apt => {
                          const aptColor = getAptColor(apt, colorMode, services);
                          return (
                            <div
                              key={apt.id}
                              className={`ms-apt${apt.status === 'cancelled' ? ' cancelled' : ''}`}
                              style={{ background: aptColor }}
                              draggable
                              onDragStart={e => { e.stopPropagation(); handleDragStart(e, apt); }}
                              onClick={e => { e.stopPropagation(); onAppointmentClick?.(apt); }}
                            >
                              <div className="msapt-time">{formatTime(apt.start_time)}</div>
                              <div className="msapt-client">{apt.customer_first_name}</div>
                              <div className="msapt-service">{apt.service_name || ''}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── LEGEND ───────────────────────────────────────────────────────────────
  const renderLegend = () => {
    if (colorMode === 'service') {
      const svcList = services.slice(0, 10);
      if (!svcList.length) return null;
      return (
        <div className="acal-legend">
          <span className="legend-title">Service color:</span>
          {svcList.map((s, i) => (
            <div key={s.id} className="legend-item">
              <span className="legend-dot" style={{ background: SERVICE_PALETTE[i % SERVICE_PALETTE.length] }} />
              <span className="legend-label">{s.name}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="acal-legend">
        <span className="legend-title">Status:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span className="legend-label">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── DAY POPUP ────────────────────────────────────────────────────────────
  const renderPopup = () => {
    if (!expandedDay) return null;
    const sorted = [...expandedDay.apts].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return (
      <div className="calendar-day-popup-overlay" onClick={() => setExpandedDay(null)}>
        <div className="calendar-day-popup" onClick={e => e.stopPropagation()}>
          <div className="calendar-day-popup-header">
            <h4>
              {expandedDay.day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span className="popup-count">{sorted.length}</span>
            </h4>
            <button className="popup-close" onClick={() => setExpandedDay(null)}>✕</button>
          </div>
          <div className="calendar-day-popup-list">
            {sorted.map(apt => (
              <div
                key={apt.id}
                className="popup-apt-item"
                style={{ borderLeftColor: getAptColor(apt, colorMode, services) }}
                onClick={() => { onAppointmentClick?.(apt); setExpandedDay(null); }}
              >
                <div className="popup-apt-time">{formatTime(apt.start_time)}</div>
                <div className="popup-apt-info">
                  <span className="popup-apt-client">{apt.customer_first_name} {apt.customer_last_name || ''}</span>
                  <span className="popup-apt-service">{apt.service_name || ''}{apt.staff_name ? ` · ${apt.staff_name}` : ''}</span>
                </div>
                <span className="popup-apt-badge" style={{ background: STATUS_COLORS[apt.status] }}>
                  {STATUS_LABELS[apt.status] || apt.status}
                </span>
              </div>
            ))}
          </div>
          <div className="popup-footer">
            <button className="acal-link-btn" onClick={() => { goToDay(expandedDay.day); setExpandedDay(null); }}>
              View full day →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── BLOCK MODAL ──────────────────────────────────────────────────────────
  const BLOCK_COLORS = ['#e2e8f0','#fef3c7','#dcfce7','#dbeafe','#f3e8ff','#ffe4e6'];
  const renderBlockModal = () => {
    if (!showBlockModal) return null;
    const slotOptions = [];
    for (let h = 6; h < 22; h++) {
      slotOptions.push({ value: `${h}:0`,  label: formatHour(h) });
      slotOptions.push({ value: `${h}:30`, label: `${h % 12 || 12}:30 ${h >= 12 ? 'PM' : 'AM'}` });
    }
    return (
      <div className="cal-modal-overlay" onClick={() => setShowBlockModal(false)}>
        <div className="cal-modal-box" onClick={e => e.stopPropagation()}>
          <div className="cal-modal-header">
            <h4>🚫 Add Time Block</h4>
            <button className="popup-close" onClick={() => setShowBlockModal(false)}>✕</button>
          </div>
          <div className="cal-modal-body">
            <p className="cal-modal-hint">Blocked time slots are visually greyed-out in day, week, and staff views.</p>
            <div className="cal-form-group">
              <label>Label</label>
              <input type="text" value={newBlock.label} onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))} placeholder="e.g., Lunch Break, Meeting…" />
            </div>
            <div className="cal-form-row">
              <div className="cal-form-group">
                <label>Start</label>
                <select value={`${newBlock.startHour}:${newBlock.startMin}`} onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setNewBlock(p => ({...p, startHour:h, startMin:m})); }}>
                  {slotOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="cal-form-group">
                <label>End</label>
                <select value={`${newBlock.endHour}:${newBlock.endMin}`} onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setNewBlock(p => ({...p, endHour:h, endMin:m})); }}>
                  {slotOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="cal-form-group">
              <label>Highlight Color</label>
              <div className="color-swatches">
                {BLOCK_COLORS.map(c => (
                  <div key={c} className={`color-swatch${newBlock.color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setNewBlock(p => ({...p, color: c}))} />
                ))}
              </div>
            </div>
          </div>
          <div className="cal-modal-footer">
            <button className="cal-btn-ghost" onClick={() => setShowBlockModal(false)}>Cancel</button>
            <button className="cal-btn-primary" onClick={addBlock}>Add Block</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="appointment-calendar">

      {/* ── Header ── */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigate(-1)} title="Previous">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="calendar-title">{navTitle}</span>
          <button className="nav-btn" onClick={() => navigate(1)} title="Next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="calendar-controls">
          <button className="today-btn" onClick={goToday}>Today</button>
          <div className="view-toggle">
            {[{v:'month',l:'Month'},{v:'week',l:'Week'},{v:'day',l:'Day'},{v:'multistaff',l:'Staff'}].map(({v,l}) => (
              <button key={v} className={`view-btn${viewMode === v ? ' active' : ''}`} onClick={() => setViewMode(v)}>{l}</button>
            ))}
          </div>
          <button className={`acal-icon-btn${showFilters ? ' active' : ''}${activeFilterCount > 0 ? ' has-filters' : ''}`} onClick={() => setShowFilters(f => !f)} title="Filters">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
          <button className="acal-icon-btn" onClick={handleExport} title="Export as iCal (.ics)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            iCal
          </button>
          <button className="acal-icon-btn" onClick={() => setShowBlockModal(true)} title="Block time slot">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            Block
          </button>
          <button className="new-apt-btn" onClick={() => onNewAppointment?.(currentDate)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div className="acal-filter-bar">
          <div className="filter-row">
            <div className="filter-group">
              <label>Staff</label>
              <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
                <option value="">All Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Service</label>
              <select value={filterService} onChange={e => setFilterService(e.target.value)}>
                <option value="">All Services</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Color By</label>
              <select value={colorMode} onChange={e => setColorMode(e.target.value)}>
                <option value="status">Status</option>
                <option value="service">Service Type</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button className="acal-reset-btn" onClick={() => { setFilterStaff(''); setFilterStatus(''); setFilterService(''); }}>
                ✕ Reset
              </button>
            )}
          </div>
          {blockSlots.length > 0 && (
            <div className="filter-blocks-row">
              <span className="blocks-label">Active blocks:</span>
              {blockSlots.map(b => (
                <span key={b.id} className="block-chip" style={{ background: b.color }}>
                  🚫 {b.label}
                  <button className="chip-remove" onClick={() => removeBlock(b.id)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Calendar Body ── */}
      <div className="calendar-body">
        {viewMode === 'month'      && renderMonthView()}
        {viewMode === 'week'       && renderWeekView()}
        {viewMode === 'day'        && renderDayView()}
        {viewMode === 'multistaff' && renderMultiStaffView()}
      </div>

      {/* ── Legend ── */}
      {renderLegend()}

      {/* ── Modals ── */}
      {renderPopup()}
      {renderBlockModal()}
    </div>
  );
}

