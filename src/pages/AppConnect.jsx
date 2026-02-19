import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  // Navigation & Status
  Globe, MapPin, Clock, Star, StatsUpSquare, Flash, Check,
  XmarkCircle, WarningTriangle, NavArrowRight, Copy, Eye, EyeClosed,
  Sparks, Shield, Rocket, Crown, MediaImageFolder, Phone, Group,
  Calendar, Settings, ArrowUpRight, OpenNewWindow, RefreshDouble,
  InfoCircle, Upload, SmartphoneDevice, Link, Instagram, AtSign,
  EditPencil, Trash, Plus, Xmark, CheckCircle, Pause, Play,
} from 'iconoir-react';
import api from '../lib/api';
import useCurrency from '../hooks/useCurrency';
import './AppConnect.css';

// ── Configs ───────────────────────────────────────────────────────────────────
const AMENITIES_LIST = [
  { id: 'parking',   label: 'Free Parking',     icon: '🅿️' },
  { id: 'wifi',      label: 'Free Wi-Fi',        icon: '📶' },
  { id: 'ac',        label: 'Air Conditioned',   icon: '❄️' },
  { id: 'wheelchair',label: 'Wheelchair Access', icon: '♿' },
  { id: 'kids',      label: 'Kids Friendly',     icon: '👶' },
  { id: 'women_only',label: 'Women Only',        icon: '👩' },
  { id: 'men_only',  label: 'Men Only',          icon: '👨' },
  { id: 'private',   label: 'Private Rooms',     icon: '🚪' },
  { id: 'payments',  label: 'Card Payments',     icon: '💳' },
  { id: 'valet',     label: 'Valet Parking',     icon: '🚗' },
];

const LANGUAGES_LIST = [
  'English', 'Arabic', 'French', 'Hindi', 'Urdu', 'Filipino', 'Russian', 'Chinese',
];

const HIGHLIGHT_TAGS = [
  'Bridal Specialist', 'Award Winning', 'Premium Products', 'Walk-ins Welcome',
  'Eco-Friendly', 'Celebrity Stylist', 'Home Service', 'Group Bookings',
];

const TIERS = [
  {
    id: 'basic', label: 'Basic', Icon: Globe, color: '#64748b',
    gradient: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
    price: 'Free', priceNote: 'Included with CRM',
    features: [
      'Listed on app map', 'Accept online bookings',
      'Basic profile page', 'Client reviews',
    ],
  },
  {
    id: 'pro', label: 'Pro', Icon: Flash, color: '#f59e0b',
    gradient: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
    price: 'AED 99 / mo', priceNote: 'Most popular',
    badge: 'Popular',
    features: [
      'Everything in Basic', 'Priority in search results',
      'Photo gallery (10 photos)', 'Promotions & flash deals',
      'Analytics dashboard',
    ],
  },
  {
    id: 'featured', label: 'Featured', Icon: Crown, color: '#f2421b',
    gradient: 'linear-gradient(135deg,#fff5f2,#ffe4dd)',
    price: 'AED 249 / mo', priceNote: 'Maximum visibility',
    badge: 'Best',
    features: [
      'Everything in Pro', 'Top of map pin 📍',
      'App banner placement', 'Push to nearby users',
      'Dedicated account manager', 'Verified badge ✓',
    ],
  },
];

const COMPLETENESS_ITEMS = [
  { key: 'has_logo',          label: 'Business logo uploaded',      Icon: MediaImageFolder, link: '/beauty-settings/business', linkLabel: 'Upload logo' },
  { key: 'has_cover',         label: 'Cover photo added',           Icon: MediaImageFolder, link: 'profile',                   linkLabel: 'Add cover' },
  { key: 'has_description',   label: 'Description written',         Icon: InfoCircle,       link: 'profile',                   linkLabel: 'Write bio' },
  { key: 'has_location',      label: 'Location pinned on map',      Icon: MapPin,           link: 'profile',                   linkLabel: 'Set location' },
  { key: 'has_services',      label: 'At least 3 services listed',  Icon: Sparks,           link: '/beauty-settings/services', linkLabel: 'Add services' },
  { key: 'has_staff',         label: 'Team member added',           Icon: Group,            link: '/beauty-settings/team',     linkLabel: 'Add staff' },
  { key: 'has_working_hours', label: 'Working hours configured',    Icon: Clock,            link: '/beauty-settings/hours',    linkLabel: 'Set hours' },
  { key: 'has_phone',         label: 'Phone number on file',        Icon: Phone,            link: '/beauty-settings/business', linkLabel: 'Add phone' },
];

