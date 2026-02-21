import { useState, useMemo } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Star, Phone, Mail,
  Clock, ToggleLeft, ToggleRight,
  Building2, Copy, CheckCircle2, ExternalLink, Navigation
} from 'lucide-react';
import { Modal } from 'react-bootstrap';
import LocationPicker from './LocationPicker';
import { EMPTY_BRANCH_FORM, DEFAULT_WORKING_HOURS } from './settingsConstants';
import { supportAlert } from '../../utils/supportAlert';

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_SHORT = { sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const DAY_FULL = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

/** Merge saved hours with defaults so all 7 days always exist */
function mergeHours(raw) {
  if (!raw) return { ...DEFAULT_WORKING_HOURS };
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    } catch (e) {
      parsed = {};
    }
  }
  if (!parsed || typeof parsed !== 'object') parsed = {};
  const merged = {};
  for (const day of DAY_ORDER) {
    merged[day] = parsed[day] || DEFAULT_WORKING_HOURS[day] || { open: '09:00', close: '22:00', isOpen: true };
  }
  return merged;
}

const COUNTRY_OPTIONS = [
  'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Jordan', 'Egypt', 'Turkey', 'United Kingdom', 'United States', 'India', 'Pakistan'
];

const ARABIC_CHAR_MAP = {
  a: 'ا', b: 'ب', c: 'ك', d: 'د', e: 'ي', f: 'ف', g: 'ج', h: 'ه', i: 'ي', j: 'ج',
  k: 'ك', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'ب', q: 'ق', r: 'ر', s: 'س', t: 'ت',
  u: 'و', v: 'ف', w: 'و', x: 'كس', y: 'ي', z: 'ز'
};

function transliterateToArabic(value) {
  if (!value) return '';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .split('')
      .map((char) => ARABIC_CHAR_MAP[char] || char)
      .join(''))
    .filter(Boolean)
    .join(' ');
}

function createBranchCode(value) {
  if (!value) return '';
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.slice(0, 3);
}

