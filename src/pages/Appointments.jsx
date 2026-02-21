import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Search, Plus, Eye, EditPencil, Trash, User, Clock,
  Check, Xmark, Phone, Mail, WarningTriangle, List, GridPlus,
  UserPlus, RefreshDouble, Scissor, Gift, Percentage, CreditCard
} from 'iconoir-react';
import { Table, Badge, Dropdown, Card, Toast, ToastContainer } from 'react-bootstrap';
import Swal from 'sweetalert2';
import api from '../lib/api';
import SEO from '../components/SEO';
import AppointmentCalendar from '../components/AppointmentCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import useCurrency from '../hooks/useCurrency';
import { showContactSupport } from '../utils/supportAlert';
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
  const { currency } = useCurrency();
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [staffDayAppointments, setStaffDayAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
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
    customer_id: '', service_id: '', staff_id: '', branch_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: '',
    notes: '', status: 'scheduled'
  };
  const [formData, setFormData] = useState(emptyForm);

  const emptyClientForm = { first_name: '', last_name: '', email: '', phone: '', gender: '', notes: '' };
  const [newClientData, setNewClientData] = useState(emptyClientForm);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, status: '', message: '' });

  // Checkout modal state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutAppt, setCheckoutAppt] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    payment_method: 'cash', gift_card_code: '', discount_amount: 0, discount_type: 'fixed', tax_rate: 5, tip: 0, pay_now: true
  });
  const [gcBalance, setGcBalance] = useState(null);
  const [gcChecking, setGcChecking] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState('idle'); // idle | validating | valid | invalid
  const [promoResult, setPromoResult] = useState(null);   // { promotion_id, discount_code_id, type, discount_value, discount_amount, message }
  const [promoError, setPromoError] = useState('');

  // Working hours state
  const [workingHours, setWorkingHours] = useState(null);

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
      // Ensure dates are in YYYY-MM-DD format (remove time if present)
      if (fromDate) {
        const fromDateFormatted = fromDate.split('T')[0];
        params.append('from_date', fromDateFormatted);
      }
      if (toDate) {
        const toDateFormatted = toDate.split('T')[0];
        params.append('to_date', toDateFormatted);
      }
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

  const fetchAllAppointments = useCallback(async (force = false) => {
    if (!force && viewMode !== 'calendar') {
      return;
    }
    try {
      const data = await api.get('/appointments?all=true&limit=10000');
      if (data.success) {
        setAllAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch all appointments:', error);
    }
  }, [viewMode]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [staffData, contactsData, productsData, branchesData] = await Promise.all([
        api.get('/staff'),
        api.get('/contacts?limit=500'),
        api.get('/products?active=true'),
        api.get('/branches?active=true'),
      ]);
      if (staffData.success) setStaff(staffData.data || []);
      if (contactsData.success) setContacts(contactsData.data || []);
      if (productsData.success) setServices(productsData.data || []);
      if (branchesData.success) setBranches(branchesData.data || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  }, []);

  const fetchStaffDayAppointments = useCallback(async () => {
    if (!showModal || bookingStep < 2 || !formData.staff_id || !formData.booking_date) {
      setStaffDayAppointments([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('all', 'true');
      params.append('limit', '500');
      params.append('staff_id', String(formData.staff_id));
      params.append('date', formData.booking_date);
      const data = await api.get(`/appointments?${params}`);
      if (data.success) {
        setStaffDayAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff day appointments:', error);
    }
  }, [showModal, bookingStep, formData.staff_id, formData.booking_date]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filterStatus, filterStaff, fromDate, toDate, search]);

  useEffect(() => { 
    fetchAppointments(pagination.page, pagination.limit); 
  }, [pagination.page, pagination.limit, filterStatus, filterStaff, fromDate, toDate, search, fetchAppointments]);

  // Fetch working hours when staff and date are selected
  useEffect(() => {
    const fetchWorkingHours = async () => {
      if (!formData.staff_id || !formData.booking_date) {
        setWorkingHours(null);
        return;
      }

      try {
        const data = await api.get(`/appointments/staff/${formData.staff_id}/availability?date=${formData.booking_date}`);
        if (data.success && data.data?.workingHours) {
          const wh = data.data.workingHours;
          // Convert TIME format (HH:MM:SS) to hours
          const [startH, startM] = wh.start.split(':').map(Number);
          const [endH, endM] = wh.end.split(':').map(Number);
          setWorkingHours({
            start: startH + startM / 60,
            end: endH + endM / 60
          });
        } else {
          // Default to 9 AM - 9 PM if no schedule found
          setWorkingHours({ start: 9, end: 21 });
        }
      } catch (error) {
        console.error('Error fetching working hours:', error);
        // Default to 9 AM - 9 PM on error
        setWorkingHours({ start: 9, end: 21 });
      }
    };

    fetchWorkingHours();
  }, [formData.staff_id, formData.booking_date]);
  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchAllAppointments(true);
    }
  }, [viewMode, fetchAllAppointments]);

  useEffect(() => {
    fetchStaffDayAppointments();
  }, [fetchStaffDayAppointments]);

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
    return staffDayAppointments.filter((apt) => {
      const isSameStaff = apt.staff_id === parseInt(formData.staff_id);
      const notCancelled = apt.status !== 'cancelled';
      const notCurrentEdit = !editingItem || apt.id !== editingItem.id;
      return isSameStaff && notCancelled && notCurrentEdit;
    });
  };

  const getServiceDuration = () => {
    if (!formData.service_id) return 60;
    const service = services.find(s => s.id === parseInt(formData.service_id));
    if (!service) return 60;
    // Total slot = service duration + processing time + finishing time
    return (service.duration || 60) + (service.processing_time || 0) + (service.finishing_time || 0);
  };

  // Promo validation
  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoStatus('validating');
    setPromoError('');
    try {
      const data = await api.post('/promotions/validate', {
        code: promoCode.trim(),
        service_id: formData.service_id ? parseInt(formData.service_id) : undefined,
        subtotal: parseFloat(selectedService?.unit_price || 0)
      });
      if (data.success && data.data?.valid) {
        setPromoResult(data.data);
        setPromoStatus('valid');
      } else {
        setPromoError(data.message || 'Invalid code');
        setPromoStatus('invalid');
        setPromoResult(null);
      }
    } catch (err) {
      setPromoError(err.message || 'Invalid promo code');
      setPromoStatus('invalid');
      setPromoResult(null);
    }
  };

  const clearPromo = () => {
    setPromoCode('');
    setPromoStatus('idle');
    setPromoResult(null);
    setPromoError('');
  };

  const openCreateModal = (presetDate = null) => {
    setEditingItem(null);
    setBookingStep(1);
    clearPromo();
    let dateStr = new Date().toISOString().split('T')[0];
    if (presetDate) {
      if (presetDate instanceof Date) {
        dateStr = `${presetDate.getFullYear()}-${String(presetDate.getMonth() + 1).padStart(2, '0')}-${String(presetDate.getDate()).padStart(2, '0')}`;
      } else {
        dateStr = presetDate;
      }
    }
    setFormData({
      ...emptyForm,
      booking_date: dateStr
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setBookingStep(1);
    const startTime = item.start_time ? new Date(item.start_time) : new Date();
    // Use local date parts to avoid UTC date shift near midnight
    const yr = startTime.getFullYear();
    const mo = String(startTime.getMonth() + 1).padStart(2, '0');
    const dy = String(startTime.getDate()).padStart(2, '0');
    setFormData({
      customer_id: String(item.customer_id || ''),
      service_id: String(item.service_id || ''),
      staff_id: String(item.staff_id || ''),
      booking_date: `${yr}-${mo}-${dy}`,
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

  const handleSubmit = async () => {
    
    // Only allow submission on step 4 (Review)
    if (bookingStep !== 4) {
      // If not on review step, advance to next step instead
      if (bookingStep < 4) {
        setBookingStep(prev => prev + 1);
      }
      return;
    }
    
    setSaving(true);
    try {
      const [hours, minutes] = formData.booking_time.split(':').map(Number);
      // Parse date parts manually to avoid UTC-midnight shift in negative-offset timezones
      const [year, month, day] = formData.booking_date.split('-').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
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

      // Attach promo data if valid
      if (promoStatus === 'valid' && promoResult) {
        payload.promo_code = promoCode.trim();
        payload.promotion_id = promoResult.promotion_id;
        payload.discount_code_id = promoResult.discount_code_id;
        payload.discount_amount = promoResult.discount_amount;
        payload.discount_type = promoResult.type;
      }

      if (!payload.customer_id || !payload.service_id || !payload.staff_id || !formData.booking_time) {
        showToast('error', 'Please fill in all required fields');
        setSaving(false);
        return;
      }

      const data = editingItem
        ? await api.patch(`/appointments/${editingItem.id}`, payload)
        : await api.post('/appointments', payload);

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: editingItem ? 'Updated!' : '🎉 Booked!',
          html: promoStatus === 'valid'
            ? `<p>${data.message || 'Appointment booked successfully'}</p><p style="color:#22c55e;font-weight:600">Promo applied — you saved ${currency} ${(promoResult?.discount_amount || 0).toFixed(2)}!</p>`
            : `<p>${data.message || 'Appointment booked successfully'}</p>`,
          timer: 2500,
          showConfirmButton: false
        });
        fetchAppointments(pagination.page, pagination.limit);
        fetchAllAppointments();
        setShowModal(false);
        setBookingStep(1); // Reset to step 1 when modal closes
        clearPromo();
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

  const handleDelete = () => showContactSupport();

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

  // ── Checkout Flow ──
  const openCheckout = (appt) => {
    setCheckoutAppt(appt);
    setCheckoutForm({ payment_method: 'cash', gift_card_code: '', discount_amount: 0, discount_type: 'fixed', tax_rate: 5, tip: 0, pay_now: true });
    setCheckoutResult(null);
    setGcBalance(null);
    setShowCheckout(true);
    if (showViewModal) setShowViewModal(false);
  };

  const checkoutSubtotal = checkoutAppt ? parseFloat(checkoutAppt.service_price || 0) + parseFloat(checkoutForm.tip || 0) : 0;
  const checkoutDiscount = checkoutForm.discount_type === 'percentage'
    ? checkoutSubtotal * (checkoutForm.discount_amount / 100)
    : parseFloat(checkoutForm.discount_amount || 0);
  const checkoutAfterDisc = checkoutSubtotal - checkoutDiscount;
  const checkoutTax = checkoutAfterDisc * (checkoutForm.tax_rate / 100);
  const checkoutTotal = checkoutAfterDisc + checkoutTax;

  // Check gift card balance
  const checkGiftCardBalance = async (code) => {
    if (!code || code.length < 4) { setGcBalance(null); return; }
    setGcChecking(true);
    try {
      const res = await api.get(`/gift-cards/check/${encodeURIComponent(code)}`);
      if (res.success) {
        setGcBalance(res.data);
      } else {
        setGcBalance({ error: res.message || 'Not found' });
      }
    } catch {
      setGcBalance({ error: 'Gift card not found' });
    } finally {
      setGcChecking(false);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutAppt) return;
    // Validate gift card code if payment is gift card
    if (checkoutForm.payment_method === 'gift_card' && !checkoutForm.gift_card_code) {
      showToast('error', 'Please enter a gift card code');
      return;
    }
    if (checkoutForm.payment_method === 'gift_card' && gcBalance && !gcBalance.error) {
      if (parseFloat(gcBalance.remaining_value) < checkoutTotal) {
        showToast('error', `Insufficient gift card balance (${parseFloat(gcBalance.remaining_value).toFixed(2)} available)`);
        return;
      }
    }
    setCheckingOut(true);
    try {
      const data = await api.post(`/appointments/${checkoutAppt.id}/checkout`, checkoutForm);
      if (data.success) {
        setCheckoutResult(data.data);
        showToast('success', data.message || 'Checkout complete!');
        fetchAppointments(pagination.page, pagination.limit);
        fetchAllAppointments();
      } else {
        showToast('error', data.message || 'Checkout failed');
      }
    } catch (error) {
      showToast('error', error.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
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

  // Filter services and staff by selected branch
  const filteredServices = formData.branch_id
    ? services.filter(s => String(s.branch_id) === formData.branch_id || !s.branch_id)
    : services;

  const filteredStaff = formData.branch_id
    ? staff.filter(s => s.is_active && (String(s.branch_id) === formData.branch_id || !s.branch_id))
    : staff.filter(s => s.is_active);

  // Pricing calculations for booking summary
  const bookingPricing = useMemo(() => {
    const subtotal = parseFloat(selectedService?.unit_price || 0);
    const promoDiscount = promoStatus === 'valid' && promoResult ? parseFloat(promoResult.discount_amount || 0) : 0;
    const afterDiscount = Math.max(0, subtotal - promoDiscount);
    const taxRate = 5; // VAT %
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;
    return { subtotal, promoDiscount, afterDiscount, taxRate, taxAmount, total };
  }, [selectedService, promoStatus, promoResult]);

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

      {/* ── Print-only header (hidden on screen, shown on print) ── */}
      <div className="appt-print-header">
        <div className="appt-print-logo">
          <img src="/assets/images/logos/trasealla-solutions-logo.png" alt="Trasealla" />
        </div>
        <div className="appt-print-meta">
          <h1>Appointments Report</h1>
          <p>Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Page Header */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Calendar width={26} height={26} /></div>
          <div>
            <h1 className="module-hero-title">Appointments</h1>
            <p className="module-hero-sub">Manage your bookings and schedule</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline btn-refresh" data-tooltip="Refresh list" onClick={() => { fetchAppointments(pagination.page, pagination.limit); fetchAllAppointments(); }}>
            <RefreshDouble width={24} height={24} />
          </button>
          <button className="module-btn module-btn-outline btn-export-csv" data-tooltip="Download as Excel" onClick={async () => {
            try {
              // Fetch all appointments for export
              const data = await api.get('/appointments?all=true&limit=10000');
              const allAppts = data.success ? (data.data || []) : [];
              
              const rows = [
                ['ID', 'Client', 'Service', 'Staff', 'Date', 'Time', 'Status', 'Price', 'Payment Status', 'Notes'],
                ...allAppts.map(a => [
                  a.id,
                  `${a.customer_first_name || ''} ${a.customer_last_name || ''}`.trim() || '-',
                  a.service_name || '-',
                  a.staff_name || '-',
                  a.start_time ? new Date(a.start_time).toLocaleDateString() : '-',
                  a.start_time ? new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                  STATUS_MAP[a.status]?.label || a.status || '-',
                  a.service_price || 0,
                  a.payment_status || '-',
                  (a.notes || '').replace(/"/g, '""'),
                ])
              ];
              const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `appointments-all-${new Date().toISOString().slice(0,10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('Export error:', error);
              showToast('error', 'Failed to export appointments');
            }
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Excel
          </button>
          <button className="module-btn module-btn-outline btn-print" data-tooltip="Print all appointments" onClick={async () => {
            try {
              // Ensure we have all appointments loaded
              const data = await api.get('/appointments?all=true&limit=10000');
              if (data.success && data.data) {
                // Create a hidden print table with all appointments
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Appointments Report</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          h1 { margin: 0 0 10px; }
                          p { margin: 0 0 20px; color: #666; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; }
                          td { padding: 8px 10px; border-bottom: 1px solid #e9ecef; }
                          tr:hover { background: #f8f9fa; }
                        </style>
                      </head>
                      <body>
                        <h1>Appointments Report</h1>
                        <p>Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p>Total Appointments: ${data.data.length}</p>
                        <table>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Client</th>
                              <th>Service</th>
                              <th>Staff</th>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Status</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${data.data.map(a => `
                              <tr>
                                <td>${a.id}</td>
                                <td>${(a.customer_first_name || '') + ' ' + (a.customer_last_name || '')}</td>
                                <td>${a.service_name || '-'}</td>
                                <td>${a.staff_name || '-'}</td>
                                <td>${a.start_time ? new Date(a.start_time).toLocaleDateString() : '-'}</td>
                                <td>${a.start_time ? new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td>${STATUS_MAP[a.status]?.label || a.status || '-'}</td>
                                <td>${a.service_price || 0}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                  }, 250);
                }
              } else {
                window.print();
              }
            } catch (error) {
              console.error('Print error:', error);
              window.print();
            }
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button className="module-btn module-btn-primary" data-tooltip="Book new appointment" onClick={() => openCreateModal()}>
            <Plus width={16} height={16} /> New Appointment
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
                onChange={(e) => {
                  const newFromDate = e.target.value;
                  setFromDate(newFromDate);
                  // If toDate is before new fromDate, clear it
                  if (toDate && newFromDate && toDate < newFromDate) {
                    setToDate('');
                  }
                }}
                placeholder="From"
                title="From Date"
                max={toDate || undefined}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="date-filter"
                value={toDate}
                onChange={(e) => {
                  const newToDate = e.target.value;
                  // Validate that toDate is not before fromDate
                  if (fromDate && newToDate && newToDate < fromDate) {
                    showToast('error', 'End date cannot be before start date');
                    return;
                  }
                  setToDate(newToDate);
                }}
                placeholder="To"
                title="To Date"
                min={fromDate || undefined}
              />
              {(fromDate || toDate) && (
                <button 
                  className="clear-dates-btn" 
                  onClick={() => { 
                    setFromDate(''); 
                    setToDate('');
                    // Reset pagination when clearing filters
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
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
                      <th className="text-end appt-no-print">Action</th>
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
                          <td className="price-cell">{currency} {parseFloat(appt.service_price || 0).toFixed(0)}</td>
                          <td className="text-end appt-no-print">
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="light" className="action-dropdown" data-tooltip="Actions">
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
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Divider />
                                )}
                                {appt.status !== 'confirmed' && appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Item onClick={() => openConfirmModal(appt.id, 'confirmed')}>
                                    <Check width={14} height={14} className="me-2" /> Confirm
                                  </Dropdown.Item>
                                )}
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <Dropdown.Item onClick={() => openCheckout(appt)} className="text-success fw-semibold">
                                    <Check width={14} height={14} className="me-2" /> Checkout
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
        <div className="modal-overlay" onClick={() => { setShowModal(false); setBookingStep(1); }}>
          <div className="modal-container booking-modal-new" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <h2>{editingItem ? 'Edit Appointment' : '✨ New Appointment'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowModal(false); setBookingStep(1); }}>
                <Xmark width={20} height={20} />
              </button>
            </div>

            {/* Steps - 4 step flow */}
            <div className="booking-steps-new">
              {[
                { num: 1, label: 'Service' },
                { num: 2, label: 'Schedule' },
                { num: 3, label: 'Client' },
                { num: 4, label: 'Review' }
              ].map((step, idx) => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
                  {idx > 0 && <div className="step-line"></div>}
                  <div 
                    className={`step-item ${bookingStep >= step.num ? 'active' : ''} ${bookingStep > step.num ? 'done' : ''}`}
                    onClick={() => { if (bookingStep > step.num) setBookingStep(step.num); }}
                    style={{ cursor: bookingStep > step.num ? 'pointer' : 'default' }}
                  >
                    <span className="step-number">{bookingStep > step.num ? '✓' : step.num}</span>
                    <span className="step-text">{step.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="booking-form-new">
              {/* Step 1: Service & Staff */}
              {bookingStep === 1 && (
                <div className="step-content">
                  {branches.length > 1 && (
                    <div className="form-section" style={{ paddingBottom: 12 }}>
                      <label className="section-label">Select Branch</label>
                      <select
                        className="form-input"
                        value={formData.branch_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value, service_id: '', staff_id: '' }))}
                      >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                          <option key={b.id} value={String(b.id)}>{b.name} {b.is_headquarters ? '(HQ)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-section">
                    <label className="section-label">Select Service</label>
                    <div className="selection-grid">
                      {filteredServices.length > 0 ? filteredServices.map(s => (
                        <div 
                          key={s.id}
                          className={`selection-card ${formData.service_id === String(s.id) ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, service_id: String(s.id) }))}
                        >
                          <div className="selection-card-title">{s.name}</div>
                          <div className="selection-card-meta">
                            <span><Clock width={12} height={12} /> {s.duration || 60}min</span>
                            <span className="price">{currency} {parseFloat(s.unit_price || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-selection-msg">No services available{formData.branch_id ? ' for this branch' : ''}. Add services in Settings.</div>
                      )}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="section-label">Select Staff</label>
                    <div className="staff-selection">
                      {filteredStaff.length > 0 ? filteredStaff.map(s => (
                        <div 
                          key={s.id}
                          className={`staff-option ${formData.staff_id === String(s.id) ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, staff_id: String(s.id) }))}
                        >
                          <div className="staff-avatar-sm">{(s.full_name || s.username)?.charAt(0)}</div>
                          <span>{s.full_name || s.username}</span>
                          {s.branch_name && <small style={{ opacity: 0.6, fontSize: 10 }}>{s.branch_name}</small>}
                        </div>
                      )) : (
                        <div className="empty-selection-msg">No staff available{formData.branch_id ? ' for this branch' : ''}.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule */}
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
                      workingHours={workingHours}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Client */}
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
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.phone ? `(${c.phone})` : ''}</option>
                      ))}
                    </select>

                    {/* Selected client preview */}
                    {selectedClient && (
                      <div className="selected-client-preview">
                        <div className="client-preview-avatar">
                          {selectedClient.first_name?.charAt(0)}{selectedClient.last_name?.charAt(0)}
                        </div>
                        <div className="client-preview-info">
                          <strong>{selectedClient.first_name} {selectedClient.last_name}</strong>
                          {selectedClient.phone && <span>{selectedClient.phone}</span>}
                          {selectedClient.email && <span>{selectedClient.email}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-section">
                    <label className="section-label">Notes (Optional)</label>
                    <textarea 
                      name="notes" 
                      value={formData.notes} 
                      onChange={handleInputChange} 
                      className="form-input"
                      rows={3}
                      placeholder="Any special requests, allergies, preferences..."
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review & Book (with Promo Code) */}
              {bookingStep === 4 && (
                <div className="step-content">
                  {/* Booking Summary Card */}
                  <div className="review-card">
                    <div className="review-card-header">
                      <span>📋 Booking Summary</span>
                    </div>
                    <div className="review-detail-grid">
                      <div className="review-detail-item">
                        <Scissor width={16} height={16} />
                        <div>
                          <label>Service</label>
                          <p>{selectedService?.name || '-'}</p>
                          <small>{getServiceDuration()} min</small>
                        </div>
                      </div>
                      <div className="review-detail-item">
                        <User width={16} height={16} />
                        <div>
                          <label>Staff</label>
                          <p>{selectedStaff?.full_name || selectedStaff?.username || '-'}</p>
                        </div>
                      </div>
                      <div className="review-detail-item">
                        <Calendar width={16} height={16} />
                        <div>
                          <label>Date & Time</label>
                          <p>{formData.booking_date ? new Date(formData.booking_date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}</p>
                          <small>{formData.booking_time || '-'}</small>
                        </div>
                      </div>
                      <div className="review-detail-item">
                        <User width={16} height={16} />
                        <div>
                          <label>Client</label>
                          <p>{selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '-'}</p>
                          {selectedClient?.phone && <small>{selectedClient.phone}</small>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Promo Code Section */}
                  <div className="promo-section">
                    <div className="promo-header">
                      <Gift width={18} height={18} />
                      <span>Have a promo code?</span>
                    </div>
                    <div className="promo-input-row">
                      <div className={`promo-input-wrapper ${promoStatus}`}>
                        <input
                          type="text"
                          className="promo-input"
                          placeholder="Enter code e.g. BEAUTY20"
                          value={promoCode}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!promoCode.trim() || promoStatus === 'valid' || promoStatus === 'validating') return;
                              validatePromo();
                            }
                          }}
                          onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); if (promoStatus !== 'idle') { setPromoStatus('idle'); setPromoError(''); setPromoResult(null); } }}
                          disabled={promoStatus === 'valid'}
                        />
                        {promoStatus === 'valid' && (
                          <button type="button" className="promo-clear-btn" onClick={clearPromo}>
                            <Xmark width={14} height={14} />
                          </button>
                        )}
                      </div>
                      {promoStatus !== 'valid' && (
                        <button
                          type="button"
                          className="promo-apply-btn"
                          onClick={validatePromo}
                          disabled={!promoCode.trim() || promoStatus === 'validating'}
                        >
                          {promoStatus === 'validating' ? (
                            <span className="promo-spinner"></span>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      )}
                    </div>
                    {promoStatus === 'valid' && promoResult && (
                      <div className="promo-success-msg">
                        <Check width={14} height={14} />
                        <span>{promoResult.message} — You save <strong>{currency} {parseFloat(promoResult.discount_amount || 0).toFixed(2)}</strong></span>
                      </div>
                    )}
                    {promoStatus === 'invalid' && promoError && (
                      <div className="promo-error-msg">
                        <Xmark width={14} height={14} />
                        <span>{promoError}</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="booking-summary-card">
                    <h4>Price Breakdown</h4>
                    <div className="summary-item">
                      <span>{selectedService?.name || 'Service'}</span>
                      <strong>{currency} {bookingPricing.subtotal.toFixed(2)}</strong>
                    </div>
                    {bookingPricing.promoDiscount > 0 && (
                      <div className="summary-item promo-discount">
                        <span>🎁 Promo Discount {promoResult?.type === 'percentage' ? `(${promoResult.discount_value}%)` : ''}</span>
                        <strong style={{ color: '#22c55e' }}>−{currency} {bookingPricing.promoDiscount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="summary-item">
                      <span>VAT ({bookingPricing.taxRate}%)</span>
                      <strong>{currency} {bookingPricing.taxAmount.toFixed(2)}</strong>
                    </div>
                    <div className="summary-item total">
                      <span>Total</span>
                      <strong>{currency} {bookingPricing.total.toFixed(2)}</strong>
                    </div>
                    {bookingPricing.promoDiscount > 0 && (
                      <div className="savings-badge">
                        🎉 You save {currency} {bookingPricing.promoDiscount.toFixed(2)}!
                      </div>
                    )}
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
                {bookingStep < 4 ? (
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => setBookingStep(prev => prev + 1)}
                    disabled={
                      (bookingStep === 1 && (!formData.service_id || !formData.staff_id)) ||
                      (bookingStep === 2 && (!formData.booking_date || !formData.booking_time)) ||
                      (bookingStep === 3 && !formData.customer_id)
                    }
                  >
                    Continue
                  </button>
                ) : (
                  <button type="button" className="btn-primary btn-confirm-booking" disabled={saving} onClick={handleSubmit}>
                    {saving ? (
                      <>
                        <span className="promo-spinner" style={{ marginRight: 8 }}></span> Booking...
                      </>
                    ) : (
                      <>
                        <CreditCard width={18} height={18} style={{ marginRight: 8 }} />
                        Confirm Booking — {currency} {bookingPricing.total.toFixed(2)}
                      </>
                    )}
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
                <span className="view-price">{currency} {parseFloat(viewingItem.service_price || 0).toFixed(0)}</span>
              </div>
              <div className="view-actions-row">
                {viewingItem.status !== 'completed' && viewingItem.status !== 'cancelled' && (
                  <>
                    <button className="btn-action" onClick={() => { setShowViewModal(false); openEditModal(viewingItem); }}>
                      <EditPencil width={16} height={16} /> Edit
                    </button>
                    <button className="btn-action success" onClick={() => openCheckout(viewingItem)}>
                      <Check width={16} height={16} /> Checkout
                    </button>
                    <button className="btn-action danger" onClick={() => openConfirmModal(viewingItem.id, 'cancelled')}>
                      <Xmark width={16} height={16} /> Cancel
                    </button>
                  </>
                )}
                {viewingItem.status === 'completed' && (
                  <span className="text-success fw-semibold">✅ Checked out</span>
                )}
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

      {/* ═══ Checkout Modal ═══ */}
      {showCheckout && checkoutAppt && (
        <div className="confirm-modal-overlay" onClick={() => !checkingOut && setShowCheckout(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            {!checkoutResult ? (
              <>
                <div className="checkout-header">
                  <h3>💳 Checkout</h3>
                  <button className="checkout-close" onClick={() => setShowCheckout(false)}>
                    <Xmark width={20} height={20} />
                  </button>
                </div>

                {/* Appointment Summary */}
                <div className="checkout-summary">
                  <div className="checkout-client">
                    <div className="checkout-avatar">
                      {checkoutAppt.customer_first_name?.charAt(0)}{checkoutAppt.customer_last_name?.charAt(0)}
                    </div>
                    <div>
                      <strong>{checkoutAppt.customer_first_name} {checkoutAppt.customer_last_name}</strong>
                      <span className="checkout-service">{checkoutAppt.service_name}</span>
                    </div>
                  </div>
                  <div className="checkout-staff">
                    <Scissor width={14} height={14} /> {checkoutAppt.staff_name}
                  </div>
                </div>

                {/* Line Items */}
                <div className="checkout-items">
                  <div className="checkout-item">
                    <span>{checkoutAppt.service_name}</span>
                    <strong>{currency} {parseFloat(checkoutAppt.service_price || 0).toFixed(2)}</strong>
                  </div>
                </div>

                {/* Options */}
                <div className="checkout-options">
                  <div className="checkout-row">
                    <label>Payment Method</label>
                    <select value={checkoutForm.payment_method} onChange={e => {
                      setCheckoutForm(p => ({ ...p, payment_method: e.target.value, gift_card_code: '' }));
                      setGcBalance(null);
                    }}>
                      <option value="cash">💵 Cash</option>
                      <option value="card">💳 Card</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="gift_card">🎁 Gift Card</option>
                      <option value="other">📋 Other</option>
                    </select>
                  </div>

                  {/* Gift Card Code Input */}
                  {checkoutForm.payment_method === 'gift_card' && (
                    <div className="checkout-row" style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', border: '1px solid #fbbf24' }}>
                      <label style={{ color: '#92400e', fontWeight: 600, fontSize: 12 }}>🎁 Gift Card Code</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. ABCD-EFGH-JKLM-NPQR"
                          value={checkoutForm.gift_card_code}
                          onChange={e => {
                            const code = e.target.value.toUpperCase();
                            setCheckoutForm(p => ({ ...p, gift_card_code: code }));
                            setGcBalance(null);
                          }}
                          style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'monospace', fontSize: 14 }}
                        />
                        <button
                          type="button"
                          onClick={() => checkGiftCardBalance(checkoutForm.gift_card_code)}
                          disabled={gcChecking || !checkoutForm.gift_card_code}
                          style={{ padding: '6px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {gcChecking ? '...' : 'Check'}
                        </button>
                      </div>
                      {gcBalance && !gcBalance.error && (
                        <div style={{ marginTop: 6, fontSize: 12, color: parseFloat(gcBalance.remaining_value) >= checkoutTotal ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                          ✅ Balance: {currency} {parseFloat(gcBalance.remaining_value).toFixed(2)}
                          {gcBalance.status !== 'active' && <span style={{ color: '#dc2626' }}> ({gcBalance.status})</span>}
                          {parseFloat(gcBalance.remaining_value) < checkoutTotal && (
                            <span style={{ color: '#dc2626', display: 'block' }}>⚠️ Insufficient balance for this checkout</span>
                          )}
                        </div>
                      )}
                      {gcBalance?.error && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                          ❌ {gcBalance.error}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="checkout-row-inline">
                    <div className="checkout-field">
                      <label>Discount</label>
                      <input type="number" min="0" value={checkoutForm.discount_amount} onChange={e => setCheckoutForm(p => ({ ...p, discount_amount: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="checkout-field-sm">
                      <label>Type</label>
                      <select value={checkoutForm.discount_type} onChange={e => setCheckoutForm(p => ({ ...p, discount_type: e.target.value }))}>
                        <option value="fixed">Fixed</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  <div className="checkout-row-inline">
                    <div className="checkout-field">
                      <label>Tax Rate (%)</label>
                      <input type="number" min="0" max="100" step="0.5" value={checkoutForm.tax_rate} onChange={e => setCheckoutForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="checkout-field">
                      <label>Tip</label>
                      <input type="number" min="0" value={checkoutForm.tip} onChange={e => setCheckoutForm(p => ({ ...p, tip: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="checkout-totals">
                  <div className="checkout-total-row">
                    <span>Subtotal</span>
                    <span>{currency} {checkoutSubtotal.toFixed(2)}</span>
                  </div>
                  {checkoutDiscount > 0 && (
                    <div className="checkout-total-row discount">
                      <span>Discount</span>
                      <span>−{currency} {checkoutDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {checkoutTax > 0 && (
                    <div className="checkout-total-row">
                      <span>Tax ({checkoutForm.tax_rate}%)</span>
                      <span>{currency} {checkoutTax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="checkout-total-row grand">
                    <span>Total</span>
                    <strong>{currency} {checkoutTotal.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Pay toggle */}
                <label className="checkout-pay-toggle">
                  <input type="checkbox" checked={checkoutForm.pay_now} onChange={e => setCheckoutForm(p => ({ ...p, pay_now: e.target.checked }))} />
                  <span>Mark as paid now</span>
                </label>

                {/* Action */}
                <button className="checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
                  {checkingOut ? 'Processing...' : `Complete & ${checkoutForm.pay_now ? 'Pay' : 'Invoice'} — ${currency} ${checkoutTotal.toFixed(2)}`}
                </button>
              </>
            ) : (
              /* ── Success State ── */
              <div className="checkout-success">
                <div className="checkout-success-icon">✅</div>
                <h3>Checkout Complete!</h3>
                <p className="checkout-inv-num">{checkoutResult.invoice_number}</p>
                <p>Total: <strong>{currency} {parseFloat(checkoutResult.total || 0).toFixed(2)}</strong></p>
                {checkoutResult.gift_card && checkoutResult.gift_card.success && (
                  <p style={{ fontSize: 13, color: '#15803d', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, marginTop: 4 }}>
                    🎁 Gift card charged — Remaining: {currency} {parseFloat(checkoutResult.gift_card.remaining_value).toFixed(2)}
                  </p>
                )}
                <p className="checkout-status-label">
                  {checkoutResult.status === 'paid'
                    ? <Badge bg="success light">Paid</Badge>
                    : <Badge bg="warning light">Invoice Sent</Badge>
                  }
                </p>
                <button className="checkout-btn" onClick={() => setShowCheckout(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


