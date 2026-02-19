import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

/* ─── Constants ─── */
const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '📋', color: '#667085' },
  { id: 'appointment', label: 'Appointments', icon: '📅', color: '#2e90fa' },
  { id: 'reminder', label: 'Reminders', icon: '⏰', color: '#f59e0b' },
  { id: 'welcome', label: 'Welcome', icon: '👋', color: '#10b981' },
  { id: 'review', label: 'Reviews', icon: '⭐', color: '#8b5cf6' },
  { id: 'birthday', label: 'Birthday', icon: '🎂', color: '#ec4899' },
  { id: 'promotion', label: 'Promotions', icon: '🎉', color: '#f2421b' },
  { id: 'marketing', label: 'Marketing', icon: '📢', color: '#06b6d4' },
  { id: 'transactional', label: 'Transactional', icon: '💼', color: '#6366f1' },
  { id: 'membership', label: 'Membership', icon: '💳', color: '#14b8a6' },
  { id: 'general', label: 'General', icon: '✉️', color: '#64748b' },
];

const TEMPLATE_TYPES = [
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
];

const PLACEHOLDERS = [
  { key: '{{client_name}}', label: 'Client Name', icon: '👤' },
  { key: '{{first_name}}', label: 'First Name', icon: '👤' },
  { key: '{{business_name}}', label: 'Business Name', icon: '🏢' },
  { key: '{{service_name}}', label: 'Service', icon: '💇' },
  { key: '{{appointment_date}}', label: 'Date', icon: '📅' },
  { key: '{{appointment_time}}', label: 'Time', icon: '🕐' },
  { key: '{{staff_name}}', label: 'Staff', icon: '👨‍💼' },
  { key: '{{promo_code}}', label: 'Promo Code', icon: '🎫' },
  { key: '{{discount}}', label: 'Discount', icon: '💰' },
  { key: '{{invoice_number}}', label: 'Invoice #', icon: '🧾' },
  { key: '{{total}}', label: 'Total', icon: '💵' },
  { key: '{{review_link}}', label: 'Review Link', icon: '🔗' },
  { key: '{{booking_link}}', label: 'Booking Link', icon: '🔗' },
];

