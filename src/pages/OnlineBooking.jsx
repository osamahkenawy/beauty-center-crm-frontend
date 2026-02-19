import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin, Clock, Phone, Mail, Check, ArrowRight, ArrowLeft,
  Calendar as CalendarIcon, User, Scissors, CreditCard, Star
} from 'lucide-react';
import './OnlineBooking.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const publicFetch = async (endpoint) => {
  const res = await fetch(`${API_URL}${endpoint}`);
  return res.json();
};

const publicPost = async (endpoint, body) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

const STEPS = [
  { id: 'branch', label: 'Location' },
  { id: 'service', label: 'Service' },
  { id: 'staff', label: 'Staff' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'contact', label: 'Your Info' },
  { id: 'confirm', label: 'Confirm' },
];

export default function OnlineBooking() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [business, setBusiness] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Selections
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [serviceDuration, setServiceDuration] = useState(30);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', notes: '' });

  // Load business info
  useEffect(() => {
    (async () => {
      try {
        const data = await publicFetch(`/public/booking/${slug}`);
        if (!data.success) {
          setError(data.message || 'Business not found');
          return;
        }
        setBusiness(data.data);

        // Load branches
        const brData = await publicFetch(`/public/booking/${slug}/branches`);
        if (brData.success) {
          setBranches(brData.data || []);
          if (brData.data?.length === 1) {
            setSelectedBranch(brData.data[0]);
            // Skip branch step if only 1
          }
        }
      } catch (e) {
        setError('Unable to connect to server');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Auto-skip branch step if only 1
  const activeSteps = useMemo(() => {
    if (branches.length <= 1) return STEPS.filter(s => s.id !== 'branch');
    return STEPS;
  }, [branches]);

  const currentStepId = activeSteps[step]?.id;

  // Load categories when branch is selected
  useEffect(() => {
    if (!business || !currentStepId) return;
    if (currentStepId === 'service') {
      (async () => {
        const brId = selectedBranch?.id || '';
        const catData = await publicFetch(`/public/booking/${slug}/categories?branch_id=${brId}`);
        if (catData.success) {
          setCategories(catData.data || []);
          if (catData.data?.length > 0 && !selectedCategory) {
            setSelectedCategory(catData.data[0].id);
          }
        }
        const svcData = await publicFetch(`/public/booking/${slug}/services?branch_id=${brId}${selectedCategory ? `&category_id=${selectedCategory}` : ''}`);
        if (svcData.success) setServices(svcData.data || []);
      })();
    }
  }, [business, currentStepId, selectedBranch, slug]);

  // Reload services when category changes
  useEffect(() => {
    if (currentStepId !== 'service' || !selectedCategory) return;
    (async () => {
      const brId = selectedBranch?.id || '';
      const svcData = await publicFetch(`/public/booking/${slug}/services?branch_id=${brId}&category_id=${selectedCategory}`);
      if (svcData.success) setServices(svcData.data || []);
    })();
  }, [selectedCategory]);

  // Load staff when moving to staff step
  useEffect(() => {
    if (currentStepId !== 'staff' || !selectedService) return;
    (async () => {
      const brId = selectedBranch?.id || '';
      const staffData = await publicFetch(`/public/booking/${slug}/staff?service_id=${selectedService.id}&branch_id=${brId}`);
      if (staffData.success) {
        setStaffList(staffData.data || []);
        // If only 1 staff, auto-select
        if (staffData.data?.length === 1) setSelectedStaff(staffData.data[0]);
      }
    })();
  }, [currentStepId, selectedService, slug]);

  // Load available slots
  useEffect(() => {
    if (currentStepId !== 'datetime' || !selectedStaff || !selectedDate || !selectedService) return;
    (async () => {
      setSlotsLoading(true);
      const brId = selectedBranch?.id || '';
      const slotData = await publicFetch(
        `/public/booking/${slug}/slots?staff_id=${selectedStaff.id}&date=${selectedDate}&service_id=${selectedService.id}&branch_id=${brId}`
      );
      if (slotData.success) {
        setSlots(slotData.data || []);
        if (slotData.duration) setServiceDuration(slotData.duration);
      }
      setSlotsLoading(false);
    })();
  }, [currentStepId, selectedStaff, selectedDate, selectedService, slug]);

  // Generate date options (next 30 days)
  const dateOptions = useMemo(() => {
    const days = business?.booking_settings?.max_advance_days || 30;
    const dates = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dates.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    return dates;
  }, [business]);

  const canProceed = useCallback(() => {
    switch (currentStepId) {
      case 'branch': return !!selectedBranch;
      case 'service': return !!selectedService;
      case 'staff': return !!selectedStaff;
      case 'datetime': return !!selectedDate && !!selectedTime;
      case 'contact': return contactForm.name.trim() && (contactForm.email.trim() || contactForm.phone.trim());
      case 'confirm': return true;
      default: return false;
    }
  }, [currentStepId, selectedBranch, selectedService, selectedStaff, selectedDate, selectedTime, contactForm]);

  const handleNext = async () => {
    if (step < activeSteps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Submit booking
      setSubmitting(true);
      try {
        const startDateTime = `${selectedDate}T${selectedTime}:00`;
        const endDate = new Date(startDateTime);
        endDate.setMinutes(endDate.getMinutes() + serviceDuration);
        const endDateTime = endDate.toISOString();

        const result = await publicPost(`/public/booking/${slug}/book`, {
          service_id: selectedService.id,
          staff_id: selectedStaff.id,
          branch_id: selectedBranch?.id || null,
          start_time: startDateTime,
          end_time: endDateTime,
          customer_name: contactForm.name,
          customer_email: contactForm.email,
          customer_phone: contactForm.phone,
          notes: contactForm.notes,
        });

        if (result.success) {
          setBookingResult(result.data);
        } else {
          alert(result.message || 'Failed to book. Please try again.');
        }
      } catch (e) {
        alert('Connection error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // ──── Renders ────────────────────────────────────
  if (loading) {
    return (
      <div className="ob-page">
        <div className="ob-loading">
          <div className="ob-spinner" />
          <span>Loading booking page...</span>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="ob-page">
        <div className="ob-content">
          <div className="ob-card ob-error">
            <h2>😔 {error || 'Business not found'}</h2>
            <p>This booking page is not available. Please check the link and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (bookingResult) {
    return (
      <div className="ob-page">
        <div className="ob-header">
          <div className="ob-header-inner">
            {business.logo_url ? <img src={business.logo_url} alt="" className="ob-logo" /> :
              <div className="ob-logo-placeholder">{business.name?.[0]}</div>}
            <div className="ob-header-text">
              <h1>{business.name}</h1>
              <p>Online Booking</p>
            </div>
          </div>
        </div>
        <div className="ob-content">
          <div className="ob-card">
            <div className="ob-success">
              <div className="ob-success-check">
                <Check size={40} color="#fff" />
              </div>
              <h2>Booking {bookingResult.status === 'confirmed' ? 'Confirmed!' : 'Submitted!'}</h2>
              <p>
                {bookingResult.status === 'confirmed'
                  ? 'Your appointment has been confirmed. See you soon!'
                  : 'Your booking has been submitted and is awaiting confirmation.'}
              </p>
              <div className="ob-success-details">
                <div className="ob-confirm-details">
                  <div className="ob-confirm-row">
                    <span className="ob-confirm-label"><Scissors size={16} /> Service</span>
                    <span className="ob-confirm-value">{bookingResult.service}</span>
                  </div>
                  <div className="ob-confirm-row">
                    <span className="ob-confirm-label"><User size={16} /> Stylist</span>
                    <span className="ob-confirm-value">{bookingResult.staff}</span>
                  </div>
                  <div className="ob-confirm-row">
                    <span className="ob-confirm-label"><CalendarIcon size={16} /> Date & Time</span>
                    <span className="ob-confirm-value">
                      {new Date(bookingResult.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' at '}{selectedTime}
                    </span>
                  </div>
                  {bookingResult.branch && (
                    <div className="ob-confirm-row">
                      <span className="ob-confirm-label"><MapPin size={16} /> Location</span>
                      <span className="ob-confirm-value">{bookingResult.branch}</span>
                    </div>
                  )}
                  {bookingResult.price > 0 && (
                    <div className="ob-confirm-row">
                      <span className="ob-confirm-label"><CreditCard size={16} /> Price</span>
                      <span className="ob-confirm-value">{business.currency} {bookingResult.price}</span>
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
                Booking ID: #{bookingResult.id}
              </p>
            </div>
          </div>
        </div>
        <div className="ob-footer">
          Powered by <a href="https://trasealla.com" target="_blank" rel="noreferrer">Trasealla</a>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStepId) {
      case 'branch':
        return (
          <>
            <h2 className="ob-card-title">Choose a Location</h2>
            <p className="ob-card-subtitle">Select the branch you'd like to visit</p>
            <div className="ob-branch-grid">
              {branches.map(b => (
                <div key={b.id}
                  className={`ob-branch-card ${selectedBranch?.id === b.id ? 'selected' : ''}`}
                  onClick={() => setSelectedBranch(b)}>
                  <div className="ob-branch-name">{b.name}</div>
                  {b.address && <div className="ob-branch-address"><MapPin size={13} /> {b.address}{b.city ? `, ${b.city}` : ''}</div>}
                  <div className="ob-branch-meta">
                    {b.phone && <span><Phone size={12} /> {b.phone}</span>}
                    {b.is_headquarters ? <span><Star size={12} /> Main Branch</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case 'service':
        return (
          <>
            <h2 className="ob-card-title">Choose a Service</h2>
            <p className="ob-card-subtitle">Browse our services and select what you need</p>
            {categories.length > 1 && (
              <div className="ob-categories">
                {categories.map(c => (
                  <button key={c.id}
                    className={`ob-cat-btn ${selectedCategory === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(c.id)}>
                    {c.icon && <span>{c.icon}</span>} {c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="ob-service-list">
              {services.map(s => (
                <div key={s.id}
                  className={`ob-service-card ${selectedService?.id === s.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(s)}>
                  <div className="ob-service-icon" style={{ background: s.category_color || '#f3f4f6' }}>
                    <Scissors size={20} color={s.category_color ? '#fff' : '#666'} />
                  </div>
                  <div className="ob-service-info">
                    <div className="ob-service-name">{s.name}</div>
                    {s.description && <div className="ob-service-desc">{s.description}</div>}
                  </div>
                  <div className="ob-service-meta">
                    {s.price !== undefined && <div className="ob-service-price">{business.currency} {s.price}</div>}
                    {(s.processing_time || s.finishing_time) && (
                      <div className="ob-service-duration">
                        <Clock size={12} /> {(parseInt(s.processing_time || 0) + parseInt(s.finishing_time || 0))} min
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="ob-no-slots">No services available in this category</div>
              )}
            </div>
          </>
        );

      case 'staff':
        return (
          <>
            <h2 className="ob-card-title">Choose Your Stylist</h2>
            <p className="ob-card-subtitle">Pick a professional for your {selectedService?.name}</p>
            <div className="ob-staff-grid">
              {staffList.map(s => (
                <div key={s.id}
                  className={`ob-staff-card ${selectedStaff?.id === s.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStaff(s)}>
                  <div className="ob-staff-avatar">
                    {s.avatar_url ? <img src={s.avatar_url} alt={s.full_name} /> : s.full_name?.[0]}
                  </div>
                  <div className="ob-staff-name">{s.full_name}</div>
                  <div className="ob-staff-skill">{s.skill_level || s.role}</div>
                </div>
              ))}
              {staffList.length === 0 && (
                <div className="ob-no-slots" style={{ gridColumn: '1/-1' }}>No staff available for this service</div>
              )}
            </div>
          </>
        );

      case 'datetime':
        return (
          <>
            <h2 className="ob-card-title">Pick Date & Time</h2>
            <p className="ob-card-subtitle">Choose when you'd like your appointment</p>
            <div className="ob-datetime-grid">
              <div className="ob-date-section">
                <h3><CalendarIcon size={16} /> Select Date</h3>
                <div className="ob-date-scroll">
                  {dateOptions.map(d => (
                    <div key={d.date}
                      className={`ob-date-card ${selectedDate === d.date ? 'selected' : ''}`}
                      onClick={() => { setSelectedDate(d.date); setSelectedTime(null); }}>
                      <div className="ob-date-day">{d.dayName}</div>
                      <div className="ob-date-num">{d.dayNum}</div>
                      <div className="ob-date-month">{d.monthName}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ob-time-section">
                <h3><Clock size={16} /> Select Time</h3>
                {!selectedDate ? (
                  <div className="ob-no-slots">Please select a date first</div>
                ) : slotsLoading ? (
                  <div className="ob-loading" style={{ padding: '20px' }}>
                    <div className="ob-spinner" />
                  </div>
                ) : slots.length > 0 ? (
                  <div className="ob-time-grid">
                    {slots.map(s => (
                      <div key={s.time}
                        className={`ob-time-slot ${selectedTime === s.time ? 'selected' : ''}`}
                        onClick={() => setSelectedTime(s.time)}>
                        {s.time}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ob-no-slots">
                    <CalendarIcon size={32} />
                    <p>No available slots on this day</p>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'contact':
        return (
          <>
            <h2 className="ob-card-title">Your Information</h2>
            <p className="ob-card-subtitle">We'll use this to confirm your booking</p>
            <div className="ob-form-grid">
              <div className="ob-form-group">
                <label className="ob-form-label">Full Name *</label>
                <input type="text" className="ob-form-input" placeholder="John Doe"
                  value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="ob-form-group">
                <label className="ob-form-label">Phone *</label>
                <input type="tel" className="ob-form-input" placeholder="+971 50 123 4567"
                  value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="ob-form-group">
                <label className="ob-form-label">Email</label>
                <input type="email" className="ob-form-input" placeholder="john@example.com"
                  value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="ob-form-group full-width">
                <label className="ob-form-label">Special Requests (optional)</label>
                <textarea className="ob-form-input" placeholder="Any notes or preferences..."
                  value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </>
        );

      case 'confirm':
        return (
          <>
            <div className="ob-confirm-card">
              <h2 className="ob-card-title" style={{ textAlign: 'center', marginBottom: 4 }}>Review Your Booking</h2>
              <p className="ob-card-subtitle" style={{ textAlign: 'center' }}>Please confirm the details below</p>
              <div className="ob-confirm-details">
                {selectedBranch && (
                  <div className="ob-confirm-row">
                    <span className="ob-confirm-label"><MapPin size={16} /> Location</span>
                    <span className="ob-confirm-value">{selectedBranch.name}</span>
                  </div>
                )}
                <div className="ob-confirm-row">
                  <span className="ob-confirm-label"><Scissors size={16} /> Service</span>
                  <span className="ob-confirm-value">{selectedService?.name}</span>
                </div>
                <div className="ob-confirm-row">
                  <span className="ob-confirm-label"><User size={16} /> Stylist</span>
                  <span className="ob-confirm-value">{selectedStaff?.full_name}</span>
                </div>
                <div className="ob-confirm-row">
                  <span className="ob-confirm-label"><CalendarIcon size={16} /> Date</span>
                  <span className="ob-confirm-value">
                    {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                  </span>
                </div>
                <div className="ob-confirm-row">
                  <span className="ob-confirm-label"><Clock size={16} /> Time</span>
                  <span className="ob-confirm-value">{selectedTime} ({serviceDuration} min)</span>
                </div>
                <div className="ob-confirm-row">
                  <span className="ob-confirm-label"><User size={16} /> Customer</span>
                  <span className="ob-confirm-value">{contactForm.name}</span>
                </div>
                {selectedService?.price > 0 && (
                  <div className="ob-confirm-row" style={{ borderBottom: 'none', paddingTop: 16 }}>
                    <span className="ob-confirm-label" style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>
                      <CreditCard size={18} /> Total
                    </span>
                    <span className="ob-confirm-value" style={{ fontSize: '1.2rem', color: '#f2421b' }}>
                      {business.currency} {selectedService.price}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      default: return null;
    }
  };

  return (
    <div className="ob-page">
      {/* Header */}
      <div className="ob-header" style={business.booking_settings?.primary_color ? { '--ob-primary': business.booking_settings.primary_color } : {}}>
        <div className="ob-header-inner">
          {business.logo_url ? <img src={business.logo_url} alt="" className="ob-logo" /> :
            <div className="ob-logo-placeholder">{business.name?.[0]}</div>}
          <div className="ob-header-text">
            <h1>{business.name}</h1>
            <p>Book an appointment online</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="ob-progress">
        <div className="ob-steps">
          {activeSteps.map((s, i) => (
            <div key={s.id} className={`ob-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
              <div className="ob-step-dot">
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className="ob-step-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="ob-content">
        <div className="ob-card" key={currentStepId}>
          {renderStepContent()}

          {/* Navigation */}
          <div className="ob-nav">
            {step > 0 && (
              <button className="ob-btn ob-btn-back" onClick={handleBack}>
                <ArrowLeft size={18} /> Back
              </button>
            )}
            <button
              className="ob-btn ob-btn-next"
              disabled={!canProceed() || submitting}
              onClick={handleNext}>
              {submitting ? 'Booking...' :
                currentStepId === 'confirm' ? (
                  <><Check size={18} /> Confirm Booking</>
                ) : (
                  <>Continue <ArrowRight size={18} /></>
                )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ob-footer">
        Powered by <a href="https://trasealla.com" target="_blank" rel="noreferrer">Trasealla</a>
      </div>
    </div>
  );
}
