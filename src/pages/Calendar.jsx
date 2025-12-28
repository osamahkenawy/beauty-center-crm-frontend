import { useState, useEffect, useCallback, useMemo } from 'react';
import { EditPencil, Trash } from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

export default function Calendar() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayObj, setSelectedDayObj] = useState(null);
  const [selectedDayActivities, setSelectedDayActivities] = useState([]);
  const [editingActivity, setEditingActivity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    type: 'meeting', subject: '', description: '', due_date: '', due_time: '',
    priority: 'medium', assigned_to: '', status: 'pending'
  });

  const activityTypes = [
    { value: 'call', label: 'Call', icon: '📞', color: '#28c76f' },
    { value: 'meeting', label: 'Meeting', icon: '👥', color: '#7367f0' },
    { value: 'email', label: 'Email', icon: '✉️', color: '#00cfe8' },
    { value: 'task', label: 'Task', icon: '✅', color: '#ff9f43' },
    { value: 'follow_up', label: 'Follow Up', icon: '🔄', color: '#667eea' },
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
    { value: 'note', label: 'Note', icon: '📝', color: '#82868b' },
    { value: 'sms', label: 'SMS', icon: '📱', color: '#f56565' }
  ];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  // Format date to YYYY-MM-DD using local timezone
  // IMPORTANT: Don't create a new Date object to avoid timezone issues
  const formatDateForInput = useCallback((date) => {
    if (!date) return '';
    // If it's already a Date object, use it directly
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // If it's a string, parse it carefully
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise parse and format
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/activities?limit=500');
      if (data.success) setActivities(data.data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.get('/staff');
      if (data.success) setStaffMembers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchStaff();
  }, [fetchActivities, fetchStaff]);

  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    
    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    for (let i = firstDay; i > 0; i--) {
      const dayNum = prevMonthLastDay - i + 1;
      // Store explicit year, month, day to avoid timezone issues
      days.push({ 
        year: prevYear,
        month: prevMonth,
        day: dayNum,
        isCurrentMonth: false,
        // Format date string directly
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      });
    }
    
    // Days in current month
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      // Store explicit year, month, day to avoid timezone issues
      days.push({ 
        year: year,
        month: month,
        day: d,
        isCurrentMonth: true,
        // Format date string directly
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }
    
    // Days from next month to fill the grid
    const remaining = 42 - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remaining; i++) {
      days.push({ 
        year: nextYear,
        month: nextMonth,
        day: i,
        isCurrentMonth: false,
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }
    
    return days;
  }, []);

  const getActivitiesForDate = useCallback((dateString) => {
    return activities.filter(a => {
      if (!a.due_date) return false;
      // Handle both YYYY-MM-DD string format and ISO datetime format
      // Backend now returns YYYY-MM-DD directly
      const activityDate = a.due_date.includes('T') ? a.due_date.split('T')[0] : a.due_date;
      return activityDate === dateString;
    });
  }, [activities]);

  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  const isToday = useCallback((dayObj) => {
    const today = new Date();
    return dayObj.day === today.getDate() && 
           dayObj.month === today.getMonth() && 
           dayObj.year === today.getFullYear();
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const openCreateModal = useCallback((dayObj) => {
    // dayObj contains: year, month, day, dateString
    // Create a Date object for display purposes only
    const displayDate = new Date(dayObj.year, dayObj.month, dayObj.day, 12, 0, 0);
    setSelectedDate(displayDate);
    setEditingActivity(null);
    
    // Use the pre-formatted dateString directly - no Date object conversion!
    setFormData({
      type: 'meeting', subject: '', description: '',
      due_date: dayObj.dateString, due_time: '09:00',
      priority: 'medium', assigned_to: '', status: 'pending'
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((activity) => {
    // Handle both YYYY-MM-DD and ISO date formats
    let dateString = activity.due_date || '';
    if (dateString.includes('T')) {
      dateString = dateString.split('T')[0];
    }
    
    // Create display date from the string
    let displayDate = new Date();
    if (dateString) {
      const [year, month, day] = dateString.split('-').map(Number);
      displayDate = new Date(year, month - 1, day, 12, 0, 0);
    }
    
    setSelectedDate(displayDate);
    setEditingActivity(activity);
    setFormData({
      type: activity.type || 'meeting',
      subject: activity.subject || '',
      description: activity.description || '',
      due_date: dateString,
      due_time: activity.due_time ? activity.due_time.slice(0, 5) : '',
      priority: activity.priority || 'medium',
      assigned_to: activity.assigned_to || '',
      status: activity.status || 'pending'
    });
    setShowModal(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        assigned_to: formData.assigned_to || null 
      };
      
      const data = editingActivity
        ? await api.patch(`/activities/${editingActivity.id}`, payload)
        : await api.post('/activities', payload);
        
      if (data.success) {
        showToast('success', data.message);
        fetchActivities();
        setShowModal(false);
        setShowDayModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (activity, newStatus) => {
    try {
      const data = await api.patch(`/activities/${activity.id}`, { status: newStatus });
      if (data.success) {
        showToast('success', 'Status updated');
        fetchActivities();
        setSelectedDayActivities(prev => prev.map(a => a.id === activity.id ? { ...a, status: newStatus } : a));
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
    }
  };

  const handleDelete = async (activity) => {
    if (!window.confirm(`Delete "${activity.subject}"?`)) return;
    try {
      const data = await api.delete(`/activities/${activity.id}`);
      if (data.success) {
        showToast('success', 'Deleted successfully');
        fetchActivities();
        setShowDayModal(false);
      }
    } catch (error) {
      showToast('error', 'Failed to delete');
    }
  };

  const getTypeData = (type) => {
    return activityTypes.find(t => t.value === type) || activityTypes[3];
  };

  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate, getDaysInMonth]);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const openDayModal = useCallback((dayObj) => {
    // Create a Date object for display purposes only
    const displayDate = new Date(dayObj.year, dayObj.month, dayObj.day, 12, 0, 0);
    setSelectedDate(displayDate);
    setSelectedDayObj(dayObj); // Store the day object for later use
    setSelectedDayActivities(getActivitiesForDate(dayObj.dateString));
    setShowDayModal(true);
  }, [getActivitiesForDate]);

  return (
    <div className="crm-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'}
          {toast.message}
        </div>
      )}

      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigateMonth(-1)}>◀</button>
          <h2 className="calendar-title">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button className="nav-btn" onClick={() => navigateMonth(1)}>▶</button>
        </div>
        <div className="calendar-actions">
          <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : (
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {weekDays.map(day => <div key={day} className="weekday">{day}</div>)}
          </div>
          <div className="calendar-days">
            {days.map((day, idx) => {
              // Use the pre-formatted dateString for activity lookup
              const dayActivities = getActivitiesForDate(day.dateString);
              const displayActivities = dayActivities.slice(0, 2);
              const moreCount = dayActivities.length - 2;

              return (
                <div
                  key={idx}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}
                  onClick={() => openCreateModal(day)}
                >
                  <div className="day-number">{day.day}</div>
                  <div className="day-events">
                    {displayActivities.map(activity => {
                      const typeData = getTypeData(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className="day-event"
                          style={{ background: typeData.color }}
                          onClick={(e) => { e.stopPropagation(); openEditModal(activity); }}
                        >
                          {typeData.icon} {activity.subject}
                        </div>
                      );
                    })}
                    {moreCount > 0 && (
                      <div className="more-events" onClick={(e) => { e.stopPropagation(); openDayModal(day); }}>
                        +{moreCount} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingActivity ? 'Edit Activity' : 'New Activity'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="form-control">
                    {activityTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows={3}></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" name="due_date" value={formData.due_date} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input type="time" name="due_time" value={formData.due_time} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleInputChange} className="form-control">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="form-control">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select name="assigned_to" value={formData.assigned_to} onChange={handleInputChange} className="form-control">
                    <option value="">Unassigned</option>
                    {staffMembers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingActivity ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDayModal(false); }}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f2421b, #ff6b4a)' }}>
              <h2>📅 {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <button className="modal-close" onClick={() => setShowDayModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedDayActivities.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No activities</h3>
                  <p>No activities scheduled for this day</p>
                </div>
              ) : (
                <div className="day-activities-list">
                  {selectedDayActivities.map(activity => {
                    const typeData = getTypeData(activity.type);
                    return (
                      <div key={activity.id} className="day-activity-item">
                        <div
                          className={`activity-checkbox ${activity.status === 'completed' ? 'checked' : ''}`}
                          onClick={() => handleStatusChange(activity, activity.status === 'completed' ? 'pending' : 'completed')}
                        >
                          {activity.status === 'completed' && '✓'}
                        </div>
                        <div className="activity-type-badge" style={{ background: typeData.color }}>
                          {typeData.icon}
                        </div>
                        <div className="activity-content">
                          <div className={`activity-subject ${activity.status === 'completed' ? 'completed' : ''}`}>
                            {activity.subject}
                          </div>
                          <div className="activity-meta">
                            {activity.due_time && <span>🕐 {activity.due_time.slice(0, 5)}</span>}
                            <span className={`priority-badge ${activity.priority}`}>{activity.priority}</span>
                          </div>
                        </div>
                        <div className="activity-actions">
                          <button className="action-btn edit" onClick={() => openEditModal(activity)} title="Edit">
                            <EditPencil width={18} height={18} />
                          </button>
                          <button className="action-btn delete" onClick={() => handleDelete(activity)} title="Delete">
                            <Trash width={18} height={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDayModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setShowDayModal(false); if (selectedDayObj) openCreateModal(selectedDayObj); }}>
                + Add Activity
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .calendar-nav { display: flex; align-items: center; gap: 16px; }
        .nav-btn { width: 40px; height: 40px; border: 2px solid var(--gray-200); background: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 14px; }
        .nav-btn:hover { border-color: var(--primary); color: var(--primary); }
        .calendar-title { font-size: 24px; font-weight: 700; color: var(--gray-900); min-width: 220px; text-align: center; }
        .calendar-actions { display: flex; gap: 12px; }
        .calendar-grid { background: white; border-radius: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.05); overflow: hidden; }
        .calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--gray-50); }
        .weekday { padding: 16px; text-align: center; font-weight: 600; color: var(--gray-600); font-size: 13px; text-transform: uppercase; }
        .calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); }
        .calendar-day { min-height: 120px; border: 1px solid var(--gray-100); padding: 10px; cursor: pointer; transition: all 0.2s; }
        .calendar-day:hover { background: rgba(36, 64, 102, 0.02); }
        .calendar-day.other-month { background: var(--gray-50); }
        .calendar-day.other-month .day-number { color: var(--gray-400); }
        .calendar-day.today { background: rgba(36, 64, 102, 0.05); }
        .calendar-day.today .day-number { background: var(--primary); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .day-number { font-weight: 600; color: var(--gray-900); margin-bottom: 8px; font-size: 14px; }
        .day-events { display: flex; flex-direction: column; gap: 4px; }
        .day-event { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white; display: flex; align-items: center; gap: 4px; transition: transform 0.2s; }
        .day-event:hover { transform: scale(1.02); }
        .more-events { font-size: 11px; color: var(--gray-600); padding: 4px 0; text-align: center; cursor: pointer; font-weight: 500; }
        .more-events:hover { color: var(--primary); text-decoration: underline; }
        .day-activities-list { display: flex; flex-direction: column; gap: 12px; }
        .day-activity-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--gray-50); border-radius: 12px; transition: all 0.2s; }
        .day-activity-item:hover { background: var(--gray-100); }
        .activity-checkbox { width: 24px; height: 24px; border: 2px solid var(--gray-300); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; font-size: 12px; }
        .activity-checkbox.checked { background: var(--success); border-color: var(--success); color: white; }
        .activity-type-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .activity-content { flex: 1; min-width: 0; }
        .activity-subject { font-weight: 600; color: var(--gray-900); }
        .activity-subject.completed { text-decoration: line-through; color: var(--gray-500); }
        .activity-meta { font-size: 12px; color: var(--gray-500); display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .priority-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        .priority-badge.low { background: var(--gray-200); color: var(--gray-600); }
        .priority-badge.medium { background: rgba(245, 158, 11, 0.15); color: #92400e; }
        .priority-badge.high { background: rgba(249, 115, 22, 0.15); color: #c2410c; }
        .priority-badge.urgent { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
        @media (max-width: 768px) {
          .calendar-day { min-height: 80px; padding: 6px; }
          .day-number { font-size: 12px; }
          .day-event { font-size: 10px; padding: 2px 4px; }
          .weekday { padding: 10px; font-size: 11px; }
          .calendar-header { flex-direction: column; align-items: stretch; }
          .calendar-nav { justify-content: center; }
          .calendar-actions { justify-content: center; }
        }
      `}</style>
    </div>
  );
}
