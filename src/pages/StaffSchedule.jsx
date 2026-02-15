import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Search, Plus, EditPencil, Trash, Check, Xmark, WarningTriangle, Clock, User
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import './CRMPages.css';
import './BeautyPages.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StaffSchedule() {
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [selectedWeek, setSelectedWeek] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    staff_id: '', day_of_week: 'Monday',
    start_time: '09:00', end_time: '18:00',
    break_start: '13:00', break_end: '14:00', is_active: true,
  });

  const [dayOffForm, setDayOffForm] = useState({
    staff_id: '', start_date: '', end_date: '', reason: '',
  });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffData, scheduleData, daysOffData] = await Promise.all([
        api.get('/staff'),
        api.get('/staff-schedule/schedules'),
        api.get('/staff-schedule/days-off'),
      ]);
      if (staffData.success) setStaff(staffData.data || []);
      if (scheduleData.success) setSchedules(scheduleData.data || []);
      if (daysOffData.success) setDaysOff(daysOffData.data || []);
    } catch (error) {
      console.error('Failed to fetch schedule data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openScheduleModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setScheduleForm(prev => ({ ...prev, staff_id: staffMember?.id || '' }));
    setShowModal(true);
  };

  const openDayOffModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setDayOffForm(prev => ({ ...prev, staff_id: staffMember?.id || '' }));
    setShowDayOffModal(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/staff-schedule/schedules', scheduleForm);
      if (data.success) {
        showToast('success', 'Schedule saved');
        fetchData();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDayOffSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/staff-schedule/days-off', dayOffForm);
      if (data.success) {
        showToast('success', 'Day off added');
        fetchData();
        setShowDayOffModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to add day off');
    } finally {
      setSaving(false);
    }
  };

  const deleteDayOff = async (id) => {
    if (!confirm('Remove this day off?')) return;
    try {
      const data = await api.delete(`/staff-schedule/days-off/${id}`);
      if (data.success) { showToast('success', 'Day off removed'); fetchData(); }
    } catch (error) {
      showToast('error', 'Failed to remove');
    }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Remove this schedule entry?')) return;
    try {
      const data = await api.delete(`/staff-schedule/schedules/${id}`);
      if (data.success) { showToast('success', 'Schedule removed'); fetchData(); }
    } catch (error) {
      showToast('error', 'Failed to remove');
    }
  };

  const getStaffSchedule = (staffId) => schedules.filter(s => s.staff_id === staffId);
  const getStaffDaysOff = (staffId) => daysOff.filter(d => d.staff_id === staffId);

  const activeStaff = filterStaff
    ? staff.filter(s => s.id === parseInt(filterStaff))
    : staff.filter(s => s.is_active);

  return (
    <div className="crm-page">
      <SEO page="staff-schedule" />

      {toast.show && (
        <div className={`crm-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check /> : <WarningTriangle />}
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>
            <User width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{staff.filter(s => s.is_active).length}</div>
            <div className="stat-label">Active Staff</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>
            <Calendar width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{schedules.length}</div>
            <div className="stat-label">Schedule Entries</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>
            <Clock width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{daysOff.length}</div>
            <div className="stat-label">Days Off</div>
          </div>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-header">
          <div className="crm-filters">
            <select className="filter-select" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
              <option value="">All Staff</option>
              {staff.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-table-wrapper">
          {loading ? (
            <div className="crm-loading"><div className="loading-spinner"></div><p>Loading schedule...</p></div>
          ) : activeStaff.length === 0 ? (
            <div className="crm-empty">
              <User width={48} height={48} />
              <h3>No active staff found</h3>
              <p>Add staff members first to manage their schedules.</p>
            </div>
          ) : (
            <div className="schedule-staff-list">
              {activeStaff.map(member => {
                const memberSchedules = getStaffSchedule(member.id);
                const memberDaysOff = getStaffDaysOff(member.id);

                return (
                  <div key={member.id} className="schedule-staff-card">
                    <div className="schedule-staff-header">
                      <div className="schedule-staff-info">
                        <div className="schedule-avatar beauty-avatar">
                          {member.full_name?.charAt(0) || member.username?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3>{member.full_name || member.username}</h3>
                          <p>{member.role} {member.phone ? `• ${member.phone}` : ''}</p>
                        </div>
                      </div>
                      <div className="schedule-staff-actions">
                        <button className="btn-create btn-sm" onClick={() => openScheduleModal(member)}>
                          <Plus width={14} height={14} /> Add Schedule
                        </button>
                        <button className="btn-cancel btn-sm" onClick={() => openDayOffModal(member)}>
                          <Calendar width={14} height={14} /> Day Off
                        </button>
                      </div>
                    </div>

                    {/* Weekly Schedule */}
                    <div className="schedule-week-grid">
                      {DAYS.map(day => {
                        const daySchedule = memberSchedules.find(s => s.day_of_week === day);
                        return (
                          <div key={day} className={`schedule-day ${daySchedule ? 'has-schedule' : 'off'}`}>
                            <div className="schedule-day-name">{day.slice(0, 3)}</div>
                            {daySchedule ? (
                              <div className="schedule-day-time">
                                <span>{daySchedule.start_time?.slice(0, 5)} - {daySchedule.end_time?.slice(0, 5)}</span>
                                {daySchedule.break_start && (
                                  <span className="break-time">Break: {daySchedule.break_start?.slice(0, 5)}-{daySchedule.break_end?.slice(0, 5)}</span>
                                )}
                                <button className="schedule-delete-btn" onClick={() => deleteSchedule(daySchedule.id)} title="Remove">
                                  <Xmark width={12} height={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="schedule-day-off">OFF</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Days Off */}
                    {memberDaysOff.length > 0 && (
                      <div className="days-off-list">
                        <h4>🏖️ Scheduled Days Off</h4>
                        {memberDaysOff.map(d => (
                          <div key={d.id} className="day-off-item">
                            <span>{new Date(d.start_date).toLocaleDateString()} — {new Date(d.end_date).toLocaleDateString()}</span>
                            <span className="day-off-reason">{d.reason || 'No reason'}</span>
                            <button className="action-btn delete" onClick={() => deleteDayOff(d.id)}>
                              <Trash width={14} height={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Set Schedule — {selectedStaff?.full_name || selectedStaff?.username}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Day of Week *</label>
                  <select name="day_of_week" value={scheduleForm.day_of_week} onChange={(e) => setScheduleForm(p => ({ ...p, day_of_week: e.target.value }))} className="form-control">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm(p => ({ ...p, start_time: e.target.value }))} className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm(p => ({ ...p, end_time: e.target.value }))} className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Break Start</label>
                  <input type="time" value={scheduleForm.break_start} onChange={(e) => setScheduleForm(p => ({ ...p, break_start: e.target.value }))} className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Break End</label>
                  <input type="time" value={scheduleForm.break_end} onChange={(e) => setScheduleForm(p => ({ ...p, break_end: e.target.value }))} className="form-control" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={saving}>{saving ? 'Saving...' : 'Save Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Off Modal */}
      {showDayOffModal && (
        <div className="modal-overlay" onClick={() => setShowDayOffModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Day Off — {selectedStaff?.full_name || selectedStaff?.username}</h2>
              <button className="modal-close" onClick={() => setShowDayOffModal(false)}><Xmark width={20} height={20} /></button>
            </div>
            <form onSubmit={handleDayOffSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" value={dayOffForm.start_date} onChange={(e) => setDayOffForm(p => ({ ...p, start_date: e.target.value }))} className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input type="date" value={dayOffForm.end_date} onChange={(e) => setDayOffForm(p => ({ ...p, end_date: e.target.value }))} className="form-control" required />
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Reason</label>
                <input type="text" value={dayOffForm.reason} onChange={(e) => setDayOffForm(p => ({ ...p, reason: e.target.value }))} className="form-control" placeholder="e.g. Vacation, Sick leave..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowDayOffModal(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={saving}>{saving ? 'Saving...' : 'Add Day Off'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
