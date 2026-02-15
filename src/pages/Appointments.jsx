import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Search, Plus, Eye, EditPencil, Trash, User, Clock,
  Check, Xmark, Phone, Mail, WarningTriangle, List, GridPlus,
  UserPlus, RefreshDouble, Scissor
} from 'iconoir-react';
import { Table, Badge, Dropdown, Card, Toast, ToastContainer } from 'react-bootstrap';
import api from '../lib/api';
import SEO from '../components/SEO';
import AppointmentCalendar from '../components/AppointmentCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import './CRMPages.css';
import './BeautyPages.css';
import './AppointmentsPage.css';

const STATUS_MAP = {
  scheduled: { label: 'Scheduled', variant: 'warning', color: '#ffc107' },
  confirmed: { label: 'Confirmed', variant: 'info', color: '#17a2b8' },
  in_progress: { label: 'In Progress', variant: 'primary', color: '#667eea' },
  completed: { label: 'Completed', variant: 'success', color: '#28a745' },
  cancelled: { label: 'Cancelled', variant: 'danger', color: '#dc3545' },
  no_show: { label: 'No Show', variant: 'secondary', color: '#6c757d' },
};

const svgDots = (
  <svg width="16px" height="16px" viewBox="0 0 24 24" version="1.1">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <rect x="0" y="0" width="24" height="24"></rect>
      <circle fill="currentColor" cx="5" cy="12" r="2.5"></circle>
      <circle fill="currentColor" cx="12" cy="12" r="2.5"></circle>
      <circle fill="currentColor" cx="19" cy="12" r="2"></circle>
    </g>
  </svg>
);