export default function EmailTemplatesManager({ api: apiProp, showToast }) {
  const apiClient = apiProp || api;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState('edit'); // 'edit' | 'preview'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const bodyRef = useRef(null);

  // Editor form
  const [form, setForm] = useState({
    name: '', subject: '', body: '', category: 'general',
    template_type: 'email', preview_text: '', is_active: true,
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/email-templates');
      if (data.success) {
        setTemplates(data.data || []);
        if (!data.data || data.data.length === 0) {
          setSeeding(true);
          const seedResult = await apiClient.post('/email-templates/seed-defaults');
          if (seedResult.success) {
            const refreshed = await apiClient.get('/email-templates');
            if (refreshed.success) setTemplates(refreshed.data || []);
          }
          setSeeding(false);
        }
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
      showToast?.('error', 'Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, [apiClient, showToast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Escape key handler for modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(null);
        else if (showPreview) { setShowPreview(false); setSelectedTemplate(null); }
        else if (showEditor) setShowEditor(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showEditor, showPreview, showDeleteConfirm]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (activeCategory !== 'all') list = list.filter(t => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeCategory, search]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: templates.length };
    templates.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  // Stats
  const stats = useMemo(() => {
    const active = templates.filter(t => t.is_active).length;
    const inactive = templates.length - active;
    const defaults = templates.filter(t => t.is_default).length;
    const custom = templates.length - defaults;
    const channels = {};
    templates.forEach(t => {
      const ch = t.template_type || 'email';
      channels[ch] = (channels[ch] || 0) + 1;
    });
    return { active, inactive, defaults, custom, channels };
  }, [templates]);

  // Open editor
  const openEditor = (template = null) => {
    if (template) {
      setForm({
        name: template.name || '',
        subject: template.subject || '',
        body: template.body || '',
        category: template.category || 'general',
        template_type: template.template_type || 'email',
        preview_text: template.preview_text || '',
        is_active: template.is_active === 1 || template.is_active === true,
      });
      setSelectedTemplate(template);
    } else {
      setForm({
        name: '', subject: '', body: '', category: 'general',
        template_type: 'email', preview_text: '', is_active: true,
      });
      setSelectedTemplate(null);
    }
    setEditorTab('edit');
    setShowEditor(true);
    setShowPreview(false);
  };

  // Save template
  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      showToast?.('error', 'Name, subject, and body are required');
      return;
    }
    setSaving(true);
    try {
      let data;
      if (selectedTemplate) {
        data = await apiClient.patch(`/email-templates/${selectedTemplate.id}`, form);
      } else {
        data = await apiClient.post('/email-templates', form);
      }
      if (data.success) {
        showToast?.('success', selectedTemplate ? 'Template updated' : 'Template created');
        fetchTemplates();
        setShowEditor(false);
        setSelectedTemplate(null);
      } else {
        showToast?.('error', data.message || 'Failed to save');
      }
    } catch (e) {
      showToast?.('error', 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate
  const handleDuplicate = async (template) => {
    try {
      const data = await apiClient.post(`/email-templates/${template.id}/duplicate`);
      if (data.success) {
        showToast?.('success', 'Template duplicated');
        fetchTemplates();
      }
    } catch (e) {
      showToast?.('error', 'Failed to duplicate');
    }
  };

  // Toggle active
  const handleToggle = async (template) => {
    try {
      const data = await apiClient.patch(`/email-templates/${template.id}`, {
        is_active: !template.is_active,
      });
      if (data.success) {
        showToast?.('success', template.is_active ? 'Template deactivated' : 'Template activated');
        fetchTemplates();
      }
    } catch (e) {
      showToast?.('error', 'Failed to update');
    }
  };

  // Delete
  const handleDelete = async (template) => {
    try {
      const data = await apiClient.delete(`/email-templates/${template.id}`);
      if (data.success) {
        showToast?.('success', 'Template deleted');
        setShowDeleteConfirm(null);
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(null);
          setShowEditor(false);
        }
        fetchTemplates();
      } else {
        showToast?.('error', data.message || 'Failed to delete');
      }
    } catch (e) {
      showToast?.('error', 'Failed to delete template');
    }
  };

  // Seed defaults
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const data = await apiClient.post('/email-templates/seed-defaults');
      if (data.success) {
        showToast?.('success', data.message || 'Default templates added');
        fetchTemplates();
      }
    } catch (e) {
      showToast?.('error', 'Failed to seed defaults');
    } finally {
      setSeeding(false);
    }
  };

  // Insert placeholder at cursor
  const insertPlaceholder = (key) => {
    if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = form.body;
      const newText = text.substring(0, start) + key + text.substring(end);
      setForm(prev => ({ ...prev, body: newText }));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + key.length, start + key.length);
      }, 0);
    } else {
      setForm(prev => ({ ...prev, body: prev.body + key }));
    }
  };

  // Get category info
  const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  // Strip HTML for preview text
  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Replace placeholders with sample data
  const renderPreview = (html) => {
    if (!html) return '';
    return html
      .replace(/\{\{client_name\}\}/g, 'Sarah Johnson')
      .replace(/\{\{first_name\}\}/g, 'Sarah')
      .replace(/\{\{business_name\}\}/g, 'Trasealla Beauty Center')
      .replace(/\{\{service_name\}\}/g, 'Hair Treatment & Styling')
      .replace(/\{\{appointment_date\}\}/g, 'March 15, 2026')
      .replace(/\{\{appointment_time\}\}/g, '2:30 PM')
      .replace(/\{\{staff_name\}\}/g, 'Maria Chen')
      .replace(/\{\{promo_code\}\}/g, 'BEAUTY20')
      .replace(/\{\{discount\}\}/g, '20%')
      .replace(/\{\{invoice_number\}\}/g, 'INV-0042')
      .replace(/\{\{total\}\}/g, 'AED 350.00')
      .replace(/\{\{review_link\}\}/g, '#')
      .replace(/\{\{booking_link\}\}/g, '#');
  };

  if (loading || seeding) {
    return (
      <div className="et-page">
        <div className="et-loading">
          <div className="et-loading-spinner" />
          <p>{seeding ? 'Setting up default templates...' : 'Loading templates...'}</p>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <div className="et-page">
      {/* ─── Hero Header ─── */}
      <div className="et-hero">
        <div className="et-hero-bg" />
        <div className="et-hero-content">
          <div className="et-hero-left">
            <div className="et-hero-icon-wrap">
              <span className="et-hero-icon">✉️</span>
            </div>
            <div>
              <h2 className="et-hero-title">Email Templates</h2>
              <p className="et-hero-sub">Design and manage your automated messages</p>
            </div>
          </div>
          <div className="et-hero-actions">
            <button className="et-btn-ghost" onClick={handleSeedDefaults} disabled={seeding}>
              <span>🔄</span> Reset Defaults
            </button>
            <button className="et-btn-accent" onClick={() => openEditor()}>
              <span>＋</span> New Template
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Strip ─── */}
      <div className="et-stats-strip">
        <div className="et-stat-card">
          <div className="et-stat-icon" style={{ background: '#eff8ff', color: '#2e90fa' }}>📊</div>
          <div className="et-stat-info">
            <span className="et-stat-num">{templates.length}</span>
            <span className="et-stat-label">Total Templates</span>
          </div>
        </div>
        <div className="et-stat-card">
          <div className="et-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>✓</div>
          <div className="et-stat-info">
            <span className="et-stat-num">{stats.active}</span>
            <span className="et-stat-label">Active</span>
          </div>
        </div>
        <div className="et-stat-card">
          <div className="et-stat-icon" style={{ background: '#fefce8', color: '#ca8a04' }}>⚡</div>
          <div className="et-stat-info">
            <span className="et-stat-num">{stats.custom}</span>
            <span className="et-stat-label">Custom</span>
          </div>
        </div>
        <div className="et-stat-card">
          <div className="et-stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>🔒</div>
          <div className="et-stat-info">
            <span className="et-stat-num">{stats.defaults}</span>
            <span className="et-stat-label">Default</span>
          </div>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="et-toolbar">
        <div className="et-toolbar-left">
          {/* Category scroll */}
          <div className="et-categories">
            {CATEGORIES.filter(c => c.id === 'all' || (categoryCounts[c.id] || 0) > 0).map(cat => (
              <button
                key={cat.id}
                className={`et-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={activeCategory === cat.id ? { '--cat-color': cat.color } : {}}
              >
                <span className="et-cat-icon">{cat.icon}</span>
                <span className="et-cat-label">{cat.label}</span>
                {(categoryCounts[cat.id] || 0) > 0 && (
                  <span className="et-cat-count">{categoryCounts[cat.id]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="et-toolbar-right">
          {/* Search */}
          <div className="et-search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="et-search-input"
            />
            {search && (
              <button className="et-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>
          {/* View toggle */}
          <div className="et-view-toggle">
            <button className={`et-vt-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </button>
            <button className={`et-vt-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="3" rx="1"/><rect x="3" y="10.5" width="18" height="3" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Templates Display ─── */}
      {filteredTemplates.length === 0 ? (
        <div className="et-empty">
          <div className="et-empty-visual">
            <span>📭</span>
          </div>
          <h3>No templates found</h3>
          <p>{activeCategory !== 'all' ? 'Try a different category or create a new one' : 'Create your first template to get started'}</p>
          <button className="et-btn-accent" onClick={() => openEditor()}>
            <span>＋</span> Create Template
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="et-grid">
          {filteredTemplates.map(template => {
            const cat = getCat(template.category);
            const typeInfo = TEMPLATE_TYPES.find(t => t.id === template.template_type) || TEMPLATE_TYPES[0];
            return (
              <div
                key={template.id}
                className={`et-card ${!template.is_active ? 'inactive' : ''}`}
                onClick={() => openEditor(template)}
              >
                <div className="et-card-accent" style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` }} />
                <div className="et-card-body">
                  <div className="et-card-top">
                    <span className="et-card-cat" style={{ background: `${cat.color}12`, color: cat.color, borderColor: `${cat.color}30` }}>
                      {cat.icon} {cat.label}
                    </span>
                    <div className="et-card-badges">
                      {!!template.is_default && <span className="et-badge-default">Default</span>}
                      <span className={`et-badge-status ${template.is_active ? 'on' : 'off'}`}>
                        <span className="et-badge-dot" />
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <h3 className="et-card-name">{template.name}</h3>
                  <p className="et-card-subject">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {template.subject}
                  </p>

                  <div className="et-card-preview-frame">
                    <div className="et-card-preview-dots">
                      <span /><span /><span />
                    </div>
                    <div className="et-card-preview-text">
                      {stripHtml(template.body || '').substring(0, 100)}
                    </div>
                  </div>

                  <div className="et-card-footer-row">
                    <span className="et-card-channel">{typeInfo.icon} {typeInfo.label}</span>
                    {template.usage_count > 0 && (
                      <span className="et-card-usage">Sent {template.usage_count}×</span>
                    )}
                  </div>
                </div>

                <div className="et-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="et-act" onClick={() => { setSelectedTemplate(template); setShowPreview(true); setShowEditor(false); }} title="Preview">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button className="et-act" onClick={() => openEditor(template)} title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="et-act" onClick={() => handleDuplicate(template)} title="Duplicate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button className="et-act" onClick={() => handleToggle(template)} title={template.is_active ? 'Deactivate' : 'Activate'}>
                    {template.is_active ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                    )}
                  </button>
                  {!template.is_default && (
                    <button className="et-act danger" onClick={() => setShowDeleteConfirm(template)} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="et-add-card" onClick={() => openEditor()}>
            <div className="et-add-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span className="et-add-label">New Template</span>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="et-list">
          <div className="et-list-header">
            <span className="et-lh-name">Template</span>
            <span className="et-lh-cat">Category</span>
            <span className="et-lh-ch">Channel</span>
            <span className="et-lh-status">Status</span>
            <span className="et-lh-actions">Actions</span>
          </div>
          {filteredTemplates.map(template => {
            const cat = getCat(template.category);
            const typeInfo = TEMPLATE_TYPES.find(t => t.id === template.template_type) || TEMPLATE_TYPES[0];
            return (
              <div key={template.id} className={`et-list-row ${!template.is_active ? 'inactive' : ''}`} onClick={() => openEditor(template)}>
                <div className="et-lr-name">
                  <div className="et-lr-dot" style={{ background: cat.color }} />
                  <div>
                    <strong>{template.name}</strong>
                    <span>{template.subject}</span>
                  </div>
                </div>
                <span className="et-lr-cat" style={{ background: `${cat.color}12`, color: cat.color }}>{cat.icon} {cat.label}</span>
                <span className="et-lr-ch">{typeInfo.icon} {typeInfo.label}</span>
                <span className={`et-lr-status ${template.is_active ? 'on' : 'off'}`}>
                  <span className="et-badge-dot" />{template.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="et-lr-actions" onClick={e => e.stopPropagation()}>
                  <button className="et-act-sm" onClick={() => { setSelectedTemplate(template); setShowPreview(true); }} title="Preview">👁️</button>
                  <button className="et-act-sm" onClick={() => handleDuplicate(template)} title="Duplicate">📋</button>
                  <button className="et-act-sm" onClick={() => handleToggle(template)} title="Toggle">{template.is_active ? '⏸' : '▶️'}</button>
                  {!template.is_default && (
                    <button className="et-act-sm danger" onClick={() => setShowDeleteConfirm(template)} title="Delete">🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Editor Modal (Split view) ─── */}
      {showEditor && createPortal(
        <div className="et-modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="et-editor-modal" onClick={e => e.stopPropagation()}>
            {/* Editor Header */}
            <div className="et-editor-header">
              <div className="et-editor-header-left">
                <h3>{selectedTemplate ? '✏️ Edit Template' : '✨ New Template'}</h3>
                <span className="et-editor-subtitle">
                  {selectedTemplate ? `Editing "${selectedTemplate.name}"` : 'Create a custom email template'}
                </span>
              </div>
              <div className="et-editor-tabs">
                <button className={`et-etab ${editorTab === 'edit' ? 'active' : ''}`} onClick={() => setEditorTab('edit')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editor
                </button>
                <button className={`et-etab ${editorTab === 'preview' ? 'active' : ''}`} onClick={() => setEditorTab('preview')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
              </div>
              <button className="et-editor-close" onClick={() => setShowEditor(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Editor Body */}
            <div className="et-editor-body">
              {editorTab === 'edit' ? (
                <div className="et-editor-form">
                  {/* Row 1 */}
                  <div className="et-form-row">
                    <div className="et-field">
                      <label>Template Name <span className="et-req">*</span></label>
                      <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Appointment Confirmation" />
                    </div>
                    <div className="et-field">
                      <label>Category</label>
                      <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
                        {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="et-form-row">
                    <div className="et-field">
                      <label>Channel</label>
                      <div className="et-channel-picker">
                        {TEMPLATE_TYPES.map(t => (
                          <button key={t.id} type="button" className={`et-ch-btn ${form.template_type === t.id ? 'active' : ''}`} onClick={() => setForm(prev => ({ ...prev, template_type: t.id }))}>
                            <span>{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="et-field">
                      <label>Status</label>
                      <div className="et-status-toggle">
                        <label className="et-switch">
                          <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} />
                          <span className="et-switch-track" />
                        </label>
                        <span className={`et-switch-label ${form.is_active ? 'on' : ''}`}>{form.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="et-field full">
                    <label>Subject Line <span className="et-req">*</span></label>
                    <input type="text" value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} placeholder='e.g., Your appointment is confirmed! ✨' />
                  </div>

                  {/* Preview Text */}
                  <div className="et-field full">
                    <label>Preview Text <span className="et-optional">optional</span></label>
                    <input type="text" value={form.preview_text} onChange={e => setForm(prev => ({ ...prev, preview_text: e.target.value }))} placeholder="Short preview shown in email inbox..." />
                  </div>

                  {/* Placeholders */}
                  <div className="et-vars-section">
                    <div className="et-vars-header">
                      <span className="et-vars-title">📎 Dynamic Variables</span>
                      <span className="et-vars-hint">Click to insert at cursor</span>
                    </div>
                    <div className="et-vars-list">
                      {PLACEHOLDERS.map(p => (
                        <button key={p.key} type="button" className="et-var-chip" onClick={() => insertPlaceholder(p.key)} title={`Insert ${p.label}`}>
                          <span className="et-var-icon">{p.icon}</span>
                          <span className="et-var-name">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Editor */}
                  <div className="et-field full">
                    <label>Email Body <span className="et-req">*</span> <span className="et-optional">Supports HTML</span></label>
                    <textarea
                      ref={bodyRef}
                      value={form.body}
                      onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                      rows={14}
                      placeholder="Write your email content here. Use HTML for rich formatting..."
                      className="et-body-editor"
                    />
                  </div>
                </div>
              ) : (
                /* Preview Tab */
                <div className="et-preview-pane">
                  <div className="et-preview-device">
                    <div className="et-preview-toolbar">
                      <div className="et-preview-dots"><span /><span /><span /></div>
                      <div className="et-preview-url">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        mail.yourbusiness.com
                      </div>
                    </div>
                    <div className="et-preview-email">
                      <div className="et-preview-meta">
                        <div className="et-preview-meta-row">
                          <span className="et-preview-meta-k">From</span>
                          <span>Your Business &lt;noreply@yourbusiness.com&gt;</span>
                        </div>
                        <div className="et-preview-meta-row">
                          <span className="et-preview-meta-k">To</span>
                          <span>sarah.johnson@email.com</span>
                        </div>
                        <div className="et-preview-meta-row">
                          <span className="et-preview-meta-k">Subject</span>
                          <strong>{renderPreview(form.subject) || '(No subject)'}</strong>
                        </div>
                      </div>
                      <div className="et-preview-body" dangerouslySetInnerHTML={{ __html: renderPreview(form.body) || '<p style="color:#98a2b3;text-align:center;padding:40px">Start typing to see your preview...</p>' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="et-editor-footer">
              <button className="et-btn-ghost" onClick={() => setShowEditor(false)}>Cancel</button>
              <div className="et-editor-footer-right">
                {editorTab === 'edit' && form.body && (
                  <button className="et-btn-outline" onClick={() => setEditorTab('preview')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview
                  </button>
                )}
                <button className="et-btn-accent" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><span className="et-btn-spinner" /> Saving...</>
                  ) : (
                    <>{selectedTemplate ? '✓ Update Template' : '✓ Create Template'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Preview Modal ─── */}
      {showPreview && selectedTemplate && createPortal(
        <div className="et-modal-overlay" onClick={() => { setShowPreview(false); setSelectedTemplate(null); }}>
          <div className="et-editor-modal et-preview-modal-size" onClick={e => e.stopPropagation()}>
            <div className="et-editor-header">
              <div className="et-editor-header-left">
                <h3>📧 Preview: {selectedTemplate.name}</h3>
                <span className="et-editor-subtitle">{getCat(selectedTemplate.category).icon} {getCat(selectedTemplate.category).label}</span>
              </div>
              <button className="et-editor-close" onClick={() => { setShowPreview(false); setSelectedTemplate(null); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="et-editor-body">
              <div className="et-preview-pane">
                <div className="et-preview-device">
                  <div className="et-preview-toolbar">
                    <div className="et-preview-dots"><span /><span /><span /></div>
                    <div className="et-preview-url">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Inbox
                    </div>
                  </div>
                  <div className="et-preview-email">
                    <div className="et-preview-meta">
                      <div className="et-preview-meta-row">
                        <span className="et-preview-meta-k">From</span>
                        <span>Your Business &lt;noreply@yourbusiness.com&gt;</span>
                      </div>
                      <div className="et-preview-meta-row">
                        <span className="et-preview-meta-k">Subject</span>
                        <strong>{renderPreview(selectedTemplate.subject)}</strong>
                      </div>
                    </div>
                    <div className="et-preview-body" dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate.body) }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="et-editor-footer">
              <button className="et-btn-ghost" onClick={() => { setShowPreview(false); setSelectedTemplate(null); }}>Close</button>
              <button className="et-btn-accent" onClick={() => { setShowPreview(false); openEditor(selectedTemplate); }}>
                ✏️ Edit Template
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ─── Delete Confirmation ─── */}
      {showDeleteConfirm && createPortal(
        <div className="et-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="et-delete-dialog" onClick={e => e.stopPropagation()}>
            <div className="et-delete-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3>Delete Template?</h3>
            <p>Are you sure you want to delete &ldquo;{showDeleteConfirm.name}&rdquo;? This action cannot be undone.</p>
            <div className="et-delete-actions">
              <button className="et-btn-ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="et-btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>Delete Template</button>
            </div>
          </div>
        </div>, document.body
      )}

      <style>{CSS}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CSS – Premium Email Templates Manager Design
═══════════════════════════════════════════════════════ */
const CSS = `
.et-page { padding: 0 0 40px; }

/* ─── Hero ─── */
.et-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
}
.et-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}
.et-hero-bg::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -40px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(242,66,27,0.18) 0%, transparent 70%);
}
.et-hero-bg::after {
  content: '';
  position: absolute;
  bottom: -50px;
  left: 10%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(46,144,250,0.1) 0%, transparent 70%);
}
.et-hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  gap: 16px;
}
.et-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.et-hero-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.et-hero-icon { font-size: 24px; }
.et-hero-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.et-hero-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  margin: 2px 0 0;
}
.et-hero-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ─── Buttons ─── */
.et-btn-accent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #f2421b, #ff6b4a);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(242,66,27,0.25);
  font-family: inherit;
}
.et-btn-accent:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(242,66,27,0.35); }
.et-btn-accent:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.et-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
  font-family: inherit;
}
.et-btn-ghost:hover { background: rgba(255,255,255,0.14); color: #fff; }
.et-editor-footer .et-btn-ghost {
  background: #fff;
  color: #344054;
  border: 1px solid #d0d5dd;
  backdrop-filter: none;
}
.et-editor-footer .et-btn-ghost:hover { border-color: #98a2b3; }
.et-delete-actions .et-btn-ghost {
  background: #fff;
  color: #344054;
  border: 1px solid #d0d5dd;
  backdrop-filter: none;
}
.et-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #344054;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.et-btn-outline:hover { border-color: #98a2b3; }
.et-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.et-btn-danger:hover { background: #b91c1c; }
.et-btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: etspin 0.6s linear infinite;
}

/* ─── Stats Strip ─── */
.et-stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.et-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 12px;
  transition: all 0.2s;
}
.et-stat-card:hover {
  border-color: #d0d5dd;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}
.et-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.et-stat-info {
  display: flex;
  flex-direction: column;
}
.et-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #101828;
  line-height: 1.1;
}
.et-stat-label {
  font-size: 11px;
  color: #667085;
  font-weight: 500;
}

/* ─── Toolbar ─── */
.et-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.et-toolbar-left { flex: 1; min-width: 0; }
.et-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Categories */
.et-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.et-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  color: #667085;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: inherit;
}
.et-cat-pill:hover { border-color: #d0d5dd; background: #f9fafb; }
.et-cat-pill.active {
  background: var(--cat-color, #101828);
  color: #fff;
  border-color: var(--cat-color, #101828);
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.et-cat-icon { font-size: 12px; }
.et-cat-count {
  font-size: 9px;
  font-weight: 700;
  background: rgba(0,0,0,0.06);
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}
.et-cat-pill.active .et-cat-count { background: rgba(255,255,255,0.25); }

/* Search */
.et-search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  min-width: 180px;
  transition: all 0.2s;
  color: #98a2b3;
}
.et-search-bar:focus-within { border-color: #2e90fa; box-shadow: 0 0 0 3px rgba(46,144,250,0.08); }
.et-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  color: #101828;
  background: transparent;
  font-family: inherit;
  min-width: 80px;
}
.et-search-input::placeholder { color: #98a2b3; }
.et-search-clear {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #f2f4f7;
  color: #667085;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.et-search-clear:hover { background: #fee2e2; color: #dc2626; }

/* View toggle */
.et-view-toggle {
  display: flex;
  background: #f2f4f7;
  border-radius: 8px;
  padding: 2px;
}
.et-vt-btn {
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #98a2b3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.et-vt-btn:hover { color: #667085; }
.et-vt-btn.active {
  background: #fff;
  color: #101828;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* ─── Grid View ─── */
.et-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}
.et-card {
  position: relative;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}
.et-card:hover {
  border-color: #d0d5dd;
  box-shadow: 0 8px 28px rgba(0,0,0,0.08);
  transform: translateY(-3px);
}
.et-card.inactive { opacity: 0.55; }
.et-card.inactive:hover { opacity: 0.8; }
.et-card-accent { height: 4px; width: 100%; }
.et-card-body {
  padding: 16px 18px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.et-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.et-card-cat {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  border: 1px solid;
}
.et-card-badges {
  display: flex;
  align-items: center;
  gap: 4px;
}
.et-badge-default {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: #eff8ff;
  color: #2e90fa;
  border: 1px solid #bfdbfe;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.et-badge-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}
.et-badge-status.on { background: #ecfdf5; color: #059669; }
.et-badge-status.off { background: #f3f4f6; color: #9ca3af; }
.et-badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.et-card-name {
  font-size: 15px;
  font-weight: 700;
  color: #101828;
  margin: 0;
  line-height: 1.2;
}
.et-card-subject {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #475569;
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.et-card-subject svg { flex-shrink: 0; color: #94a3b8; }

/* Preview frame inside card */
.et-card-preview-frame {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.et-card-preview-dots {
  display: flex;
  gap: 4px;
  padding: 6px 10px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}
.et-card-preview-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.et-card-preview-dots span:nth-child(1) { background: #ef4444; }
.et-card-preview-dots span:nth-child(2) { background: #f59e0b; }
.et-card-preview-dots span:nth-child(3) { background: #10b981; }
.et-card-preview-text {
  padding: 10px 12px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
  max-height: 52px;
  overflow: hidden;
}

.et-card-footer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}
.et-card-channel {
  font-size: 10px;
  color: #98a2b3;
  font-weight: 500;
}
.et-card-usage {
  font-size: 10px;
  color: #98a2b3;
  margin-left: auto;
}

/* Card Actions */
.et-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1px;
  padding: 6px 10px;
  border-top: 1px solid #f2f4f7;
  background: #fafbfc;
}
.et-act {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #667085;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.et-act:hover { background: #f2f4f7; color: #344054; }
.et-act.danger:hover { background: #fef3f2; color: #dc2626; }

/* Add card */
.et-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 280px;
  border: 2px dashed #d0d5dd;
  border-radius: 14px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
  color: #98a2b3;
}
.et-add-card:hover {
  border-color: #f2421b;
  color: #f2421b;
  background: #fff5f3;
}
.et-add-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.et-add-card:hover .et-add-icon-wrap {
  background: #fef2f0;
  transform: scale(1.1);
}
.et-add-label { font-size: 13px; font-weight: 500; }

/* ─── List View ─── */
.et-list {
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 12px;
  overflow: hidden;
}
.et-list-header {
  display: grid;
  grid-template-columns: 1fr 120px 90px 90px 140px;
  padding: 10px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #eaecf0;
  font-size: 11px;
  font-weight: 600;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.et-list-row {
  display: grid;
  grid-template-columns: 1fr 120px 90px 90px 140px;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f2f4f7;
  cursor: pointer;
  transition: background 0.1s;
}
.et-list-row:last-child { border-bottom: none; }
.et-list-row:hover { background: #f9fafb; }
.et-list-row.inactive { opacity: 0.5; }
.et-lr-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.et-lr-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.et-lr-name div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.et-lr-name strong {
  font-size: 13px;
  font-weight: 600;
  color: #101828;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.et-lr-name span {
  font-size: 11px;
  color: #667085;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.et-lr-cat {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  text-align: center;
}
.et-lr-ch { font-size: 12px; color: #667085; }
.et-lr-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
}
.et-lr-status.on { color: #059669; }
.et-lr-status.off { color: #9ca3af; }
.et-lr-actions {
  display: flex;
  gap: 2px;
}
.et-act-sm {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
}
.et-act-sm:hover { background: #f2f4f7; }
.et-act-sm.danger:hover { background: #fef3f2; }

/* ─── Empty State ─── */
.et-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 14px;
}
.et-empty-visual {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff5f3, #fef2f0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 16px;
}
.et-empty h3 { font-size: 17px; font-weight: 600; color: #101828; margin: 0 0 6px; }
.et-empty p { font-size: 13px; color: #667085; margin: 0 0 20px; max-width: 300px; }

/* ─── Loading ─── */
.et-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: #667085;
  font-size: 13px;
}
.et-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #eaecf0;
  border-top-color: #f2421b;
  border-radius: 50%;
  animation: etspin 0.6s linear infinite;
}
@keyframes etspin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════
   EDITOR MODAL
═══════════════════════════════════════════════════════ */
.et-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 30px 20px;
  overflow-y: auto;
}
.et-editor-modal {
  width: 100%;
  max-width: 800px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2);
  overflow: hidden;
  animation: etSlideIn 0.25s ease-out;
}
.et-preview-modal-size { max-width: 680px; }
@keyframes etSlideIn {
  from { opacity: 0; transform: translateY(-16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Editor Header */
.et-editor-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #fff;
  gap: 16px;
}
.et-editor-header-left { flex: 1; min-width: 0; }
.et-editor-header h3 { font-size: 15px; font-weight: 700; margin: 0; color: #fff; }
.et-editor-subtitle { font-size: 11px; color: rgba(255,255,255,0.5); display: block; margin-top: 1px; }
.et-editor-tabs {
  display: flex;
  gap: 2px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 2px;
}
.et-etab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.et-etab:hover { color: rgba(255,255,255,0.85); }
.et-etab.active {
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-weight: 600;
}
.et-editor-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.et-editor-close:hover { background: rgba(255,255,255,0.2); }

/* Editor Body */
.et-editor-body {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}
.et-editor-form { padding: 24px; }
.et-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.et-field { display: flex; flex-direction: column; gap: 5px; }
.et-field.full { margin-bottom: 16px; }
.et-field label {
  font-size: 12px;
  font-weight: 600;
  color: #344054;
  display: flex;
  align-items: center;
  gap: 4px;
}
.et-req { color: #ef4444; }
.et-optional { font-weight: 400; color: #98a2b3; font-size: 10px; }
.et-field input, .et-field select {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  color: #101828;
  background: #fff;
  outline: none;
  transition: all 0.15s;
  width: 100%;
  font-family: inherit;
}
.et-field input:focus, .et-field select:focus {
  border-color: #2e90fa;
  box-shadow: 0 0 0 3px rgba(46,144,250,0.08);
}

/* Channel picker */
.et-channel-picker {
  display: flex;
  gap: 4px;
  background: #f2f4f7;
  border-radius: 8px;
  padding: 3px;
}
.et-ch-btn {
  flex: 1;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #667085;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: inherit;
}
.et-ch-btn:hover { color: #344054; }
.et-ch-btn.active {
  background: #fff;
  color: #101828;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Status toggle */
.et-status-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
}
.et-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}
.et-switch input { display: none; }
.et-switch-track {
  position: absolute;
  inset: 0;
  background: #d0d5dd;
  border-radius: 22px;
  transition: background 0.2s;
}
.et-switch-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}
.et-switch input:checked + .et-switch-track { background: #059669; }
.et-switch input:checked + .et-switch-track::after { transform: translateX(20px); }
.et-switch-label { font-size: 13px; font-weight: 500; color: #9ca3af; }
.et-switch-label.on { color: #059669; }

/* Variables section */
.et-vars-section {
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.et-vars-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.et-vars-title { font-size: 12px; font-weight: 600; color: #475569; }
.et-vars-hint { font-size: 10px; color: #94a3b8; }
.et-vars-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 12px;
}
.et-var-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.et-var-chip:hover { border-color: #2e90fa; background: #eff8ff; color: #1e40af; }
.et-var-icon { font-size: 12px; }
.et-var-name { font-weight: 500; }

/* Body editor */
.et-body-editor {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
  color: #101828;
  background: #fff;
  outline: none;
  transition: all 0.15s;
  width: 100%;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
}
.et-body-editor:focus {
  border-color: #2e90fa;
  box-shadow: 0 0 0 3px rgba(46,144,250,0.08);
}

/* ─── Preview Pane ─── */
.et-preview-pane { padding: 24px; }
.et-preview-device {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.et-preview-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: linear-gradient(180deg, #f8f9fb, #f1f3f5);
  border-bottom: 1px solid #e5e7eb;
}
.et-preview-dots { display: flex; gap: 5px; }
.et-preview-dots span { width: 10px; height: 10px; border-radius: 50%; }
.et-preview-dots span:nth-child(1) { background: #ef4444; }
.et-preview-dots span:nth-child(2) { background: #f59e0b; }
.et-preview-dots span:nth-child(3) { background: #10b981; }
.et-preview-url {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #667085;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 12px;
  flex: 1;
}
.et-preview-email { background: #fff; }
.et-preview-meta {
  padding: 14px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #f2f4f7;
}
.et-preview-meta-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 4px;
  align-items: center;
}
.et-preview-meta-row:last-child { margin-bottom: 0; }
.et-preview-meta-k {
  color: #94a3b8;
  font-weight: 600;
  min-width: 55px;
  font-size: 11px;
  text-transform: uppercase;
}
.et-preview-body {
  padding: 24px;
  font-size: 14px;
  line-height: 1.7;
  min-height: 250px;
  color: #1e293b;
}

/* Editor Footer */
.et-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid #f2f4f7;
  background: #fafbfc;
}
.et-editor-footer-right { display: flex; gap: 8px; }

/* ─── Delete Dialog ─── */
.et-delete-dialog {
  background: #fff;
  border-radius: 18px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2);
  animation: etSlideIn 0.2s ease-out;
  margin: auto;
}
.et-delete-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fef3f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.et-delete-dialog h3 { font-size: 17px; font-weight: 700; color: #101828; margin: 0 0 8px; }
.et-delete-dialog p { font-size: 13px; color: #667085; margin: 0 0 24px; line-height: 1.5; }
.et-delete-actions { display: flex; gap: 8px; justify-content: center; }

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .et-hero-content { flex-direction: column; align-items: flex-start; }
  .et-hero-actions { width: 100%; }
  .et-stats-strip { grid-template-columns: repeat(2, 1fr); }
  .et-toolbar { flex-direction: column; }
  .et-toolbar-right { width: 100%; }
  .et-categories { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
  .et-grid { grid-template-columns: 1fr; }
  .et-form-row { grid-template-columns: 1fr; }
  .et-editor-modal { margin: 10px; max-width: none; border-radius: 14px; }
  .et-editor-body { padding: 16px; }
  .et-editor-header { flex-wrap: wrap; }
  .et-editor-tabs { width: 100%; }
  .et-list-header { display: none; }
  .et-list-row { grid-template-columns: 1fr auto; gap: 8px; }
  .et-lr-cat, .et-lr-ch, .et-lr-status { display: none; }
}
`;
