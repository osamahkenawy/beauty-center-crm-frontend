import { useState, useCallback, useRef } from 'react';
import {
  Building2, Pencil, Save, Globe, MapPin, Phone, Mail,
  DollarSign, Receipt, ExternalLink, ArrowUpRight,
  Sparkles, Shield, ChevronRight, X, Link2, Upload, Trash2, Camera, Image as ImageIcon, Check
} from 'lucide-react';
import { Badge, Modal } from 'react-bootstrap';
import useCountries, { getFlagEmoji } from '../../hooks/useCountries';
import CountryPicker from './CountryPicker';
import LocationPicker from './LocationPicker';
import api from '../../lib/api';

/* ── Social platform configs with brand colors ── */
const SOCIAL_PLATFORMS = [
  {
    key: 'facebook', label: 'Facebook', color: '#1877F2', bg: '#e7f0ff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    placeholder: 'facebook.com/yourbusiness',
  },
  {
    key: 'instagram', label: 'Instagram', color: '#E4405F', bg: '#fce8ed',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    placeholder: 'instagram.com/yourbusiness',
  },
  {
    key: 'twitter', label: 'X (Twitter)', color: '#000000', bg: '#f2f4f7',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    placeholder: 'x.com/yourbusiness',
  },
  {
    key: 'website', label: 'Website', color: '#2E90FA', bg: '#eff8ff',
    icon: <Globe size={20} />,
    placeholder: 'https://yourbusiness.com',
  },
];