/* ── Working hours mini-table inside cards ── */
function WeekSchedule({ hours }) {
  const h = useMemo(() => mergeHours(hours), [hours]);
  const today = DAY_ORDER[new Date().getDay()];

  return (
    <div className="loc-week">
      <div className="loc-week-header">
        <Clock size={13} /> <span>Working hours</span>
      </div>
      <div className="loc-week-grid">
        {DAY_ORDER.map(day => {
          const cfg = h[day];
          const isToday = day === today;
          return (
            <div className={`loc-week-row ${isToday ? 'today' : ''} ${!cfg?.isOpen ? 'off' : ''}`} key={day}>
              <span className="loc-week-dot" />
              <span className="loc-week-day">{DAY_SHORT[day]}</span>
              {cfg?.isOpen ? (
                <span className="loc-week-time">{cfg.open} – {cfg.close}</span>
              ) : (
                <span className="loc-week-off">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Branch Card ── */
function BranchCard({ branch, onEdit, onDelete, onToggle, onSetHQ }) {
  const [copied, setCopied] = useState(false);
  const hasCoords = branch.latitude && branch.longitude;

  const copyAddress = () => {
    navigator.clipboard.writeText(branch.address || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openInMaps = () => {
    if (hasCoords) {
      window.open(`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`, '_blank');
    }
  };

  return (
    <div className={`loc-card ${!branch.is_active ? 'loc-card-inactive' : ''}`}>
      {/* Header Banner */}
      <div className={`loc-card-banner ${hasCoords ? 'has-coords' : ''}`} onClick={hasCoords ? openInMaps : undefined}>
        <div className="loc-banner-bg" />
        <div className="loc-banner-content">
          <div className="loc-banner-icon">
            <Building2 size={20} />
          </div>
          {hasCoords && (
            <div className="loc-banner-coords">
              <Navigation size={11} /> {Number(branch.latitude).toFixed(4)}, {Number(branch.longitude).toFixed(4)}
              <ExternalLink size={10} style={{ marginLeft: 4 }} />
            </div>
          )}
        </div>
        {/* Status badges */}
        <div className="loc-card-badges">
          {!!branch.is_headquarters && (
            <span className="loc-badge loc-badge-hq"><Star size={10} /> HQ</span>
          )}
          <span className={`loc-badge ${branch.is_active ? 'loc-badge-open' : 'loc-badge-closed'}`}>
            {branch.is_active ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="loc-card-body">
        <h3 className="loc-card-title">{branch.name}</h3>
        {branch.name_ar && <span className="loc-card-title-ar">{branch.name_ar}</span>}

        {/* Address */}
        <div className="loc-card-address">
          <MapPin size={13} />
          <span>{branch.address || branch.city || 'No address set'}</span>
          {branch.address && (
            <button className="loc-copy-btn" onClick={copyAddress} title="Copy address">
              {copied ? <CheckCircle2 size={12} color="#059669" /> : <Copy size={12} />}
            </button>
          )}
        </div>

        {/* Contact info */}
        {(branch.phone || branch.email) && (
          <div className="loc-card-contacts">
            {branch.phone && (
              <a href={`tel:${branch.phone}`} className="loc-contact-item">
                <Phone size={12} /> {branch.phone}
              </a>
            )}
            {branch.email && (
              <a href={`mailto:${branch.email}`} className="loc-contact-item">
                <Mail size={12} /> {branch.email}
              </a>
            )}
          </div>
        )}

        {/* Full Week Schedule */}
        <WeekSchedule hours={branch.working_hours} />
      </div>

      {/* Card Footer Actions */}
      <div className="loc-card-footer">
        {!branch.is_headquarters && (
          <button className="loc-action-btn" onClick={() => onSetHQ(branch)} title="Set as HQ">
            <Star size={14} /> Set HQ
          </button>
        )}
        <button className="loc-action-btn" onClick={() => onToggle(branch)}>
          {branch.is_active ? <ToggleRight size={16} color="#059669" /> : <ToggleLeft size={16} />}
          {branch.is_active ? 'Open' : 'Closed'}
        </button>
        <div className="loc-action-spacer" />
        <button className="loc-action-btn primary" onClick={() => onEdit(branch)}>
          <Pencil size={13} /> Edit
        </button>
        <button className="loc-action-btn danger" onClick={() => onDelete(branch.id)}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function BranchesManager({
  branches, branchLoading, fetchBranches, api, showToast
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_BRANCH_FORM });
  const [nameArTouched, setNameArTouched] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setSaving(false);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await res.json();
      const address = data?.address || {};
      const country = address.country || address.country_code?.toUpperCase() || '';
      const city = address.city || address.town || address.village || address.state || '';
      return {
        fullAddress: data?.display_name || '',
        country,
        city,
      };
    } catch (e) {
      return null;
    }
  };

  const handleInput = (field, value) => {
    if (field.startsWith('working_hours.')) {
      const parts = field.split('.');
      setForm(prev => ({
        ...prev,
        working_hours: {
          ...prev.working_hours,
          [parts[1]]: {
            ...prev.working_hours[parts[1]],
            [parts[2]]: parts[2] === 'isOpen' ? value === 'true' || value === true : value
          }
        }
      }));
    } else if (field === 'name') {
      setForm(prev => {
        const next = { ...prev, name: value };
        if (!nameArTouched) next.name_ar = transliterateToArabic(value);
        if (!codeTouched) next.code = createBranchCode(value);
        return next;
      });
    } else if (field === 'name_ar') {
      setNameArTouched(true);
      setForm(prev => ({ ...prev, [field]: value }));
    } else if (field === 'code') {
      setCodeTouched(true);
      setForm(prev => ({ ...prev, [field]: value?.toUpperCase() || '' }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const openCreate = () => {
    setEditingBranch(null);
    setNameArTouched(false);
    setCodeTouched(false);
    setForm({ ...EMPTY_BRANCH_FORM, working_hours: { ...DEFAULT_WORKING_HOURS } });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingBranch(b);
    setNameArTouched(true);
    setCodeTouched(true);
    const wh = mergeHours(b.working_hours);
    setForm({
      name: b.name || '', name_ar: b.name_ar || '', code: b.code || '',
      address: b.address || '', city: b.city || '', state_province: b.state_province || '',
      country: b.country || 'UAE', postal_code: b.postal_code || '',
      latitude: b.latitude || '', longitude: b.longitude || '',
      phone: b.phone || '', email: b.email || '', description: b.description || '',
      is_headquarters: !!b.is_headquarters, is_active: !!b.is_active,
      timezone: b.timezone || 'Asia/Dubai', currency: b.currency || 'AED',
      working_hours: wh,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { showToast('error', 'Branch name is required'); return; }
    setSaving(true);
    try {
      let payload = { ...form };
      if (form.address && !form.latitude) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`);
          const data = await res.json();
          if (data.length) {
            payload.latitude = parseFloat(data[0].lat);
            payload.longitude = parseFloat(data[0].lon);
          }
        } catch (e) { /* ignore */ }
      }
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, payload);
        showToast('success', 'Branch updated');
      } else {
        await api.post('/branches', payload);
        showToast('success', 'Branch created');
      }
      closeModal();
      fetchBranches();
    } catch (e) {
      showToast('error', e.message || 'Failed to save branch');
    }
    setSaving(false);
  };

  const handleDelete = () => supportAlert();

  const handleToggle = async (branch) => {
    try {
      await api.patch(`/branches/${branch.id}`, { is_active: !branch.is_active });
      fetchBranches();
    } catch (e) { showToast('error', 'Failed'); }
  };

  const handleSetHQ = async (branch) => {
    try {
      await api.patch(`/branches/${branch.id}`, { is_headquarters: true });
      showToast('success', `${branch.name} set as headquarters`);
      await fetchBranches();
    } catch (e) { showToast('error', 'Failed'); }
  };

  /* ── Modal working hours with full week ── */
  const modalHours = form.working_hours || DEFAULT_WORKING_HOURS;

  return (
    <div className="stn-page">
      {/* Header */}
      <div className="loc-header">
        <div className="loc-header-text">
          <h2 className="loc-title">
            <Building2 size={22} />
            Locations
            {branches.length > 0 && <span className="loc-count">{branches.length}</span>}
          </h2>
          <p className="loc-subtitle">Manage your business locations, addresses, working hours and contact details.</p>
        </div>
        <button className="stn-btn-primary" onClick={openCreate}>
          <Plus size={14} /> Add location
        </button>
      </div>

      {/* Content */}
      {branchLoading ? (
        <div className="stn-loading">Loading...</div>
      ) : branches.length === 0 ? (
        <div className="loc-empty">
          <div className="loc-empty-icon"><MapPin size={48} strokeWidth={1} /></div>
          <h3>No locations yet</h3>
          <p>Add your first business location to start managing branches, working hours, and staff assignments.</p>
          <button className="stn-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add your first location
          </button>
        </div>
      ) : (
        <div className="loc-grid">
          {branches.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onSetHQ={handleSetHQ}
            />
          ))}
          <button className="loc-add-card" onClick={openCreate}>
            <Plus size={24} />
            <span>Add location</span>
          </button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal show={showModal} onHide={closeModal} size="lg" centered className="stn-modal">
        <Modal.Header closeButton>
          <Modal.Title className='text-light'>{editingBranch ? 'Edit location' : 'New location'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="stn-form-grid">
            <div className="stn-field span-2">
              <label>Location name *</label>
              <input type="text" placeholder="e.g. Downtown Branch" value={form.name} onChange={e => handleInput('name', e.target.value)} />
            </div>
            <div className="stn-field">
              <label>Arabic name</label>
              <input type="text" placeholder="الاسم بالعربية" dir="rtl" value={form.name_ar} onChange={e => handleInput('name_ar', e.target.value)} />
            </div>
            <div className="stn-field">
              <label>Branch code</label>
              <input type="text" placeholder="e.g. DXB-01" value={form.code} onChange={e => handleInput('code', e.target.value)} />
            </div>
            <div className="stn-field span-2">
              <label>Address</label>
              <input type="text" placeholder="Full address" value={form.address} onChange={e => handleInput('address', e.target.value)} />
            </div>
            <div className="stn-field">
              <label>City</label>
              <input type="text" value={form.city} onChange={e => handleInput('city', e.target.value)} />
            </div>
            <div className="stn-field">
              <label>Country</label>
              <select value={form.country} onChange={e => handleInput('country', e.target.value)}>
                {form.country && !COUNTRY_OPTIONS.includes(form.country) && (
                  <option value={form.country}>{form.country}</option>
                )}
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="stn-field">
              <label>Phone</label>
              <input type="tel" placeholder="+971 50 123 4567" value={form.phone} onChange={e => handleInput('phone', e.target.value)} />
            </div>
            <div className="stn-field">
              <label>Email</label>
              <input type="email" placeholder="branch@example.com" value={form.email} onChange={e => handleInput('email', e.target.value)} />
            </div>
            <div className="stn-field span-2">
              <label>Description</label>
              <textarea rows={2} placeholder="A brief description of this location..." value={form.description} onChange={e => handleInput('description', e.target.value)} />
            </div>
            <div className="stn-field span-2">
              <label>Location on map</label>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationSelect={async (lat, lng, addr) => {
                  handleInput('latitude', lat);
                  handleInput('longitude', lng);
                  if (addr && !form.address) handleInput('address', addr);

                  const geo = await reverseGeocode(lat, lng);
                  if (geo?.fullAddress && (!form.address || form.address === addr)) handleInput('address', geo.fullAddress);
                  if (geo?.city && !form.city) handleInput('city', geo.city);
                  if (geo?.country) handleInput('country', geo.country);
                }}
                height={250}
              />
            </div>
          </div>

          {/* ── Working Hours (Full Week) ── */}
          <div className="loc-modal-hours">
            <div className="loc-modal-hours-header">
              <Clock size={16} />
              <h4>Working hours</h4>
              <span className="loc-modal-hours-hint">Set your opening times for each day</span>
            </div>
            <div className="loc-modal-hours-grid">
              {DAY_ORDER.map(day => {
                const cfg = modalHours[day] || { open: '09:00', close: '22:00', isOpen: false };
                return (
                  <div className={`loc-modal-day ${cfg.isOpen ? 'open' : 'off'}`} key={day}>
                    <div className="loc-modal-day-left">
                      <span className="loc-modal-day-dot" />
                      <span className="loc-modal-day-name">{DAY_FULL[day]}</span>
                    </div>
                    <div className="loc-modal-day-right">
                      <label className="stn-switch small">
                        <input type="checkbox" checked={cfg.isOpen} onChange={e => handleInput(`working_hours.${day}.isOpen`, e.target.checked)} />
                        <span className="stn-switch-track" />
                      </label>
                      {cfg.isOpen ? (
                        <div className="loc-modal-times">
                          <input type="time" value={cfg.open} onChange={e => handleInput(`working_hours.${day}.open`, e.target.value)} />
                          <span className="loc-modal-dash">–</span>
                          <input type="time" value={cfg.close} onChange={e => handleInput(`working_hours.${day}.close`, e.target.value)} />
                        </div>
                      ) : (
                        <span className="loc-modal-closed-label">Closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="stn-btn-outline" onClick={closeModal}>Cancel</button>
          <button className="stn-btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : editingBranch ? 'Update location' : 'Create location'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