const STATUS_CFG = {
  draft:  { label: 'Draft',  color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8',  Icon: WarningTriangle },
  live:   { label: 'Live',   color: '#10b981', bg: '#ecfdf5', dot: '#10b981',  Icon: Check },
  paused: { label: 'Paused', color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b',  Icon: XmarkCircle },
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ show, onClose, onUploaded, currentUrl, title = 'Upload Image', folder = 'covers' }) {
  const [dragging, setDragging]   = useState(false);
  const [preview,  setPreview]    = useState(currentUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error,    setError]      = useState('');
  const inputRef = useRef();

  useEffect(() => { if (show) { setPreview(currentUrl || ''); setError(''); } }, [show, currentUrl]);

  const doUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await api.post('/uploads', fd);
      if (res.success && res.data?.url) {
        setPreview(res.data.url);
        onUploaded(res.data.url);
      } else {
        setError(res.message || 'Upload failed. Try again.');
      }
    } catch (e) {
      setError('Upload failed. Check your connection.');
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  if (!show) return null;

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={e => e.stopPropagation()}>
        <div className="ac-modal-header">
          <h3><MediaImageFolder width={18} height={18} /> {title}</h3>
          <button className="ac-modal-close" onClick={onClose}><Xmark width={18} height={18} /></button>
        </div>

        <div className="ac-modal-body">
          {/* Drop zone */}
          <div
            className={`ac-drop-zone ${dragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="ac-drop-preview" />
            ) : (
              <div className="ac-drop-placeholder">
                <Upload width={32} height={32} />
                <strong>Drop image here or click to browse</strong>
                <span>PNG, JPG, WEBP — max 5 MB</span>
              </div>
            )}
            {uploading && (
              <div className="ac-drop-uploading">
                <RefreshDouble width={24} height={24} className="ac-spin" />
                <span>Uploading…</span>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => doUpload(e.target.files[0])} />

          {error && <p className="ac-upload-error"><WarningTriangle width={14} height={14} /> {error}</p>}

          {preview && (
            <div className="ac-upload-actions">
              <button className="ac-btn-ghost" onClick={() => { setPreview(''); onUploaded(''); }}>
                <Trash width={14} height={14} /> Remove image
              </button>
              <button className="ac-btn-save" onClick={onClose}>
                <Check width={15} height={15} /> Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppConnect() {
  const navigate = useNavigate();

  const [settings,    setSettings]    = useState(null);
  const [completeness,setComplete]    = useState({});
  const [score,       setScore]       = useState(0);
  const [tenantLogo,  setTenantLogo]  = useState('');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [copied,      setCopied]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [uploadModal, setUploadModal] = useState({ show: false, type: '' }); // type: 'cover'

  const [form, setForm] = useState({
    listing_status: 'draft', listing_tier: 'basic', slug: '',
    display_name: '', tagline: '', description: '', cover_image: '',
    map_address: '', latitude: '', longitude: '',
    instagram: '', facebook: '', tiktok: '', website: '',
    booking_mode: 'auto', min_notice_hours: 2, max_future_days: 30,
    deposit_pct: 0, cancellation_policy: '', show_prices: true, show_staff: true,
    amenities: [], spoken_languages: [], highlight_tags: [],
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Fetch app-connect settings AND tenant info in parallel
      const [acRes, tenantRes] = await Promise.all([
        api.get('/app-connect'),
        api.get('/tenants/current'),
      ]);
      if (acRes.success) {
        // Update state with fresh data to ensure React detects changes
        setSettings({ ...acRes.data });
        setComplete({ ...(acRes.completeness || {}) });
        setScore(acRes.score || 0);
        setForm(prev => ({
          ...prev,
          ...acRes.data,
          amenities:        Array.isArray(acRes.data.amenities)        ? acRes.data.amenities        : [],
          spoken_languages: Array.isArray(acRes.data.spoken_languages) ? acRes.data.spoken_languages : [],
          highlight_tags:   Array.isArray(acRes.data.highlight_tags)   ? acRes.data.highlight_tags   : [],
        }));
      }
      if (tenantRes.success && tenantRes.data?.logo_url) {
        setTenantLogo(tenantRes.data.logo_url);
      }
    } catch (e) {
      showToast('error', 'Failed to load settings');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    // Only require slug if going live
    if (form.listing_status === 'live' && !form.slug.trim()) {
      showToast('error', 'App listing slug is required to go live.');
      return;
    }
    try {
      setSaving(true);
      const res = await api.put('/app-connect', form);
      if (res.success) {
        showToast('success', 'Settings saved successfully!');
        // Refresh data to get updated completeness and score
        // Use a small delay to ensure DB commit, and don't show loading spinner
        setTimeout(() => {
          fetchAll(false);
        }, 300);
      }
    } catch (e) {
      showToast('error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLive = async () => {
    const next = form.listing_status === 'live' ? 'paused' : 'live';
    if (next === 'live' && score < 40) {
      showToast('error', `Complete at least 40% of your profile first (currently ${score}%).`);
      return;
    }
    try {
      setToggling(true);
      await api.patch('/app-connect/status', { status: next });
      setForm(prev => ({ ...prev, listing_status: next }));
      showToast('success', next === 'live' ? "🎉 You're now live on the app!" : 'Listing paused.');
      fetchAll();
    } catch (e) {
      showToast('error', e.message || 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(`https://app.trasealla.com/place/${form.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggleArr = (key, val) =>
    setForm(p => ({
      ...p,
      [key]: (p[key] || []).includes(val)
        ? p[key].filter(x => x !== val)
        : [...(p[key] || []), val],
    }));

  const sc     = STATUS_CFG[form.listing_status] || STATUS_CFG.draft;
  const isLive = form.listing_status === 'live';

  const TABS = [
    { id: 'overview', label: 'Overview',  Icon: Globe },
    { id: 'profile',  label: 'Profile',   Icon: MediaImageFolder },
    { id: 'booking',  label: 'Booking',   Icon: Calendar },
    { id: 'listing',  label: 'Plan',      Icon: Crown },
  ];

  if (loading) {
    return (
      <div className="ac-loading">
        <div className="ac-loading-ring" />
        <p>Loading App Connect…</p>
      </div>
    );
  }

  return (
    <div className="ac-page">

      {/* ── Toast ── */}
      {toast && (
        <div className={`ac-toast ac-toast-${toast.type}`}>
          {toast.type === 'success'
            ? <Check width={16} height={16} />
            : <WarningTriangle width={16} height={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Upload Modal ── */}
      <UploadModal
        show={uploadModal.show}
        title="Upload Cover Photo"
        folder="covers"
        currentUrl={form.cover_image}
        onClose={() => setUploadModal({ show: false, type: '' })}
        onUploaded={url => { setField('cover_image', url); setUploadModal({ show: false, type: '' }); }}
      />

      {/* ══════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════ */}
      <div className={`ac-hero ac-hero-${form.listing_status}`}>
        <div className="ac-hero-left">
          {/* Logo and Status Group */}
          <div className="ac-hero-logo-group">
            {tenantLogo && (
              <div className="ac-hero-logo">
                <img src={tenantLogo} alt="Business logo" />
              </div>
            )}
            <div className="ac-hero-badge" style={{ background: sc.bg, color: sc.color }}>
              <span className="ac-hero-dot" style={{ background: sc.dot }} />
              <sc.Icon width={13} height={13} />
              {sc.label}
            </div>
          </div>
          <h1 className="ac-hero-title">
            {isLive ? (
              <>
                <Sparks width={20} height={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                {form.display_name || 'Your center'} is live!
              </>
            ) : form.listing_status === 'paused' ? (
              <>
                <Pause width={20} height={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                Listing is paused
              </>
            ) : (
              <>
                <EditPencil width={20} height={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                Finish your profile to go live
              </>
            )}
          </h1>
          <p className="ac-hero-sub">
            {isLive
              ? 'Customers can discover and book you on the Trasealla app right now.'
              : 'Complete your profile and publish to start receiving mobile bookings.'}
          </p>
          <div className="ac-hero-link">
            <Link width={12} height={12} />
            <span>app.trasealla.com/place/{form.slug || '—'}</span>
            <button
              className="ac-copy-btn"
              onClick={copySlug}
              data-tooltip={copied ? 'Copied!' : 'Copy link'}
            >
              {copied ? <Check width={12} height={12} /> : <Copy width={12} height={12} />}
            </button>
            {isLive && (
              <a
                href={`https://app.trasealla.com/place/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="ac-ext-link"
                data-tooltip="Open in new tab"
              >
                <OpenNewWindow width={12} height={12} />
              </a>
            )}
          </div>
        </div>

        <div className="ac-hero-right">
          {/* Quick Stats */}
          <div className="ac-hero-stats">
            <div className="ac-hero-stat">
              <span className="ac-hero-stat-val">{settings?.app_views ?? 0}</span>
              <span className="ac-hero-stat-lbl"><StatsUpSquare width={10} height={10} /> App Views</span>
            </div>
            <div className="ac-hero-stat-divider" />
            <div className="ac-hero-stat">
              <span className="ac-hero-stat-val">{settings?.app_bookings ?? 0}</span>
              <span className="ac-hero-stat-lbl"><Calendar width={10} height={10} /> Bookings</span>
            </div>
            <div className="ac-hero-stat-divider" />
            <div className="ac-hero-stat">
              <span className="ac-hero-stat-val">
                {settings?.avg_rating ? (
                  <>
                    {parseFloat(settings.avg_rating).toFixed(1)}
                    <Star width={12} height={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4, color: '#fbbf24' }} />
                  </>
                ) : '—'}
              </span>
              <span className="ac-hero-stat-lbl"><Star width={10} height={10} /> Rating</span>
            </div>
          </div>

          {/* Go Live / Pause */}
          <button
            className={`ac-go-live-btn ${isLive ? 'ac-go-live-pause' : 'ac-go-live-publish'}`}
            onClick={handleToggleLive}
            disabled={toggling}
          >
            {toggling
              ? <RefreshDouble width={16} height={16} className="ac-spin" />
              : isLive
                ? <EyeClosed width={16} height={16} />
                : <Rocket width={16} height={16} />}
            {toggling ? 'Updating…' : isLive ? 'Pause Listing' : 'Go Live Now'}
          </button>

          {/* Score pill */}
          <div className="ac-hero-score-pill" style={{
            color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f2421b',
            background: score >= 80 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(242,66,27,0.15)',
          }}>
            Profile {score}% complete
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BODY
      ══════════════════════════════════════════ */}
      <div className="ac-body">

        {/* Left — Tabs */}
        <div className="ac-main">

          {/* Tab Nav */}
          <div className="ac-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`ac-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <t.Icon width={15} height={15} /> {t.label}
              </button>
            ))}
          </div>

          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <div className="ac-tab-content">

              {/* Completeness Card */}
              <div className="ac-card">
                <div className="ac-card-header">
                  <div>
                    <h3>Profile Completeness</h3>
                    <p>Complete all items to maximise visibility on the app.</p>
                  </div>
                  <div className="ac-score-ring-wrap">
                    <svg viewBox="0 0 56 56" className="ac-score-ring">
                      <circle cx="28" cy="28" r="23" className="ac-ring-bg" />
                      <circle
                        cx="28" cy="28" r="23"
                        className="ac-ring-fill"
                        strokeDasharray={`${(score / 100) * 144.5} 144.5`}
                        style={{ stroke: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f2421b' }}
                      />
                    </svg>
                    <span
                      className="ac-score-text"
                      style={{ color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f2421b' }}
                    >
                      {score}%
                    </span>
                  </div>
                </div>

                <div className="ac-completeness-list">
                  {COMPLETENESS_ITEMS.map(item => {
                    const done = completeness[item.key];
                    return (
                      <div key={item.key} className={`ac-check-item ${done ? 'done' : 'todo'}`}>
                        <div className="ac-check-icon">
                          {done
                            ? <Check width={16} height={16} />
                            : <item.Icon width={16} height={16} />}
                        </div>
                        <span className="ac-check-label">{item.label}</span>
                        {!done && (
                          <button
                            className="ac-check-cta"
                            onClick={() => {
                              if (item.link === 'profile') setActiveTab('profile');
                              else navigate(item.link);
                            }}
                          >
                            {item.linkLabel} <NavArrowRight width={11} height={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logo status notice */}
              <div className={`ac-notice ${tenantLogo ? 'ac-notice-ok' : 'ac-notice-warn'}`}>
                <MediaImageFolder width={16} height={16} />
                {tenantLogo
                  ? <>Your business logo is set. It will appear on your app listing automatically.</>
                  : <>No logo uploaded yet. Go to <button className="ac-notice-link" onClick={() => navigate('/beauty-settings/business')}>Business Info</button> to upload one.</>}
              </div>

              {/* Quick Links */}
              <div className="ac-quick-links">
                {[
                  { label: 'Business Info',  Icon: Settings,          path: '/beauty-settings/business', color: '#6366f1' },
                  { label: 'Service Menu',   Icon: Sparks,            path: '/beauty-settings/services', color: '#f59e0b' },
                  { label: 'Working Hours',  Icon: Clock,             path: '/beauty-settings/hours',    color: '#10b981' },
                  { label: 'Team & Staff',   Icon: Group,             path: '/beauty-settings/team',     color: '#f2421b' },
                ].map(q => (
                  <button key={q.path} className="ac-quick-link-card" onClick={() => navigate(q.path)}>
                    <div className="ac-ql-icon" style={{ background: `${q.color}18`, color: q.color }}>
                      <q.Icon width={18} height={18} />
                    </div>
                    <span>{q.label}</span>
                    <ArrowUpRight width={14} height={14} className="ac-ql-arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="ac-tab-content">
              <div className="ac-card">
                <div className="ac-card-header">
                  <div>
                    <h3 className="ac-section-title">Public Profile</h3>
                    <p className="ac-section-sub">This is what customers see on the Trasealla app listing.</p>
                  </div>
                  <button 
                    className="ac-btn-save" 
                    onClick={handleSave} 
                    disabled={saving}
                    data-tooltip="Save profile changes"
                  >
                    {saving
                      ? <><RefreshDouble width={15} height={15} className="ac-spin" /> Saving…</>
                      : <><Check width={15} height={15} /> Save Profile</>}
                  </button>
                </div>

                {/* Cover Photo Upload */}
                <div className="ac-cover-section">
                  <label className="ac-field-label">Cover Photo</label>
                  <div className="ac-cover-preview" onClick={() => setUploadModal({ show: true, type: 'cover' })}>
                    {form.cover_image ? (
                      <>
                        <img src={form.cover_image} alt="Cover" />
                        <div className="ac-cover-overlay">
                          <EditPencil width={20} height={20} />
                          <span>Change photo</span>
                        </div>
                      </>
                    ) : (
                      <div className="ac-cover-empty">
                        <Upload width={28} height={28} />
                        <strong>Upload Cover Photo</strong>
                        <span>Click to browse — PNG, JPG, max 5 MB</span>
                      </div>
                    )}
                  </div>
                  {form.cover_image && (
                    <button
                      className="ac-btn-remove-cover"
                      onClick={() => setField('cover_image', '')}
                    >
                      <Trash width={13} height={13} /> Remove cover
                    </button>
                  )}
                </div>

                <div className="ac-form-grid">
                  <div className="ac-field ac-field-full">
                    <label><AtSign width={13} height={13} /> Display Name</label>
                    <input
                      value={form.display_name}
                      onChange={e => setField('display_name', e.target.value)}
                      placeholder="e.g. Glow Beauty Salon"
                    />
                  </div>
                  <div className="ac-field">
                    <label>
                      <Link width={12} height={12} /> App Slug
                      <span className="ac-slug-prefix">app.trasealla.com/place/</span>
                    </label>
                    <input
                      value={form.slug}
                      onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-salon-name"
                    />
                  </div>
                  <div className="ac-field">
                    <label><Sparks width={12} height={12} /> Tagline <span className="ac-hint">shown below name</span></label>
                    <input
                      value={form.tagline}
                      onChange={e => setField('tagline', e.target.value)}
                      placeholder="e.g. Where Beauty Meets Luxury"
                      maxLength={80}
                    />
                  </div>
                  <div className="ac-field ac-field-full">
                    <label><InfoCircle width={12} height={12} /> About / Description</label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={e => setField('description', e.target.value)}
                      placeholder="Tell customers what makes your salon special…"
                      maxLength={500}
                    />
                    <span className="ac-char-count">{(form.description || '').length} / 500</span>
                  </div>
                  <div className="ac-field ac-field-full">
                    <label><MapPin width={12} height={12} /> Map Address</label>
                    <input
                      value={form.map_address}
                      onChange={e => setField('map_address', e.target.value)}
                      placeholder="Full address shown on the app map"
                    />
                  </div>
                </div>

                {/* Socials */}
                <div className="ac-section-divider">Social Links</div>
                <div className="ac-form-grid">
                  <div className="ac-field">
                    <label><Instagram width={13} height={13} /> Instagram</label>
                    <div className="ac-input-prefix">
                      <span>@</span>
                      <input value={form.instagram} onChange={e => setField('instagram', e.target.value)} placeholder="yoursalon" />
                    </div>
                  </div>
                  <div className="ac-field">
                    <label>
                      {/* Facebook SVG — not in iconoir */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </label>
                    <div className="ac-input-prefix">
                      <span>facebook.com/</span>
                      <input value={form.facebook} onChange={e => setField('facebook', e.target.value)} placeholder="yoursalon" />
                    </div>
                  </div>
                  <div className="ac-field">
                    <label>
                      {/* TikTok SVG — not in iconoir */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.89a8.28 8.28 0 004.84 1.54V7A4.86 4.86 0 0119.59 6.69z"/></svg>
                      TikTok
                    </label>
                    <div className="ac-input-prefix">
                      <span>@</span>
                      <input value={form.tiktok} onChange={e => setField('tiktok', e.target.value)} placeholder="yoursalon" />
                    </div>
                  </div>
                  <div className="ac-field">
                    <label><Globe width={13} height={13} /> Website</label>
                    <input value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://yoursalon.com" />
                  </div>
                </div>

                {/* Amenities */}
                <div className="ac-section-divider">Amenities</div>
                <div className="ac-pill-grid">
                  {AMENITIES_LIST.map(a => (
                    <button
                      key={a.id}
                      className={`ac-pill ${(form.amenities || []).includes(a.id) ? 'active' : ''}`}
                      onClick={() => toggleArr('amenities', a.id)}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>

                {/* Languages */}
                <div className="ac-section-divider">Spoken Languages</div>
                <div className="ac-pill-grid">
                  {LANGUAGES_LIST.map(l => (
                    <button
                      key={l}
                      className={`ac-pill ${(form.spoken_languages || []).includes(l) ? 'active' : ''}`}
                      onClick={() => toggleArr('spoken_languages', l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Tags */}
                <div className="ac-section-divider">Highlight Tags</div>
                <div className="ac-pill-grid">
                  {HIGHLIGHT_TAGS.map(t => (
                    <button
                      key={t}
                      className={`ac-pill ac-pill-tag ${(form.highlight_tags || []).includes(t) ? 'active' : ''}`}
                      onClick={() => toggleArr('highlight_tags', t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── BOOKING TAB ─── */}
          {activeTab === 'booking' && (
            <div className="ac-tab-content">
              <div className="ac-card">
                <div className="ac-card-header">
                  <div>
                    <h3 className="ac-section-title">Booking Rules</h3>
                    <p className="ac-section-sub">Control how customers can book via the mobile app.</p>
                  </div>
                  <button 
                    className="ac-btn-save" 
                    onClick={handleSave} 
                    disabled={saving}
                    data-tooltip="Save booking rules"
                  >
                    {saving
                      ? <><RefreshDouble width={15} height={15} className="ac-spin" /> Saving…</>
                      : <><Check width={15} height={15} /> Save Booking Rules</>}
                  </button>
                </div>

                {/* Mode selector */}
                <div className="ac-toggle-group">
                  {[
                    { id: 'auto',   label: 'Auto Confirm',    sub: 'Bookings confirmed instantly',   Icon: Flash   },
                    { id: 'manual', label: 'Manual Approval', sub: 'Staff must approve each request', Icon: Shield  },
                  ].map(m => (
                    <button
                      key={m.id}
                      className={`ac-mode-card ${form.booking_mode === m.id ? 'active' : ''}`}
                      onClick={() => setField('booking_mode', m.id)}
                    >
                      <m.Icon width={22} height={22} />
                      <div>
                        <strong>{m.label}</strong>
                        <p>{m.sub}</p>
                      </div>
                      {form.booking_mode === m.id && (
                        <Check width={18} height={18} className="ac-mode-check" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="ac-form-grid" style={{ marginTop: 20 }}>
                  <div className="ac-field">
                    <label>Min Notice <span className="ac-hint">hours before booking</span></label>
                    <div className="ac-number-input">
                      <button onClick={() => setField('min_notice_hours', Math.max(0, form.min_notice_hours - 1))}>−</button>
                      <span>{form.min_notice_hours}h</span>
                      <button onClick={() => setField('min_notice_hours', Math.min(72, form.min_notice_hours + 1))}>+</button>
                    </div>
                  </div>
                  <div className="ac-field">
                    <label>Max Future <span className="ac-hint">days ahead allowed</span></label>
                    <div className="ac-number-input">
                      <button onClick={() => setField('max_future_days', Math.max(1, form.max_future_days - 5))}>−</button>
                      <span>{form.max_future_days}d</span>
                      <button onClick={() => setField('max_future_days', Math.min(365, form.max_future_days + 5))}>+</button>
                    </div>
                  </div>
                  <div className="ac-field">
                    <label>Deposit Required <span className="ac-hint">% of service price</span></label>
                    <div className="ac-number-input">
                      <button onClick={() => setField('deposit_pct', Math.max(0, form.deposit_pct - 5))}>−</button>
                      <span>{form.deposit_pct}%</span>
                      <button onClick={() => setField('deposit_pct', Math.min(100, form.deposit_pct + 5))}>+</button>
                    </div>
                  </div>
                </div>

                <div className="ac-field" style={{ marginTop: 16 }}>
                  <label><InfoCircle width={12} height={12} /> Cancellation Policy <span className="ac-hint">shown before booking</span></label>
                  <textarea
                    rows={3}
                    value={form.cancellation_policy}
                    onChange={e => setField('cancellation_policy', e.target.value)}
                    placeholder="e.g. Cancellations less than 24 h before will forfeit the deposit."
                  />
                </div>

                <div className="ac-section-divider">Visibility on App</div>
                {[
                  { key: 'show_prices', label: 'Show service prices', sub: 'Display prices on your public profile' },
                  { key: 'show_staff',  label: 'Show team members',   sub: 'Let customers choose their preferred stylist' },
                ].map(row => (
                  <div key={row.key} className="ac-toggle-row">
                    <div>
                      <strong>{row.label}</strong>
                      <p>{row.sub}</p>
                    </div>
                    <button
                      className={`ac-switch ${form[row.key] ? 'on' : ''}`}
                      onClick={() => setField(row.key, !form[row.key])}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PLAN TAB ─── */}
          {activeTab === 'listing' && (
            <div className="ac-tab-content">
              <div className="ac-tiers">
                {TIERS.map(tier => {
                  const isCurrent = form.listing_tier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`ac-tier-card ${isCurrent ? 'current' : ''}`}
                      style={{ background: tier.gradient }}
                    >
                      {tier.badge && (
                        <span className="ac-tier-badge" style={{ background: tier.color }}>
                          {tier.badge}
                        </span>
                      )}
                      <div className="ac-tier-icon" style={{ color: tier.color, background: `${tier.color}15` }}>
                        <tier.Icon width={22} height={22} />
                      </div>
                      <h3 className="ac-tier-name" style={{ color: tier.color }}>{tier.label}</h3>
                      <div className="ac-tier-price">{tier.price}</div>
                      <div className="ac-tier-note">{tier.priceNote}</div>
                      <ul className="ac-tier-features">
                        {tier.features.map(f => (
                          <li key={f}>
                            <Check width={13} height={13} style={{ color: tier.color, flexShrink: 0 }} /> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`ac-tier-btn ${isCurrent ? 'current' : ''}`}
                        style={!isCurrent ? { background: tier.color, borderColor: tier.color } : {}}
                        onClick={() => {
                          if (!isCurrent) {
                            setField('listing_tier', tier.id);
                            showToast('success', `Switched to ${tier.label} — save to confirm.`);
                          }
                        }}
                      >
                        {isCurrent ? '✓ Current Plan' : `Upgrade to ${tier.label}`}
                      </button>
                    </div>
                  );
                })}
              </div>
              {form.listing_tier !== settings?.listing_tier && (
                <div className="ac-save-bar">
                  <button className="ac-btn-save" onClick={handleSave} disabled={saving}>
                    {saving
                      ? <><RefreshDouble width={15} height={15} className="ac-spin" /> Saving…</>
                      : <><Check width={15} height={15} /> Confirm Plan Change</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Phone Mockup ── */}
        <div className="ac-preview-col">
          <div className="ac-preview-sticky">
            <p className="ac-preview-label"><SmartphoneDevice width={13} height={13} /> App Preview</p>
            <div className="ac-phone-frame">
              <div className="ac-phone-screen">
                <div className="ac-phone-statusbar"><span>9:41</span><span>●●●</span></div>
                <div className="ac-phone-appbar">
                  <span className="ac-phone-back">‹</span>
                  <span>Trasealla</span>
                  <Star width={14} height={14} />
                </div>
                <div
                  className="ac-phone-cover"
                  style={form.cover_image ? { backgroundImage: `url(${form.cover_image})` } : {}}
                >
                  {!form.cover_image && <MediaImageFolder width={28} height={28} color="#94a3b8" />}
                  {isLive && <div className="ac-phone-live-badge">● LIVE</div>}
                </div>
                <div className="ac-phone-info">
                  {tenantLogo && <img src={tenantLogo} alt="logo" className="ac-phone-logo" />}
                  <div className="ac-phone-name">{form.display_name || 'Your Salon Name'}</div>
                  {form.tagline && <div className="ac-phone-tagline">{form.tagline}</div>}
                  <div className="ac-phone-meta">
                    <Star width={9} height={9} />
                    <span>{settings?.avg_rating ? parseFloat(settings.avg_rating).toFixed(1) : '5.0'}</span>
                    <span className="ac-phone-dot" />
                    <MapPin width={9} height={9} />
                    <span>{form.map_address ? form.map_address.split(',')[0] : 'Location'}</span>
                  </div>
                  {(form.highlight_tags || []).length > 0 && (
                    <div className="ac-phone-tags">
                      {form.highlight_tags.slice(0, 2).map(t => <span key={t}>{t}</span>)}
                    </div>
                  )}
                  {(form.amenities || []).length > 0 && (
                    <div className="ac-phone-amenities">
                      {AMENITIES_LIST.filter(a => form.amenities.includes(a.id)).slice(0, 4).map(a => (
                        <span key={a.id}>{a.icon}</span>
                      ))}
                    </div>
                  )}
                  <button className="ac-phone-book-btn">Book Now</button>
                </div>
              </div>
              <div className="ac-phone-notch" />
            </div>
            <p className="ac-preview-note">Live preview updates as you type</p>
          </div>
        </div>
      </div>
    </div>
  );
}