export default function BusinessSetup({ businessInfo, onBusinessChange, onSave, branches, onNavigate, showToast }) {
  const { countries, loading: countriesLoading, findCountry, allCurrencies } = useCountries();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ ...businessInfo });
  const [socialLinks, setSocialLinks] = useState({
    facebook: businessInfo.facebook || '',
    instagram: businessInfo.instagram || '',
    twitter: businessInfo.twitter || '',
    website: businessInfo.website || '',
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  /* ── Social Connect Modal ── */
  const [socialModal, setSocialModal] = useState({ show: false, platform: null });
  const [socialModalValue, setSocialModalValue] = useState('');

  // Resolve current country
  const currentCountryObj = findCountry(businessInfo.country || businessInfo.country_code);
  const currentCurrency = currentCountryObj?.currency;
  const displayCurrencyCode = businessInfo.currency || currentCurrency?.code || 'AED';
  const displayCurrencySymbol = currentCurrency?.symbol || displayCurrencyCode;

  const openEdit = () => {
    setEditForm({ ...businessInfo });
    setSocialLinks({
      facebook: businessInfo.facebook || '',
      instagram: businessInfo.instagram || '',
      twitter: businessInfo.twitter || '',
      website: businessInfo.website || '',
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    // Update local state
    Object.entries(editForm).forEach(([k, v]) => onBusinessChange(k, v));
    Object.entries(socialLinks).forEach(([k, v]) => onBusinessChange(k, v));

    // Persist to backend (tenant record)
    try {
      const saveRes = await api.patch('/tenants/current', {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        city: editForm.city || undefined,
        country: editForm.country || undefined,
        timezone: editForm.timezone || undefined,
        currency: editForm.currency || undefined,
        logo_url: editForm.logo || undefined,
        settings: JSON.stringify({
          description: editForm.description || '',
          tax_type: editForm.tax_type || 'include',
          latitude: editForm.latitude,
          longitude: editForm.longitude,
          facebook: socialLinks.facebook || '',
          instagram: socialLinks.instagram || '',
          twitter: socialLinks.twitter || '',
          website: socialLinks.website || '',
        }),
      });
      if (!saveRes.success) {
        showToast('error', saveRes.message || 'Failed to save — insufficient permissions');
        return;
      }
    } catch (e) {
      console.error('Failed to persist business info:', e);
      showToast('error', 'Failed to save business details');
      return;
    }

    setEditMode(false);
    showToast('success', 'Business details saved');
  };

  /* ── Logo upload ── */
  const handleLogoUpload = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');
      const res = await api.post('/uploads', formData);
      if (res.success && res.data) {
        const url = res.data.url;
        setEditForm(p => ({ ...p, logo: url, logo_key: res.data.key }));
        onBusinessChange('logo', url);
        onBusinessChange('logo_key', res.data.key);

        // Persist logo_url to tenant record in the backend
        try {
          const saveRes = await api.patch('/tenants/current', { logo_url: url });
          if (!saveRes.success) {
            console.warn('Could not persist logo to tenant:', saveRes.message);
          }
        } catch (e) { console.warn('Could not persist logo to tenant:', e); }

        showToast('success', 'Logo uploaded!');
      } else {
        showToast('error', res.message || 'Logo upload failed');
      }
    } catch (e) {
      console.error('Logo upload failed:', e);
      showToast('error', 'Failed to upload logo — check server connection');
    }
    setLogoUploading(false);
  };

  const handleLogoRemove = async () => {
    setEditForm(p => ({ ...p, logo: '', logo_key: '' }));
    onBusinessChange('logo', '');
    onBusinessChange('logo_key', '');
    try { await api.patch('/tenants/current', { logo_url: '' }); } catch (e) { /* ignore */ }
  };

  const openSocialModal = (platform) => {
    setSocialModalValue(businessInfo[platform.key] || '');
    setSocialModal({ show: true, platform });
  };

  const handleSocialConnect = async () => {
    const p = socialModal.platform;
    if (!p) return;

    // Update local state
    onBusinessChange(p.key, socialModalValue);
    setSocialModal({ show: false, platform: null });

    // Persist to backend — build current social links from businessInfo + new value
    const updatedLinks = {};
    SOCIAL_PLATFORMS.forEach(sp => {
      updatedLinks[sp.key] = sp.key === p.key ? socialModalValue : (businessInfo[sp.key] || '');
    });

    try {
      // Merge with existing settings
      const currentSettings = {};
      ['description', 'tax_type', 'latitude', 'longitude'].forEach(k => {
        if (businessInfo[k] !== undefined) currentSettings[k] = businessInfo[k];
      });

      await api.patch('/tenants/current', {
        settings: JSON.stringify({ ...currentSettings, ...updatedLinks }),
      });
    } catch (e) {
      console.warn('Could not persist social link:', e);
    }

    showToast('success', `${p.label} ${socialModalValue ? 'connected' : 'disconnected'}!`);
  };

  /* ── Country change → auto-set currency + map ── */
  const handleCountryChange = useCallback((countryObj) => {
    if (!countryObj) {
      setEditForm(p => ({ ...p, country: '', country_code: '', currency: '' }));
      return;
    }
    const updates = {
      country: countryObj.name,
      country_code: countryObj.code,
    };
    if (countryObj.currency) {
      updates.currency = countryObj.currency.code;
    }
    if (countryObj.latlng && countryObj.latlng.length === 2) {
      if (!editForm.latitude || !editForm.longitude) {
        updates.latitude = countryObj.latlng[0];
        updates.longitude = countryObj.latlng[1];
      }
    }
    setEditForm(p => ({ ...p, ...updates }));
  }, [editForm.latitude, editForm.longitude]);

  const selectedCountryCode = (() => {
    if (editForm.country_code) return editForm.country_code;
    const found = findCountry(editForm.country);
    return found?.code || '';
  })();

  const connectedCount = SOCIAL_PLATFORMS.filter(p => businessInfo[p.key]).length;
  const logoUrl = businessInfo.logo || editForm.logo;

  /* ═══════════════════════════════════════════════
     READ-ONLY VIEW
     ═══════════════════════════════════════════════ */
  if (!editMode) {
    return (
      <div className="biz-page">
        {/* ─── Hero Banner ─── */}
        <div className="biz-banner">
          <div className="biz-banner-bg" />
          <div className="biz-banner-content">
            <div className="biz-banner-avatar">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} alt={businessInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span>{(businessInfo.name || 'B').charAt(0).toUpperCase()}</span>
              )}
              <div className="biz-banner-avatar-glow" />
            </div>
            <div className="biz-banner-text">
              <h1>{businessInfo.name || 'Your Business'}</h1>
              {businessInfo.description && <p>{businessInfo.description}</p>}
              <div className="biz-banner-tags">
                {(businessInfo.country || currentCountryObj) && (
                  <span className="biz-tag">
                    {currentCountryObj ? (
                      <><span className="biz-tag-flag">{currentCountryObj.flagEmoji}</span> {currentCountryObj.name}</>
                    ) : (
                      <><MapPin size={12} /> {businessInfo.country}</>
                    )}
                  </span>
                )}
                {displayCurrencyCode && (
                  <span className="biz-tag"><DollarSign size={12} /> {displayCurrencyCode} ({displayCurrencySymbol})</span>
                )}
                <span className="biz-tag">
                  <Receipt size={12} />
                  {businessInfo.tax_type === 'exclude' ? 'Excl. tax' : 'Incl. tax'}
                </span>
                <span className="biz-tag biz-tag-active">
                  <Sparkles size={12} /> Active
                </span>
              </div>
            </div>
            <button className="biz-edit-fab" onClick={openEdit} title="Edit business details">
              <Pencil size={16} />
            </button>
          </div>
        </div>

        {/* ─── Quick Stats Strip ─── */}
        <div className="biz-stats-strip">
          <div className="biz-stat-pill" onClick={() => onNavigate('branches')}>
            <div className="biz-stat-icon branches"><Building2 size={18} /></div>
            <div className="biz-stat-text">
              <strong>{branches.length}</strong>
              <span>{branches.length === 1 ? 'Location' : 'Locations'}</span>
            </div>
          </div>
          <div className="biz-stat-pill">
            <div className="biz-stat-icon links"><Link2 size={18} /></div>
            <div className="biz-stat-text">
              <strong>{connectedCount}/{SOCIAL_PLATFORMS.length}</strong>
              <span>Links</span>
            </div>
          </div>
          <div className="biz-stat-pill">
            <div className="biz-stat-icon security"><Shield size={18} /></div>
            <div className="biz-stat-text">
              <strong>{businessInfo.latitude ? 'Set' : '—'}</strong>
              <span>GPS</span>
            </div>
          </div>
        </div>

        {/* ─── Contact Details Card ─── */}
        <div className="biz-section">
          <div className="biz-section-head">
            <h3><Phone size={16} /> Contact details</h3>
          </div>
          <div className="biz-contact-cards">
            <div className="biz-contact-card">
              <div className="biz-cc-icon" style={{ background: '#eff8ff', color: '#2e90fa' }}>
                <Mail size={18} />
              </div>
              <div className="biz-cc-body">
                <label>Email</label>
                <span>{businessInfo.email || '—'}</span>
              </div>
            </div>
            <div className="biz-contact-card">
              <div className="biz-cc-icon" style={{ background: '#ecfdf3', color: '#059669' }}>
                <Phone size={18} />
              </div>
              <div className="biz-cc-body">
                <label>Phone</label>
                <span>{businessInfo.phone || '—'}</span>
              </div>
            </div>
            <div className="biz-contact-card wide">
              <div className="biz-cc-icon" style={{ background: '#fef3f2', color: '#d92d20' }}>
                <MapPin size={18} />
              </div>
              <div className="biz-cc-body">
                <label>Address</label>
                <span>{businessInfo.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── External Links Card ─── */}
        <div className="biz-section">
          <div className="biz-section-head">
            <h3><ExternalLink size={16} /> External links</h3>
            <span className="biz-section-badge">{connectedCount} connected</span>
          </div>
          <div className="biz-links-grid">
            {SOCIAL_PLATFORMS.map(p => {
              const val = businessInfo[p.key];
              const connected = !!val;
              return (
                <div className={`biz-link-card ${connected ? 'connected' : ''}`} key={p.key}>
                  <div className="biz-link-icon" style={{ background: p.bg, color: p.color }}>
                    {p.icon}
                  </div>
                  <div className="biz-link-body">
                    <strong>{p.label}</strong>
                    {connected ? (
                      <a
                        href={val.startsWith('http') ? val : `https://${val}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="biz-link-url"
                      >
                        {val.replace(/^https?:\/\/(www\.)?/, '')} <ArrowUpRight size={11} />
                      </a>
                    ) : (
                      <span className="biz-link-empty">Not connected</span>
                    )}
                  </div>
                  {connected ? (
                    <button className="biz-link-check" onClick={() => openSocialModal(p)} title="Edit link">
                      <Check size={14} />
                    </button>
                  ) : (
                    <button className="biz-link-connect" onClick={() => openSocialModal(p)}>
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Map Location ─── */}
        <div className="biz-section">
          <div className="biz-section-head">
            <h3><MapPin size={16} /> Business location</h3>
          </div>
          <div className="biz-map-wrapper">
            <LocationPicker
              latitude={businessInfo.latitude}
              longitude={businessInfo.longitude}
              markers={branches
                .filter((b) => Number.isFinite(parseFloat(b.latitude)) && Number.isFinite(parseFloat(b.longitude)))
                .map((b) => ({
                  id: b.id,
                  lat: parseFloat(b.latitude),
                  lng: parseFloat(b.longitude),
                  label: b.name,
                  isHeadquarters: !!b.is_headquarters,
                  isActive: !!b.is_active,
                }))}
              onLocationSelect={(lat, lng, addr) => {
                onBusinessChange('latitude', lat);
                onBusinessChange('longitude', lng);
                if (addr) onBusinessChange('address', addr);
              }}
              height={300}
            />
          </div>
        </div>

        {/* ─── Locations Overview ─── */}
        <div className="biz-section">
          <div className="biz-section-head">
            <h3><Building2 size={16} /> Locations</h3>
            <button className="biz-section-action" onClick={() => onNavigate('branches')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {branches.length === 0 ? (
            <div className="biz-empty-locations">
              <div className="biz-empty-icon"><Building2 size={32} strokeWidth={1.2} /></div>
              <h4>No locations yet</h4>
              <p>Add your first branch or location to get started</p>
              <button className="stn-btn-primary" onClick={() => onNavigate('branches')}>
                <Building2 size={14} /> Add location
              </button>
            </div>
          ) : (
            <div className="biz-branch-list">
              {branches.slice(0, 4).map(b => (
                <div className="biz-branch-item" key={b.id} onClick={() => onNavigate('branches')}>
                  <div className="biz-branch-icon">
                    <Building2 size={16} />
                  </div>
                  <div className="biz-branch-info">
                    <strong>{b.name}</strong>
                    <span>{b.address || b.city || 'No address set'}</span>
                  </div>
                  <div className="biz-branch-badges">
                    {b.staff_count !== undefined && b.staff_count > 0 && (
                      <span className="biz-branch-count">{b.staff_count}</span>
                    )}
                    {!!b.is_headquarters && <Badge bg="" className="biz-badge-hq">HQ</Badge>}
                    <Badge bg="" className={`biz-badge-status ${b.is_active ? 'active' : ''}`}>
                      {b.is_active ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <ChevronRight size={16} className="biz-branch-arrow" />
                </div>
              ))}
              {branches.length > 4 && (
                <div className="biz-branch-more" onClick={() => onNavigate('branches')}>
                  +{branches.length - 4} more locations
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Social Connect Modal ─── */}
        <Modal
          show={socialModal.show}
          onHide={() => setSocialModal({ show: false, platform: null })}
          centered
          className="stn-modal social-connect-modal"
        >
          {socialModal.platform && (
            <>
              <Modal.Body style={{ padding: 0 }}>
                <div className="scm-content">
                  {/* Platform branding header */}
                  <div className="scm-header" style={{ background: socialModal.platform.bg }}>
                    <div className="scm-logo" style={{ color: socialModal.platform.color }}>
                      {socialModal.platform.icon}
                    </div>
                    <button className="scm-close" onClick={() => setSocialModal({ show: false, platform: null })}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="scm-body">
                    <h3 className="scm-title">Connect {socialModal.platform.label}</h3>
                    <p className="scm-desc">
                      {businessInfo[socialModal.platform.key]
                        ? `Currently connected. Update or remove your ${socialModal.platform.label} link below.`
                        : `Add your ${socialModal.platform.label} link to let clients find you online.`}
                    </p>

                    <div className="scm-input-wrap">
                      <div className="scm-input-icon" style={{ background: socialModal.platform.bg, color: socialModal.platform.color }}>
                        {socialModal.platform.icon}
                      </div>
                      <input
                        type="url"
                        className="scm-input"
                        placeholder={socialModal.platform.placeholder}
                        value={socialModalValue}
                        onChange={e => setSocialModalValue(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSocialConnect(); }}
                      />
                      {socialModalValue && (
                        <button className="scm-input-clear" onClick={() => setSocialModalValue('')}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="scm-footer">
                    {businessInfo[socialModal.platform.key] && (
                      <button
                        className="stn-btn-outline scm-disconnect"
                        onClick={() => { setSocialModalValue(''); handleSocialConnect(); }}
                      >
                        Disconnect
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="stn-btn-outline" onClick={() => setSocialModal({ show: false, platform: null })}>
                      Cancel
                    </button>
                    <button className="stn-btn-primary" onClick={handleSocialConnect} style={{ background: '#f2421b' }}>
                      <Check size={14} /> {businessInfo[socialModal.platform.key] ? 'Update' : 'Connect'}
                    </button>
                  </div>
                </div>
              </Modal.Body>
            </>
          )}
        </Modal>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     EDIT MODE
     ═══════════════════════════════════════════════ */
  const currencyOptions = (() => {
    if (allCurrencies.length > 0) return allCurrencies;
    return [
      { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
      { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
    ];
  })();

  return (
    <div className="biz-page">
      <div className="biz-edit-bar">
        <div className="biz-edit-bar-left">
          <Pencil size={16} />
          <span>Editing business details</span>
        </div>
        <div className="biz-edit-bar-right">
          <button className="stn-btn-outline" onClick={() => setEditMode(false)}>
            <X size={14} /> Cancel
          </button>
          <button className="stn-btn-primary" onClick={handleSaveEdit}>
            <Save size={14} /> Save changes
          </button>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><Camera size={16} /> Business logo</h3>
        </div>
        <div className="biz-logo-area">
          {editForm.logo ? (
            <div className="biz-logo-preview">
              <img src={editForm.logo} alt="Business logo" />
            </div>
          ) : (
            <div className="biz-logo-placeholder" onClick={() => logoInputRef.current?.click()}>
              <ImageIcon size={28} strokeWidth={1.3} />
            </div>
          )}
          <div className="biz-logo-info">
            <h4>Upload your logo</h4>
            <p>This will be shown on your booking page, invoices and receipts. Recommended: 512×512px, PNG or JPG.</p>
            {logoUploading ? (
              <div className="biz-logo-uploading">
                <span className="cpk-spinner" />
                Uploading...
              </div>
            ) : (
              <div className="biz-logo-actions">
                <button className="biz-logo-btn primary" onClick={() => logoInputRef.current?.click()}>
                  <Upload size={13} /> {editForm.logo ? 'Change logo' : 'Upload logo'}
                </button>
                {editForm.logo && (
                  <button className="biz-logo-btn danger" onClick={handleLogoRemove}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); e.target.value = ''; }}
          />
        </div>
      </div>

      {/* Business info */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><Sparkles size={16} /> Business info</h3>
        </div>
        <div className="biz-edit-form">
          <p className="biz-edit-hint">Choose the name displayed on your booking profile, receipts and client messages.</p>
          <div className="stn-form-grid">
            <div className="stn-field span-2">
              <label>Business name</label>
              <input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Glow Beauty Salon" />
            </div>
            <div className="stn-field span-2">
              <label>Description</label>
              <textarea rows={2} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="A short description of your business..." />
            </div>
            <div className="stn-field">
              <label>Country</label>
              <CountryPicker
                countries={countries}
                value={selectedCountryCode}
                onChange={handleCountryChange}
                loading={countriesLoading}
                placeholder="Select your country"
              />
            </div>
            <div className="stn-field">
              <label>Currency {editForm.currency && <small style={{ color: '#667085', fontWeight: 400 }}>(auto-set from country)</small>}</label>
              <select value={editForm.currency || 'AED'} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                {currencyOptions.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><Receipt size={16} /> Tax calculation</h3>
        </div>
        <div className="biz-edit-form">
          <div className="stn-radio-group">
            <label className={`stn-radio-option ${editForm.tax_type !== 'exclude' ? 'selected' : ''}`}>
              <input type="radio" name="tax_type" checked={editForm.tax_type !== 'exclude'} onChange={() => setEditForm(p => ({ ...p, tax_type: 'include' }))} />
              <div>
                <strong>Prices include tax</strong>
                <span>Tax = (Tax rate × Retail price) / (1 + Tax rate)</span>
              </div>
            </label>
            <label className={`stn-radio-option ${editForm.tax_type === 'exclude' ? 'selected' : ''}`}>
              <input type="radio" name="tax_type" checked={editForm.tax_type === 'exclude'} onChange={() => setEditForm(p => ({ ...p, tax_type: 'exclude' }))} />
              <div>
                <strong>Prices exclude tax</strong>
                <span>Tax = Retail × Tax rate</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><Phone size={16} /> Contact details</h3>
        </div>
        <div className="biz-edit-form">
          <div className="stn-form-grid">
            <div className="stn-field">
              <label>Email</label>
              <input type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="hello@yourbusiness.com" />
            </div>
            <div className="stn-field">
              <label>Phone</label>
              <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971 50 000 0000" />
            </div>
            <div className="stn-field span-2">
              <label>Address</label>
              <input type="text" value={editForm.address || ''} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} placeholder="Full street address" />
            </div>
          </div>
        </div>
      </div>

      {/* Social links */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><Link2 size={16} /> External links</h3>
        </div>
        <div className="biz-edit-form">
          <div className="biz-social-edit-list">
            {SOCIAL_PLATFORMS.map(p => (
              <div className="biz-social-edit-row" key={p.key}>
                <div className="biz-social-edit-icon" style={{ background: p.bg, color: p.color }}>
                  {p.icon}
                </div>
                <div className="biz-social-edit-field">
                  <label>{p.label}</label>
                  <input
                    type="url"
                    placeholder={p.placeholder}
                    value={socialLinks[p.key]}
                    onChange={e => setSocialLinks(prev => ({ ...prev, [p.key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="biz-section">
        <div className="biz-section-head">
          <h3><MapPin size={16} /> Business location</h3>
        </div>
        <div className="biz-map-wrapper">
          <LocationPicker
            latitude={editForm.latitude}
            longitude={editForm.longitude}
            onLocationSelect={(lat, lng, addr) => {
              setEditForm(p => ({ ...p, latitude: lat, longitude: lng, ...(addr ? { address: addr } : {}) }));
            }}
            height={320}
          />
        </div>
      </div>
    </div>
  );
}