export default function Appointments() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [viewMode, setViewMode] = useState('list');
  const [bookingStep, setBookingStep] = useState(1);
  
  // Pagination state
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const emptyForm = {
    customer_id: '', service_id: '', staff_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: '',
    notes: '', status: 'scheduled'
  };
  const [formData, setFormData] = useState(emptyForm);

  const emptyClientForm = { first_name: '', last_name: '', email: '', phone: '', gender: '', notes: '' };
  const [newClientData, setNewClientData] = useState(emptyClientForm);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, status: '', message: '' });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchAppointments = useCallback(async (pageNum = 1, limitNum = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterStaff) params.append('staff_id', filterStaff);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      params.append('page', pageNum);
      params.append('limit', limitNum);
      
      const data = await api.get(`/appointments?${params}`);
      if (data.success) {
        let list = data.data || [];
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(a =>
            (a.customer_first_name + ' ' + a.customer_last_name).toLowerCase().includes(s) ||
            (a.staff_name || '').toLowerCase().includes(s) ||
            (a.service_name || '').toLowerCase().includes(s)
          );
        }
        setAppointments(list);
        
        // Update pagination from API response
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            page: data.pagination.page,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages
          }));
        }
        
        setStats({
          total: data.pagination?.total || list.length,
          confirmed: list.filter(a => a.status === 'confirmed').length,
          completed: list.filter(a => a.status === 'completed').length,
          cancelled: list.filter(a => a.status === 'cancelled').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterStaff, fromDate, toDate, search]);

  const fetchAllAppointments = useCallback(async () => {
    try {
      const data = await api.get('/appointments?limit=500');
      if (data.success) {
        setAllAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch all appointments:', error);
    }
  }, []);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [staffData, contactsData, productsData] = await Promise.all([
        api.get('/staff'),
        api.get('/contacts?limit=500'),
        api.get('/products?category=service'),
      ]);
      if (staffData.success) setStaff(staffData.data || []);
      if (contactsData.success) setContacts(contactsData.data || []);
      if (productsData.success) setServices(productsData.data || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  }, []);

  useEffect(() => { fetchAppointments(pagination.page, pagination.limit); }, [pagination.page, pagination.limit, filterStatus, filterStaff, fromDate, toDate]);
  useEffect(() => { fetchAllAppointments(); }, [fetchAllAppointments]);
  useEffect(() => { fetchDropdownData(); }, [fetchDropdownData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeSelect = (time) => {
    setFormData(prev => ({ ...prev, booking_time: time }));
  };

  const getBookedSlotsForStaff = () => {
    if (!formData.staff_id || !formData.booking_date) return [];
    return allAppointments.filter(apt => {
      const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
      return apt.staff_id === parseInt(formData.staff_id) && 
             aptDate === formData.booking_date &&
             apt.status !== 'cancelled';
    });
  };

  const getServiceDuration = () => {
    if (!formData.service_id) return 60;
    const service = services.find(s => s.id === parseInt(formData.service_id));
    return service?.duration || 60;
  };

  const openCreateModal = (presetDate = null) => {
    setEditingItem(null);
    setBookingStep(1);
    setFormData({
      ...emptyForm,
      booking_date: presetDate 
        ? (presetDate instanceof Date ? presetDate.toISOString().split('T')[0] : presetDate)
        : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setBookingStep(1);
    const startTime = item.start_time ? new Date(item.start_time) : new Date();
    setFormData({
      customer_id: String(item.customer_id || ''),
      service_id: String(item.service_id || ''),
      staff_id: String(item.staff_id || ''),
      booking_date: startTime.toISOString().split('T')[0],
      booking_time: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      notes: item.notes || '',
      status: item.status || 'scheduled',
    });
    setShowModal(true);
  };

  const openViewModal = (item) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [hours, minutes] = formData.booking_time.split(':').map(Number);
      const startDateTime = new Date(formData.booking_date);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const duration = getServiceDuration();
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const payload = {
        customer_id: formData.customer_id,
        service_id: formData.service_id,
        staff_id: formData.staff_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: formData.notes,
        status: formData.status
      };

      if (!payload.customer_id || !payload.service_id || !payload.staff_id || !formData.booking_time) {
        showToast('error', 'Please fill in all required fields');
        setSaving(false);
        return;
      }

      const data = editingItem
        ? await api.patch(`/appointments/${editingItem.id}`, payload)
        : await api.post('/appointments', payload);

      if (data.success) {
        showToast('success', data.message || (editingItem ? 'Appointment updated' : 'Appointment booked'));
        fetchAppointments(pagination.page, pagination.limit);
        fetchAllAppointments();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      console.error('Save appointment error:', error);
      showToast('error', error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      const data = await api.delete(`/appointments/${id}`);
      if (data.success) {
        showToast('success', 'Appointment deleted');
        fetchAppointments(pagination.page, pagination.limit);
        fetchAllAppointments();
      }
    } catch (error) {
      showToast('error', 'Failed to delete');
    }
  };

  const openConfirmModal = (id, newStatus) => {
    const statusLabel = STATUS_MAP[newStatus]?.label || newStatus;
    setConfirmModal({
      show: true,
      id,
      status: newStatus,
      message: `Are you sure you want to mark this appointment as "${statusLabel}"?`
    });
  };

  const handleStatusChange = async () => {
    const { id, status: newStatus } = confirmModal;
    setConfirmModal({ show: false, id: null, status: '', message: '' });
    try {
      const data = await api.patch(`/appointments/${id}`, { status: newStatus });
      if (data.success) {
        showToast('success', `Status updated to ${STATUS_MAP[newStatus]?.label}`);
        fetchAppointments(pagination.page, pagination.limit);
        fetchAllAppointments();
        if (showViewModal) setShowViewModal(false);
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/contacts', newClientData);
      if (data.success) {
        showToast('success', 'Client created successfully');
        const contactsData = await api.get('/contacts?limit=500');
        if (contactsData.success) {
          setContacts(contactsData.data || []);
          const newContact = contactsData.data.find(c => 
            c.email === newClientData.email || c.phone === newClientData.phone
          );
          if (newContact) {
            setFormData(prev => ({ ...prev, customer_id: newContact.id }));
          }
        }
        setShowNewClientModal(false);
        setNewClientData(emptyClientForm);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDateSelectFromCalendar = (date) => {
    // Set both from and to as the same date when clicking a calendar day
    setFromDate(date);
    setToDate(date);
  };

  const selectedService = services.find(s => s.id === parseInt(formData.service_id));
  const selectedStaff = staff.find(s => s.id === parseInt(formData.staff_id));
  const selectedClient = contacts.find(c => c.id === parseInt(formData.customer_id));

  return (
    <div className="appointments-page">
      <SEO page="appointments" />

      {/* Bootstrap Toast Notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          show={toast.show} 
          onClose={() => setToast({ show: false, type: '', message: '' })}
          bg={toast.type === 'success' ? 'success' : 'danger'}
          delay={4000}
          autohide
        >
          <Toast.Header closeButton>
            {toast.type === 'success' ? (
              <Check width={18} height={18} className="me-2 text-success" />
            ) : (
              <WarningTriangle width={18} height={18} className="me-2 text-danger" />
            )}
            <strong className="me-auto">
              {toast.type === 'success' ? 'Success' : 'Error'}
            </strong>
          </Toast.Header>
          <Toast.Body className={toast.type === 'success' ? 'text-white' : 'text-white'}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Page Header */}
      <div className="page-header-area">
        <div className="page-title">
          <h2><Calendar width={24} height={24} /> Appointments</h2>
          <p className="text-muted">Manage your bookings and schedule</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-refresh" onClick={() => { fetchAppointments(pagination.page, pagination.limit); fetchAllAppointments(); }}>
            <RefreshDouble width={18} height={18} />
          </button>
          <button className="btn-add-new" onClick={() => openCreateModal()}>
            <Plus width={18} height={18} /> New Appointment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card-mini">
          <div className="stat-icon-mini"><Calendar width={20} height={20} /></div>
          <div className="stat-content">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
        <div className="stat-card-mini confirmed">
          <div className="stat-icon-mini"><Check width={20} height={20} /></div>
          <div className="stat-content">
            <span className="stat-number">{stats.confirmed}</span>
            <span className="stat-label">Confirmed</span>
          </div>
        </div>
        <div className="stat-card-mini completed">
          <div className="stat-icon-mini"><Check width={20} height={20} /></div>
          <div className="stat-content">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card-mini cancelled">
          <div className="stat-icon-mini"><Xmark width={20} height={20} /></div>
          <div className="stat-content">
            <span className="stat-number">{stats.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <Card className="appointments-card">
        <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="view-tabs">
              <button className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                <List width={16} height={16} /> List
              </button>
              <button className={`view-tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
                <GridPlus width={16} height={16} /> Calendar
              </button>
            </div>
            <div className="search-box">
              <Search width={16} height={16} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="date-range-filter">
              <input
                type="date"
                className="date-filter"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setToDate(''); }}
                placeholder="From"
                title="From Date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="date-filter"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To"
                title="To Date"
              />
              {(fromDate || toDate) && (
                <button 
                  className="clear-dates-btn" 
                  onClick={() => { setFromDate(''); setToDate(''); }}
                  title="Clear dates"
                >
                  ×
                </button>
              )}
            </div>
            <select className="status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="p-3">
              <AppointmentCalendar
                appointments={allAppointments}
                selectedDate={fromDate || new Date().toISOString().split('T')[0]}
                onDateSelect={handleDateSelectFromCalendar}
                onAppointmentClick={openViewModal}
                onNewAppointment={openCreateModal}
              />
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              {loading ? (
                <div className="loading-area">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : appointments.length === 0 ? (
                <div className="empty-state">
                  <Calendar width={64} height={64} />
                  <h3>No appointments found</h3>
                  <p>No appointments for the selected date. Click the + button to create one.</p>
                </div>
              ) : (
                <Table responsive hover className="appointments-table mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Client</th>
                      <th>Service</th>
                      <th>Staff</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt, index) => {
                      const statusInfo = STATUS_MAP[appt.status] || STATUS_MAP.scheduled;
                      return (
                        <tr key={appt.id}>
                          <td><strong>{String(index + 1).padStart(2, '0')}</strong></td>
                          <td>
                            <div className="client-cell">
                              <div className={`avatar-sm ${appt.customer_gender || ''}`}>
                                {appt.customer_first_name?.charAt(0) || '?'}{appt.customer_last_name?.charAt(0) || ''}
                              </div>
                              <div className="client-info">
                                <span className="client-name">{appt.customer_first_name} {appt.customer_last_name}</span>
                                <div className="client-contact">
                                  {appt.customer_email && (
                                    <a href={`mailto:${appt.customer_email}`} className="client-contact-icon" title={appt.customer_email}>
                                      <Mail width={12} height={12} />
                                    </a>
                                  )}
                                  {appt.customer_phone && (
                                    <a href={`tel:${appt.customer_phone}`} className="client-contact-icon" title={appt.customer_phone}>
                                      <Phone width={12} height={12} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{appt.service_name || '-'}</td>
                          <td>{appt.staff_name || '-'}</td>
                          <td>
                            <div className="datetime-cell">
                              <span className="date-text">{formatDate(appt.start_time)}</span>
                              <span className="time-text">{formatTime(appt.start_time)}</span>
                            </div>
                          </td>
                          <td>
                            <Badge bg={`${statusInfo.variant} light`}>{statusInfo.label}</Badge>
                          </td>
                          <td className="price-cell">AED {parseFloat(appt.service_price || 0).toFixed(0)}</td>
                          <td className="text-end">
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="light" className="action-dropdown">
                                {svgDots}
                              </Dropdown.Toggle>
                              <Dropdown.Menu renderOnMount popperConfig={{ strategy: 'fixed' }}>
                                <Dropdown.Item onClick={() => openViewModal(appt)}>
                                  <Eye width={14} height={14} className="me-2" /> View
                                </Dropdown.Item>
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Item onClick={() => openEditModal(appt)}>
                                    <EditPencil width={14} height={14} className="me-2" /> Edit
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Divider />
                                {appt.status !== 'confirmed' && appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Item onClick={() => openConfirmModal(appt.id, 'confirmed')}>
                                    <Check width={14} height={14} className="me-2" /> Confirm
                                  </Dropdown.Item>
                                )}
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Item onClick={() => openConfirmModal(appt.id, 'completed')}>
                                    <Check width={14} height={14} className="me-2" /> Complete
                                  </Dropdown.Item>
                                )}
                                {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                  <Dropdown.Item onClick={() => openConfirmModal(appt.id, 'cancelled')} className="text-danger">
                                    <Xmark width={14} height={14} className="me-2" /> Cancel
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => handleDelete(appt.id)} className="text-danger">
                                  <Trash width={14} height={14} className="me-2" /> Delete
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
              
              {/* Pagination */}
              {!loading && appointments.length > 0 && pagination.totalPages > 1 && (
                <div className="pagination-wrapper">
                  <div className="pagination-info">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} appointments
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className="pagination-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                    >
                      First
                    </button>
                    <button 
                      className="pagination-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button 
                      className="pagination-btn"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </button>
                    <button 
                      className="pagination-btn"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.totalPages }))}
                    >
                      Last
                    </button>
                  </div>
                  <div className="pagination-limit">
                    <select 
                      value={pagination.limit} 
                      onChange={(e) => setPagination({ page: 1, limit: parseInt(e.target.value), total: pagination.total, totalPages: Math.ceil(pagination.total / parseInt(e.target.value)) })}
                    >
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>


      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container booking-modal-new" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <h2>{editingItem ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>

            {/* Steps */}
            <div className="booking-steps-new">
              <div className={`step-item ${bookingStep >= 1 ? 'active' : ''} ${bookingStep > 1 ? 'done' : ''}`}>
                <span className="step-number">1</span>
                <span className="step-text">Service</span>
              </div>
              <div className="step-line"></div>
              <div className={`step-item ${bookingStep >= 2 ? 'active' : ''} ${bookingStep > 2 ? 'done' : ''}`}>
                <span className="step-number">2</span>
                <span className="step-text">Schedule</span>
              </div>
              <div className="step-line"></div>
              <div className={`step-item ${bookingStep >= 3 ? 'active' : ''}`}>
                <span className="step-number">3</span>
                <span className="step-text">Client</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="booking-form-new">
              {/* Step 1 */}
              {bookingStep === 1 && (
                <div className="step-content">
                  <div className="form-section">
                    <label className="section-label">Select Service</label>
                    <div className="selection-grid">
                      {services.map(s => (
                        <div 
                          key={s.id}
                          className={`selection-card ${formData.service_id === String(s.id) ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, service_id: String(s.id) }))}
                        >
                          <div className="selection-card-title">{s.name}</div>
                          <div className="selection-card-meta">
                            <span><Clock width={12} height={12} /> {s.duration || 60}min</span>
                            <span className="price">AED {parseFloat(s.unit_price || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="section-label">Select Staff</label>
                    <div className="staff-selection">
                      {staff.filter(s => s.is_active).map(s => (
                        <div 
                          key={s.id}
                          className={`staff-option ${formData.staff_id === String(s.id) ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, staff_id: String(s.id) }))}
                        >
                          <div className="staff-avatar-sm">{(s.full_name || s.username)?.charAt(0)}</div>
                          <span>{s.full_name || s.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {bookingStep === 2 && (
                <div className="step-content">
                  <div className="form-section">
                    <label className="section-label">Select Date</label>
                    <input 
                      type="date" 
                      name="booking_date"
                      value={formData.booking_date}
                      onChange={handleInputChange}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-section">
                    <label className="section-label">Select Time</label>
                    <TimeSlotPicker
                      selectedDate={formData.booking_date}
                      selectedTime={formData.booking_time}
                      onTimeSelect={handleTimeSelect}
                      bookedSlots={getBookedSlotsForStaff()}
                      staffId={formData.staff_id}
                      duration={getServiceDuration()}
                    />
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {bookingStep === 3 && (
                <div className="step-content">
                  <div className="form-section">
                    <div className="section-label-row">
                      <label className="section-label">Select Client</label>
                      <button type="button" className="btn-link" onClick={() => setShowNewClientModal(true)}>
                        <UserPlus width={14} height={14} /> Add New
                      </button>
                    </div>
                    <select 
                      name="customer_id" 
                      value={formData.customer_id} 
                      onChange={handleInputChange} 
                      className="form-input"
                    >
                      <option value="">Choose a client...</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-section">
                    <label className="section-label">Notes (Optional)</label>
                    <textarea 
                      name="notes" 
                      value={formData.notes} 
                      onChange={handleInputChange} 
                      className="form-input"
                      rows={3}
                      placeholder="Any special requests..."
                    />
                  </div>

                  {/* Summary */}
                  <div className="booking-summary-card">
                    <h4>Summary</h4>
                    <div className="summary-item">
                      <span>Service</span>
                      <strong>{selectedService?.name || '-'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Staff</span>
                      <strong>{selectedStaff?.full_name || selectedStaff?.username || '-'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Date</span>
                      <strong>{formData.booking_date || '-'}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Time</span>
                      <strong>{formData.booking_time || '-'}</strong>
                    </div>
                    <div className="summary-item total">
                      <span>Total</span>
                      <strong>AED {parseFloat(selectedService?.unit_price || 0).toFixed(0)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="modal-footer-new">
                {bookingStep > 1 && (
                  <button type="button" className="btn-secondary" onClick={() => setBookingStep(prev => prev - 1)}>
                    Back
                  </button>
                )}
                <div className="footer-spacer"></div>
                {bookingStep < 3 ? (
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => setBookingStep(prev => prev + 1)}
                    disabled={
                      (bookingStep === 1 && (!formData.service_id || !formData.staff_id)) ||
                      (bookingStep === 2 && (!formData.booking_date || !formData.booking_time))
                    }
                  >
                    Continue
                  </button>
                ) : (
                  <button type="submit" className="btn-primary" disabled={saving || !formData.customer_id}>
                    {saving ? 'Booking...' : 'Confirm Booking'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-container modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <h2>Add Client</h2>
              <button className="modal-close-btn" onClick={() => setShowNewClientModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="modal-form-simple">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" value={newClientData.first_name} onChange={(e) => setNewClientData(prev => ({ ...prev, first_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" value={newClientData.last_name} onChange={(e) => setNewClientData(prev => ({ ...prev, last_name: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input type="tel" value={newClientData.phone} onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={newClientData.gender} onChange={(e) => setNewClientData(prev => ({ ...prev, gender: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={newClientData.email} onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={newClientData.notes} onChange={(e) => setNewClientData(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Any special notes..." />
              </div>
              <div className="modal-footer-new">
                <button type="button" className="btn-secondary" onClick={() => setShowNewClientModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <h2>Appointment Details</h2>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <div className="view-modal-body">
              <div className="view-detail-row">
                <User width={16} height={16} />
                <div>
                  <label>Client</label>
                  <p>{viewingItem.customer_first_name} {viewingItem.customer_last_name}</p>
                </div>
              </div>
              <div className="view-detail-row">
                <Scissor width={16} height={16} />
                <div>
                  <label>Service</label>
                  <p>{viewingItem.service_name}</p>
                </div>
              </div>
              <div className="view-detail-row">
                <User width={16} height={16} />
                <div>
                  <label>Staff</label>
                  <p>{viewingItem.staff_name}</p>
                </div>
              </div>
              <div className="view-detail-row">
                <Calendar width={16} height={16} />
                <div>
                  <label>Date & Time</label>
                  <p>{formatDate(viewingItem.start_time)} at {formatTime(viewingItem.start_time)}</p>
                </div>
              </div>
              <div className="view-status-row">
                <Badge bg={`${STATUS_MAP[viewingItem.status]?.variant} light`}>{STATUS_MAP[viewingItem.status]?.label}</Badge>
                <span className="view-price">AED {parseFloat(viewingItem.service_price || 0).toFixed(0)}</span>
              </div>
              <div className="view-actions-row">
                <button className="btn-action" onClick={() => { setShowViewModal(false); openEditModal(viewingItem); }}>
                  <EditPencil width={16} height={16} /> Edit
                </button>
                <button className="btn-action success" onClick={() => openConfirmModal(viewingItem.id, 'completed')}>
                  <Check width={16} height={16} /> Complete
                </button>
                <button className="btn-action danger" onClick={() => openConfirmModal(viewingItem.id, 'cancelled')}>
                  <Xmark width={16} height={16} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal({ show: false, id: null, status: '', message: '' })}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              {confirmModal.status === 'cancelled' ? (
                <Xmark width={32} height={32} />
              ) : (
                <Check width={32} height={32} />
              )}
            </div>
            <h3>Confirm Status Change</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setConfirmModal({ show: false, id: null, status: '', message: '' })}
              >
                Cancel
              </button>
              <button 
                className={`btn-confirm ${confirmModal.status === 'cancelled' ? 'danger' : 'success'}`}
                onClick={handleStatusChange}
              >
                Yes, {STATUS_MAP[confirmModal.status]?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


