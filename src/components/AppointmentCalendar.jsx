import { useState } from 'react';
import { NavArrowLeft, NavArrowRight, Plus, Xmark } from 'iconoir-react';
import './AppointmentCalendar.css';

const STATUS_COLORS = {
  scheduled: '#4CAF50',
  confirmed: '#2196F3',
  in_progress: '#FF9800',
  completed: '#9C27B0',
  cancelled: '#F44336',
  no_show: '#757575',
};

export default function AppointmentCalendar({ 
  appointments = [], 
  onDateSelect, 
  onAppointmentClick,
  onNewAppointment,
  selectedDate 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [expandedDay, setExpandedDay] = useState(null); // { date, appointments }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month days (fill to complete the grid)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const getWeekDays = (date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({ date: day, isCurrentMonth: true });
    }
    return days;
  };

  const getAppointmentsForDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return appointments.filter(apt => {
      if (!apt.start_time) return false;
      const aptDate = new Date(apt.start_time);
      return aptDate.getFullYear() === year && 
             aptDate.getMonth() === month && 
             aptDate.getDate() === day;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    // Parse selectedDate safely
    const sel = typeof selectedDate === 'string' ? new Date(selectedDate + 'T00:00:00') : selectedDate;
    return date.toDateString() === sel.toDateString();
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    if (onDateSelect) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      onDateSelect(dateStr);
    }
  };

  const handleDateClick = (date) => {
    // Build local date string to avoid timezone issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  const handleMoreClick = (e, date, dayAppointments) => {
    e.stopPropagation();
    setExpandedDay({ date, appointments: dayAppointments });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const days = viewMode === 'month' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);

  // Time slots for day view
  const timeSlots = [];
  for (let hour = 8; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  return (
    <div className="appointment-calendar">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigateMonth(-1)}>
            <NavArrowLeft width={20} height={20} />
          </button>
          <h2 className="calendar-title">
            {viewMode === 'day' 
              ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            }
          </h2>
          <button className="nav-btn" onClick={() => navigateMonth(1)}>
            <NavArrowRight width={20} height={20} />
          </button>
        </div>
        
        <div className="calendar-controls">
          <button className="today-btn" onClick={goToToday}>Today</button>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>
          {onNewAppointment && (
            <button className="new-apt-btn" onClick={() => onNewAppointment()}>
              <Plus width={18} height={18} /> New Booking
            </button>
          )}
        </div>
      </div>

      {/* Month/Week View */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <div className="calendar-grid">
          {/* Day headers */}
          <div className="calendar-weekdays">
            {daysOfWeek.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className={`calendar-days ${viewMode}`}>
            {days.map((dayObj, index) => {
              const dayAppointments = getAppointmentsForDate(dayObj.date);
              return (
                <div
                  key={index}
                  className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} 
                             ${isToday(dayObj.date) ? 'today' : ''} 
                             ${isSelected(dayObj.date) ? 'selected' : ''}`}
                  onClick={() => handleDateClick(dayObj.date)}
                >
                  <span className="day-number">{dayObj.date.getDate()}</span>
                  
                  {dayAppointments.length > 0 && (
                    <div className="day-appointments">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`apt-indicator status-${apt.status}`}
                          style={{ backgroundColor: STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAppointmentClick) onAppointmentClick(apt);
                          }}
                          title={`${formatTime(apt.start_time)} - ${apt.customer_first_name} ${apt.customer_last_name} (${apt.status})`}
                        >
                          <span className="apt-time">{formatTime(apt.start_time)}</span>
                          <span className="apt-client">{apt.customer_first_name}</span>
                          {apt.status === 'completed' && <span className="apt-status-icon">✓</span>}
                          {apt.status === 'cancelled' && <span className="apt-status-icon">✗</span>}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div 
                          className="more-indicator"
                          onClick={(e) => handleMoreClick(e, dayObj.date, dayAppointments)}
                        >
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="day-view">
          <div className="time-grid">
            {timeSlots.map(time => {
              const hour = parseInt(time.split(':')[0]);
              const slotAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.start_time);
                return aptDate.toDateString() === currentDate.toDateString() && 
                       aptDate.getHours() === hour;
              });
              
              return (
                <div key={time} className="time-slot">
                  <div className="time-label">{time}</div>
                  <div className="time-content">
                    {slotAppointments.map(apt => (
                      <div
                        key={apt.id}
                        className="slot-appointment"
                        style={{ borderLeftColor: STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled }}
                        onClick={() => onAppointmentClick && onAppointmentClick(apt)}
                      >
                        <div className="slot-apt-time">
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </div>
                        <div className="slot-apt-client">
                          {apt.customer_first_name} {apt.customer_last_name}
                        </div>
                        <div className="slot-apt-service">{apt.service_name}</div>
                        <div className="slot-apt-staff">with {apt.staff_name}</div>
                      </div>
                    ))}
                    {slotAppointments.length === 0 && (
                      <div 
                        className="empty-slot"
                        onClick={() => {
                          if (onNewAppointment) {
                            // Pass the date string for the selected time slot
                            const d = new Date(currentDate);
                            d.setHours(hour, 0, 0, 0);
                            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            onNewAppointment(dateStr);
                          }
                        }}
                      >
                        <Plus width={14} height={14} /> Add booking
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Day Popup ("+N more" click) */}
      {expandedDay && (
        <div className="calendar-day-popup-overlay" onClick={() => setExpandedDay(null)}>
          <div className="calendar-day-popup" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-day-popup-header">
              <h4>
                {expandedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                <span className="popup-count">{expandedDay.appointments.length} appointments</span>
              </h4>
              <button onClick={() => setExpandedDay(null)} className="popup-close">
                <Xmark width={18} height={18} />
              </button>
            </div>
            <div className="calendar-day-popup-list">
              {expandedDay.appointments
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .map(apt => (
                <div
                  key={apt.id}
                  className="popup-apt-item"
                  style={{ borderLeftColor: STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled }}
                  onClick={() => { setExpandedDay(null); if (onAppointmentClick) onAppointmentClick(apt); }}
                >
                  <div className="popup-apt-time">{formatTime(apt.start_time)}</div>
                  <div className="popup-apt-info">
                    <span className="popup-apt-client">{apt.customer_first_name} {apt.customer_last_name}</span>
                    <span className="popup-apt-service">{apt.service_name} · {apt.staff_name}</span>
                  </div>
                  <span className="popup-apt-badge" style={{ backgroundColor: STATUS_COLORS[apt.status] }}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="calendar-legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }}></span>
            <span className="legend-label">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
