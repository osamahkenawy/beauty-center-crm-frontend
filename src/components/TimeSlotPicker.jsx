import { useMemo } from 'react';
import { Clock, Check, SunLight, HalfMoon } from 'iconoir-react';
import './TimeSlotPicker.css';

const DEFAULT_WORKING_HOURS = { start: 9, end: 21 };

export default function TimeSlotPicker({ 
  selectedDate,
  selectedTime,
  onTimeSelect,
  bookedSlots, 
  staffId,
  duration = 60,
  workingHours,
  breakSlots = [],   // [{ startHour, startMin, endHour, endMin, label, color }]
}) {
  const stableBookedSlots = bookedSlots || [];
  const stableWorkingHours = workingHours || DEFAULT_WORKING_HOURS;

  // Parse date string safely into local date parts (avoids UTC-midnight shift)
  const parseLocalDate = (dateStr, hour = 0, minute = 0) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, hour, minute, 0, 0);
  };

  /** Returns matching break slot if this time slot overlaps any break, else null */
  const checkIfBreak = (hour, minute) => {
    if (!breakSlots.length) return null;
    const slotStart = hour * 60 + minute;
    const slotEnd   = slotStart + duration;
    return breakSlots.find(b => {
      const bStart = b.startHour * 60 + b.startMin;
      const bEnd   = b.endHour   * 60 + b.endMin;
      return slotStart < bEnd && slotEnd > bStart;
    }) || null;
  };

  const checkIfBooked = (hour, minute, serviceDuration, date, booked) => {
    if (!date) return false;

    const slotStart = parseLocalDate(date, hour, minute);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

    return booked.some(b => {
      const bookedStart = new Date(b.start_time);
      const bookedEnd = new Date(b.end_time);
      return (slotStart < bookedEnd && slotEnd > bookedStart);
    });
  };

  const checkIfPast = (hour, minute, date) => {
    if (!date) return false;

    const slotDateTime = parseLocalDate(date, hour, minute);

    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);

    return slotDateTime < now;
  };

  const formatTimeLabel = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const slots = useMemo(() => {
    const timeSlots = [];
    const startHour = stableWorkingHours.start;
    const endHour = stableWorkingHours.end;
    const slotInterval = 30;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const slotEnd = new Date();
        slotEnd.setHours(hour, minute + duration, 0, 0);
        if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) {
          continue;
        }

        const breakMatch = checkIfBreak(hour, minute);
        const isBooked = checkIfBooked(hour, minute, duration, selectedDate, stableBookedSlots);
        const isPast = checkIfPast(hour, minute, selectedDate);

        timeSlots.push({
          time: timeString,
          label: formatTimeLabel(hour, minute),
          available: !isBooked && !isPast,
          isPast,
          isBooked,
          isBreak: !!breakMatch,
          breakLabel: breakMatch?.label || '',
        });
      }
    }

    return timeSlots;
  }, [selectedDate, stableBookedSlots.length, duration, stableWorkingHours.start, stableWorkingHours.end, breakSlots]);

  const handleSlotSelect = (slot) => {
    if (!slot.available) return;
    onTimeSelect(slot.time);
  };

  const renderSlot = (slot) => (
    <button
      key={slot.time}
      type="button"
      title={slot.isBreak ? `☕ ${slot.breakLabel}` : undefined}
      className={[
        'time-slot-btn',
        !slot.available   ? 'unavailable' : '',
        slot.isBooked     ? 'booked'      : '',
        slot.isPast       ? 'past'        : '',
        slot.isBreak      ? 'break-time'  : '',
        selectedTime === slot.time ? 'selected' : '',
      ].join(' ').trim()}
      onClick={() => handleSlotSelect(slot)}
      disabled={!slot.available}
    >
      {selectedTime === slot.time && <Check width={14} height={14} />}
      {slot.label}
      {slot.isBreak && <span className="break-badge">☕</span>}
    </button>
  );

  const morning   = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoon = slots.filter(s => { const h = parseInt(s.time.split(':')[0]); return h >= 12 && h < 17; });
  const evening   = slots.filter(s => parseInt(s.time.split(':')[0]) >= 17);

  const hasBreaks = slots.some(s => s.isBreak);

  return (
    <div className="time-slot-picker">
      {selectedDate && (
        <div className="selected-date-label">
          <Clock width={16} height={16} />
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      )}

      {morning.length > 0 && (
        <div className="time-period">
          <h4 className="period-title"><SunLight width={16} height={16} /> Morning</h4>
          <div className="slots-grid">{morning.map(renderSlot)}</div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div className="time-period">
          <h4 className="period-title"><SunLight width={16} height={16} /> Afternoon</h4>
          <div className="slots-grid">{afternoon.map(renderSlot)}</div>
        </div>
      )}

      {evening.length > 0 && (
        <div className="time-period">
          <h4 className="period-title"><HalfMoon width={16} height={16} /> Evening</h4>
          <div className="slots-grid">{evening.map(renderSlot)}</div>
        </div>
      )}

      <div className="slot-legend">
        <div className="legend-item">
          <span className="legend-indicator available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator booked"></span>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator selected"></span>
          <span>Selected</span>
        </div>
        {hasBreaks && (
          <div className="legend-item">
            <span className="legend-indicator break-time"></span>
            <span>Break time</span>
          </div>
        )}
      </div>
    </div>
  );
}
