import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import {
  Megaphone, Mail, SendDiagonal, Search, Plus, Eye, Copy, Trash,
  Settings, RefreshDouble, Play, Pause, Check, CheckCircle, Group,
  User, Calendar, Heart, Star, CreditCard, Clock, Filter,
  Rocket, CandlestickChart, StatUp, GraphUp, NavArrowRight,
  ChatBubble, Phone, ShareAndroid, BellNotification, EditPencil,
  Xmark, Archive, Download
} from 'iconoir-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import SEO from '../components/SEO';
import './MarketingHub.css';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const CAMPAIGN_TYPE_ICONS = {
  email: Mail,
  sms: Phone,
  whatsapp: ChatBubble,
  social: ShareAndroid,
  push: BellNotification,
  other: Megaphone,
};

const CAMPAIGN_TYPE_COLORS = {
  email: { bg: '#eff6ff', color: '#3b82f6' },
  sms: { bg: '#ecfdf5', color: '#10b981' },
  whatsapp: { bg: '#f0fdf4', color: '#22c55e' },
  social: { bg: '#fce7f3', color: '#ec4899' },
  push: { bg: '#f5f3ff', color: '#8b5cf6' },
  other: { bg: '#fff3ed', color: '#f2421b' },
};

const SEGMENT_ICONS = {
  all_clients: Group,
  new_clients: Plus,
  vip_clients: Star,
  inactive_clients: Clock,
  birthday_month: Heart,
  service_based: Settings,
  spend_based: CreditCard,
  membership: User,
  loyalty_tier: Star,
  custom: Filter,
};

const SEGMENT_COLORS = {
  all_clients: { bg: '#eff6ff', color: '#3b82f6' },
  new_clients: { bg: '#ecfdf5', color: '#10b981' },
  vip_clients: { bg: '#fef3c7', color: '#f59e0b' },
  inactive_clients: { bg: '#fef2f2', color: '#ef4444' },
  birthday_month: { bg: '#fce7f3', color: '#ec4899' },
  service_based: { bg: '#f5f3ff', color: '#8b5cf6' },
  spend_based: { bg: '#fff3ed', color: '#f2421b' },
  membership: { bg: '#eff6ff', color: '#6366f1' },
  loyalty_tier: { bg: '#fef3c7', color: '#f59e0b' },
  custom: { bg: '#f3f4f6', color: '#6b7280' },
};

const TRIGGER_ICONS = {
  appointment_completed: CheckCircle,
  birthday: Heart,
  no_visit_30d: Clock,
  no_visit_60d: Clock,
  no_visit_90d: Clock,
  new_client: User,
  membership_expiring: CreditCard,
  package_expiring: Archive,
  review_request: Star,
  welcome: Rocket,
  custom: Settings,
};

const TRIGGER_COLORS = {
  appointment_completed: { bg: '#ecfdf5', color: '#10b981' },
  birthday: { bg: '#fce7f3', color: '#ec4899' },
  no_visit_30d: { bg: '#fef3c7', color: '#f59e0b' },
  no_visit_60d: { bg: '#fff3ed', color: '#f2421b' },
  no_visit_90d: { bg: '#fef2f2', color: '#ef4444' },
  new_client: { bg: '#eff6ff', color: '#3b82f6' },
  membership_expiring: { bg: '#f5f3ff', color: '#8b5cf6' },
  package_expiring: { bg: '#eff6ff', color: '#6366f1' },
  review_request: { bg: '#fef3c7', color: '#f59e0b' },
  welcome: { bg: '#ecfdf5', color: '#10b981' },
  custom: { bg: '#f3f4f6', color: '#6b7280' },
};

const TABS = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'audiences', label: 'Audiences', icon: Group },
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'automations', label: 'Automations', icon: Rocket },
];

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function MarketingHub() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [loading, setLoading] = useState(true);

  // Data
  const [campaigns, setCampaigns] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);

  // Stats
  const [campaignStats, setCampaignStats] = useState({});
  const [audienceStats, setAudienceStats] = useState({});
  const [templateStats, setTemplateStats] = useState({});
  const [automationStats, setAutomationStats] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('');
  const [audienceSegmentFilter, setAudienceSegmentFilter] = useState('');

  // Modals
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  // Form data
  const [campaignForm, setCampaignForm] = useState({ name: '', type: 'email', campaign_type: 'promotional', subject: '', content: '', description: '', audience_id: '', template_id: '' });
  const [audienceForm, setAudienceForm] = useState({ name: '', description: '', type: 'static', segment_type: 'custom' });
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', category: 'general', template_type: 'email' });
  const [automationForm, setAutomationForm] = useState({ name: '', description: '', trigger_type: 'new_client', action_type: 'send_email', delay_minutes: 0, is_active: true });
  const [editingId, setEditingId] = useState(null);

  // ─── FETCHERS ────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, aRes, tRes, csRes, asRes, tsRes] = await Promise.allSettled([
        api.get('/campaigns'),
        api.get('/audiences'),
        api.get('/email-templates'),
        api.get('/campaigns/stats'),
        api.get('/audiences/stats'),
        api.get('/email-templates/stats'),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value?.success) setCampaigns(cRes.value.data || []);
      if (aRes.status === 'fulfilled' && aRes.value?.success) setAudiences(aRes.value.data || []);
      if (tRes.status === 'fulfilled' && tRes.value?.success) setTemplates(tRes.value.data || []);
      if (csRes.status === 'fulfilled' && csRes.value?.success) setCampaignStats(csRes.value.data || {});
      if (asRes.status === 'fulfilled' && asRes.value?.success) setAudienceStats(asRes.value.data || {});
      if (tsRes.status === 'fulfilled' && tsRes.value?.success) setTemplateStats(tsRes.value.data || {});

      // Fetch automations
      try {
        const autoRes = await api.get('/campaigns/automations/list');
        if (autoRes?.success) setAutomations(autoRes.data || []);
        const autoStatsRes = await api.get('/campaigns/automations/stats');
        if (autoStatsRes?.success) setAutomationStats(autoStatsRes.data || {});
      } catch (e) { /* automations optional */ }
    } catch (error) {
      console.error('Marketing Hub fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── CAMPAIGNS CRUD ──────────────────────────────
  const handleSaveCampaign = async () => {
    if (!campaignForm.name) return Swal.fire('Error', 'Campaign name is required', 'error');
    try {
      if (editingId) {
        await api.patch(`/campaigns/${editingId}`, campaignForm);
        Swal.fire({ icon: 'success', title: 'Campaign Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/campaigns', campaignForm);
        Swal.fire({ icon: 'success', title: 'Campaign Created!', timer: 1500, showConfirmButton: false });
      }
      setShowCampaignModal(false);
      resetCampaignForm();
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to save campaign', 'error');
    }
  };

  const handleSendCampaign = async (id) => {
    const result = await Swal.fire({
      title: 'Send Campaign?',
      text: 'This will send the campaign to all targeted audience members.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'Send Now',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.post(`/campaigns/${id}/send`);
      Swal.fire({ icon: 'success', title: 'Campaign Sent!', text: `Sent to ${res.data?.recipients || 0} recipients`, timer: 2500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to send campaign', 'error');
    }
  };

  const handlePauseCampaign = async (id) => {
    try {
      await api.post(`/campaigns/${id}/pause`);
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to update campaign', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Campaign?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/campaigns/${id}`);
      Swal.fire({ icon: 'success', title: 'Campaign Deleted', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to delete campaign', 'error');
    }
  };

  const editCampaign = (c) => {
    setCampaignForm({
      name: c.name || '',
      type: c.type || 'email',
      campaign_type: c.campaign_type || 'promotional',
      subject: c.subject || '',
      content: c.content || '',
      description: c.description || '',
      audience_id: c.audience_id || '',
      template_id: c.template_id || '',
    });
    setEditingId(c.id);
    setShowCampaignModal(true);
  };

  const resetCampaignForm = () => {
    setCampaignForm({ name: '', type: 'email', campaign_type: 'promotional', subject: '', content: '', description: '', audience_id: '', template_id: '' });
    setEditingId(null);
  };

  // ─── AUDIENCES CRUD ──────────────────────────────
  const handleSaveAudience = async () => {
    if (!audienceForm.name) return Swal.fire('Error', 'Audience name is required', 'error');
    try {
      if (editingId) {
        await api.patch(`/audiences/${editingId}`, audienceForm);
        Swal.fire({ icon: 'success', title: 'Audience Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/audiences', audienceForm);
        Swal.fire({ icon: 'success', title: 'Audience Created!', timer: 1500, showConfirmButton: false });
      }
      setShowAudienceModal(false);
      resetAudienceForm();
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to save audience', 'error');
    }
  };

  const handleSyncAudience = async (id) => {
    try {
      const res = await api.post(`/audiences/${id}/sync`);
      Swal.fire({ icon: 'success', title: 'Audience Synced!', text: `${res.data?.synced || 0} members found`, timer: 2000, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to sync audience', 'error');
    }
  };

  const handleDeleteAudience = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Audience?',
      text: 'This will remove all members from this audience.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/audiences/${id}`);
      Swal.fire({ icon: 'success', title: 'Audience Deleted', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to delete audience', 'error');
    }
  };

  const editAudience = (a) => {
    setAudienceForm({
      name: a.name || '',
      description: a.description || '',
      type: a.type || 'static',
      segment_type: a.segment_type || 'custom',
    });
    setEditingId(a.id);
    setShowAudienceModal(true);
  };

  const resetAudienceForm = () => {
    setAudienceForm({ name: '', description: '', type: 'static', segment_type: 'custom' });
    setEditingId(null);
  };

  // ─── TEMPLATES CRUD ──────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      return Swal.fire('Error', 'Name, subject, and body are required', 'error');
    }
    try {
      if (editingId) {
        await api.patch(`/email-templates/${editingId}`, templateForm);
        Swal.fire({ icon: 'success', title: 'Template Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/email-templates', templateForm);
        Swal.fire({ icon: 'success', title: 'Template Created!', timer: 1500, showConfirmButton: false });
      }
      setShowTemplateModal(false);
      resetTemplateForm();
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to save template', 'error');
    }
  };

  const handleDuplicateTemplate = async (id) => {
    try {
      await api.post(`/email-templates/${id}/duplicate`);
      Swal.fire({ icon: 'success', title: 'Template Duplicated!', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to duplicate template', 'error');
    }
  };

  const handlePreviewTemplate = async (id) => {
    try {
      const res = await api.post(`/email-templates/${id}/preview`);
      if (res?.success) {
        setPreviewContent(res.data);
        setShowPreviewModal(true);
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to preview template', 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Template?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/email-templates/${id}`);
      Swal.fire({ icon: 'success', title: 'Template Deleted', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', error?.message || 'Failed to delete template', 'error');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await api.post('/email-templates/seed-defaults');
      Swal.fire({ icon: 'success', title: 'Default Templates Loaded!', text: res.message, timer: 2000, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to seed templates', 'error');
    }
  };

  const editTemplate = (t) => {
    setTemplateForm({
      name: t.name || '',
      subject: t.subject || '',
      body: t.body || '',
      category: t.category || 'general',
      template_type: t.template_type || 'email',
    });
    setEditingId(t.id);
    setShowTemplateModal(true);
  };

  const resetTemplateForm = () => {
    setTemplateForm({ name: '', subject: '', body: '', category: 'general', template_type: 'email' });
    setEditingId(null);
  };

  // ─── AUTOMATIONS CRUD ────────────────────────────
  const handleSaveAutomation = async () => {
    if (!automationForm.name || !automationForm.trigger_type) {
      return Swal.fire('Error', 'Name and trigger type are required', 'error');
    }
    try {
      if (editingId) {
        await api.patch(`/campaigns/automations/${editingId}`, automationForm);
        Swal.fire({ icon: 'success', title: 'Automation Updated!', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/campaigns/automations', automationForm);
        Swal.fire({ icon: 'success', title: 'Automation Created!', timer: 1500, showConfirmButton: false });
      }
      setShowAutomationModal(false);
      resetAutomationForm();
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to save automation', 'error');
    }
  };

  const handleToggleAutomation = async (id) => {
    try {
      await api.post(`/campaigns/automations/${id}/toggle`);
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to toggle automation', 'error');
    }
  };

  const handleDeleteAutomation = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Automation?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/campaigns/automations/${id}`);
      Swal.fire({ icon: 'success', title: 'Automation Deleted', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (error) {
      Swal.fire('Error', 'Failed to delete automation', 'error');
    }
  };

  const editAutomation = (a) => {
    setAutomationForm({
      name: a.name || '',
      description: a.description || '',
      trigger_type: a.trigger_type || 'new_client',
      action_type: a.action_type || 'send_email',
      delay_minutes: a.delay_minutes || 0,
      is_active: a.is_active ? true : false,
    });
    setEditingId(a.id);
    setShowAutomationModal(true);
  };

  const resetAutomationForm = () => {
    setAutomationForm({ name: '', description: '', trigger_type: 'new_client', action_type: 'send_email', delay_minutes: 0, is_active: true });
    setEditingId(null);
  };

  // ─── FILTERED DATA ──────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (searchTerm && !c.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (campaignTypeFilter && c.type !== campaignTypeFilter) return false;
      if (campaignStatusFilter && c.status !== campaignStatusFilter) return false;
      return true;
    });
  }, [campaigns, searchTerm, campaignTypeFilter, campaignStatusFilter]);

  const filteredAudiences = useMemo(() => {
    return audiences.filter(a => {
      if (searchTerm && !a.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (audienceSegmentFilter && a.segment_type !== audienceSegmentFilter) return false;
      return true;
    });
  }, [audiences, searchTerm, audienceSegmentFilter]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (searchTerm && !t.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.subject?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (templateCategoryFilter && t.category !== templateCategoryFilter) return false;
      return true;
    });
  }, [templates, searchTerm, templateCategoryFilter]);

  // ─── RENDER ──────────────────────────────────────
  if (loading) {
    return (
      <div className="marketing-hub">
        <SEO title="Marketing Hub" />
        <div className="mh-loading">
          <div className="mh-spinner" />
          <div className="mh-loading-text">Loading Marketing Hub...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketing-hub">
      <SEO title="Marketing Hub" />

      {/* ─── HEADER ──────────────────────────────── */}
      <div className="mh-header">
        <div className="mh-header-content">
          <div>
            <h1>Marketing Hub 🚀</h1>
            <p>Create campaigns, build audiences, and grow your beauty business</p>
          </div>
          <div className="mh-header-actions">
            <button className="mh-btn mh-btn-outline" onClick={fetchAll}>
              <RefreshDouble width={16} height={16} /> Refresh
            </button>
            <button className="mh-btn mh-btn-primary" onClick={() => {
              if (activeTab === 'campaigns') { resetCampaignForm(); setShowCampaignModal(true); }
              else if (activeTab === 'audiences') { resetAudienceForm(); setShowAudienceModal(true); }
              else if (activeTab === 'templates') { resetTemplateForm(); setShowTemplateModal(true); }
              else if (activeTab === 'automations') { resetAutomationForm(); setShowAutomationModal(true); }
            }}>
              <Plus width={16} height={16} /> Create New
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATS ───────────────────────────────── */}
      <div className="mh-stats-grid">
        <div className="mh-stat-card orange">
          <div className="mh-stat-icon orange"><Megaphone width={22} height={22} /></div>
          <div className="mh-stat-value">{campaignStats.total || 0}</div>
          <div className="mh-stat-label">Total Campaigns</div>
        </div>
        <div className="mh-stat-card blue">
          <div className="mh-stat-icon blue"><Group width={22} height={22} /></div>
          <div className="mh-stat-value">{audienceStats.total_members || 0}</div>
          <div className="mh-stat-label">Total Audience Reach</div>
        </div>
        <div className="mh-stat-card green">
          <div className="mh-stat-icon green"><Mail width={22} height={22} /></div>
          <div className="mh-stat-value">{campaignStats.total_sent || 0}</div>
          <div className="mh-stat-label">Messages Sent</div>
        </div>
        <div className="mh-stat-card purple">
          <div className="mh-stat-icon purple"><StatUp width={22} height={22} /></div>
          <div className="mh-stat-value">{campaignStats.avg_open_rate || 0}%</div>
          <div className="mh-stat-label">Avg. Open Rate</div>
        </div>
      </div>

      {/* ─── TABS ────────────────────────────────── */}
      <div className="mh-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          let count = 0;
          if (tab.id === 'campaigns') count = campaigns.length;
          else if (tab.id === 'audiences') count = audiences.length;
          else if (tab.id === 'templates') count = templates.length;
          else if (tab.id === 'automations') count = automations.length;
          return (
            <button
              key={tab.id}
              className={`mh-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            >
              <Icon width={16} height={16} />
              {tab.label}
              {count > 0 && <span className="mh-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ─── CAMPAIGNS TAB ───────────────────────── */}
      {activeTab === 'campaigns' && (
        <div className="mh-panel">
          <div className="mh-toolbar">
            <div className="mh-toolbar-left">
              <div className="mh-search">
                <Search width={16} height={16} />
                <input placeholder="Search campaigns..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="mh-filter-select" value={campaignTypeFilter} onChange={e => setCampaignTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="social">Social</option>
                <option value="push">Push</option>
              </select>
              <select className="mh-filter-select" value={campaignStatusFilter} onChange={e => setCampaignStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="running">Running</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="mh-empty">
              <div className="mh-empty-icon"><Megaphone width={36} height={36} /></div>
              <h3>No Campaigns Yet</h3>
              <p>Create your first marketing campaign to reach your clients via email, SMS, or social media.</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="mh-btn mh-btn-primary" onClick={() => { resetCampaignForm(); setShowCampaignModal(true); }}>
                  <Plus width={16} height={16} /> Create Campaign
                </button>
              </div>
            </div>
          ) : (
            <div className="mh-campaigns-grid">
              {filteredCampaigns.map(c => {
                const TypeIcon = CAMPAIGN_TYPE_ICONS[c.type] || Megaphone;
                const typeColor = CAMPAIGN_TYPE_COLORS[c.type] || CAMPAIGN_TYPE_COLORS.other;
                return (
                  <div className="mh-campaign-card" key={c.id}>
                    <div className="mh-campaign-top">
                      <div className="mh-campaign-icon" style={{ background: typeColor.bg, color: typeColor.color }}>
                        <TypeIcon width={20} height={20} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className={`mh-badge ${c.status}`}>{c.status}</span>
                      </div>
                    </div>
                    <div className="mh-campaign-name">{c.name}</div>
                    <div className="mh-campaign-desc">{c.description || c.subject || 'No description'}</div>
                    <div className="mh-campaign-stats">
                      <div className="mh-campaign-stat">
                        <div className="mh-campaign-stat-val">{c.total_sent || 0}</div>
                        <div className="mh-campaign-stat-label">Sent</div>
                      </div>
                      <div className="mh-campaign-stat">
                        <div className="mh-campaign-stat-val">{c.total_opened || 0}</div>
                        <div className="mh-campaign-stat-label">Opened</div>
                      </div>
                      <div className="mh-campaign-stat">
                        <div className="mh-campaign-stat-val">{c.total_clicked || 0}</div>
                        <div className="mh-campaign-stat-label">Clicked</div>
                      </div>
                      <div className="mh-campaign-stat">
                        <div className="mh-campaign-stat-val">{c.total_converted || 0}</div>
                        <div className="mh-campaign-stat-label">Converted</div>
                      </div>
                    </div>
                    <div className="mh-campaign-meta">
                      <span className={`mh-badge ${c.type}`}>{c.type}</span>
                      <span className="mh-campaign-date">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        {c.status === 'draft' && (
                          <button className="mh-btn mh-btn-sm mh-btn-primary" onClick={(e) => { e.stopPropagation(); handleSendCampaign(c.id); }}>
                            <Play width={12} height={12} /> Send
                          </button>
                        )}
                        {c.status === 'running' && (
                          <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={(e) => { e.stopPropagation(); handlePauseCampaign(c.id); }}>
                            <Pause width={12} height={12} />
                          </button>
                        )}
                        <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={(e) => { e.stopPropagation(); editCampaign(c); }}>
                          <EditPencil width={12} height={12} />
                        </button>
                        <button className="mh-btn mh-btn-sm mh-btn-ghost" style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c.id); }}>
                          <Trash width={12} height={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── AUDIENCES TAB ───────────────────────── */}
      {activeTab === 'audiences' && (
        <div className="mh-panel">
          <div className="mh-toolbar">
            <div className="mh-toolbar-left">
              <div className="mh-search">
                <Search width={16} height={16} />
                <input placeholder="Search audiences..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="mh-filter-select" value={audienceSegmentFilter} onChange={e => setAudienceSegmentFilter(e.target.value)}>
                <option value="">All Segments</option>
                <option value="all_clients">All Clients</option>
                <option value="new_clients">New Clients</option>
                <option value="vip_clients">VIP Clients</option>
                <option value="inactive_clients">Inactive</option>
                <option value="birthday_month">Birthday Month</option>
                <option value="service_based">Service Based</option>
                <option value="spend_based">Spend Based</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {filteredAudiences.length === 0 ? (
            <div className="mh-empty">
              <div className="mh-empty-icon"><Group width={36} height={36} /></div>
              <h3>No Audiences Yet</h3>
              <p>Create audience segments to target specific client groups with personalized campaigns.</p>
              <button className="mh-btn mh-btn-primary" onClick={() => { resetAudienceForm(); setShowAudienceModal(true); }}>
                <Plus width={16} height={16} /> Create Audience
              </button>
            </div>
          ) : (
            <div className="mh-audiences-grid">
              {filteredAudiences.map(a => {
                const SegIcon = SEGMENT_ICONS[a.segment_type] || Group;
                const segColor = SEGMENT_COLORS[a.segment_type] || SEGMENT_COLORS.custom;
                return (
                  <div className="mh-audience-card" key={a.id}>
                    <div className="mh-audience-top">
                      <div className="mh-audience-icon" style={{ background: segColor.bg, color: segColor.color }}>
                        <SegIcon width={20} height={20} />
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={() => handleSyncAudience(a.id)} title="Sync">
                          <RefreshDouble width={14} height={14} />
                        </button>
                        <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={() => editAudience(a)}>
                          <EditPencil width={14} height={14} />
                        </button>
                        <button className="mh-btn mh-btn-sm mh-btn-ghost" style={{ color: '#ef4444' }} onClick={() => handleDeleteAudience(a.id)}>
                          <Trash width={14} height={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mh-audience-name">{a.name}</div>
                    <div className="mh-audience-desc">{a.description || 'No description'}</div>
                    <div className="mh-audience-footer">
                      <div className="mh-audience-members">
                        <User width={14} height={14} />
                        {a.member_count || a.active_count || 0} members
                      </div>
                      <span className="mh-audience-type">{(a.segment_type || 'custom').replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TEMPLATES TAB ───────────────────────── */}
      {activeTab === 'templates' && (
        <div className="mh-panel">
          <div className="mh-toolbar">
            <div className="mh-toolbar-left">
              <div className="mh-search">
                <Search width={16} height={16} />
                <input placeholder="Search templates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="mh-filter-select" value={templateCategoryFilter} onChange={e => setTemplateCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                <option value="appointment">Appointment</option>
                <option value="reminder">Reminder</option>
                <option value="welcome">Welcome</option>
                <option value="review">Review</option>
                <option value="birthday">Birthday</option>
                <option value="promotion">Promotion</option>
                <option value="marketing">Marketing</option>
                <option value="membership">Membership</option>
                <option value="general">General</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={handleSeedDefaults}>
                <Download width={14} height={14} /> Load Defaults
              </button>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="mh-empty">
              <div className="mh-empty-icon"><Mail width={36} height={36} /></div>
              <h3>No Templates Yet</h3>
              <p>Create email & SMS templates for your marketing campaigns, reminders, and more.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="mh-btn mh-btn-primary" onClick={() => { resetTemplateForm(); setShowTemplateModal(true); }}>
                  <Plus width={16} height={16} /> Create Template
                </button>
                <button className="mh-btn mh-btn-ghost" onClick={handleSeedDefaults}>
                  <Download width={16} height={16} /> Load Default Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="mh-templates-grid">
              {filteredTemplates.map(t => (
                <div className="mh-template-card" key={t.id}>
                  <div className="mh-template-preview">
                    <div className="mh-template-preview-content" dangerouslySetInnerHTML={{ __html: t.body?.substring(0, 400) || '' }} />
                    <div className="mh-template-preview-overlay" />
                  </div>
                  <div className="mh-template-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div className="mh-template-name">{t.name}</div>
                      {t.is_default ? <span className="mh-default-badge">Default</span> : null}
                    </div>
                    <div className="mh-template-subject">{t.subject}</div>
                    <div className="mh-template-footer">
                      <div className="mh-template-meta">
                        <span className={`mh-badge ${t.category}`}>{t.category}</span>
                        <span className={`mh-badge ${t.template_type}`}>{t.template_type || 'email'}</span>
                      </div>
                      <div className="mh-template-actions">
                        <button title="Preview" onClick={() => handlePreviewTemplate(t.id)}>
                          <Eye width={14} height={14} />
                        </button>
                        <button title="Duplicate" onClick={() => handleDuplicateTemplate(t.id)}>
                          <Copy width={14} height={14} />
                        </button>
                        <button title="Edit" onClick={() => editTemplate(t)}>
                          <EditPencil width={14} height={14} />
                        </button>
                        {!t.is_default && (
                          <button title="Delete" onClick={() => handleDeleteTemplate(t.id)}>
                            <Trash width={14} height={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── AUTOMATIONS TAB ─────────────────────── */}
      {activeTab === 'automations' && (
        <div className="mh-panel">
          <div className="mh-toolbar">
            <div className="mh-toolbar-left">
              <div className="mh-search">
                <Search width={16} height={16} />
                <input placeholder="Search automations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          {automations.length === 0 ? (
            <div className="mh-empty">
              <div className="mh-empty-icon"><Rocket width={36} height={36} /></div>
              <h3>No Automations Yet</h3>
              <p>Set up automated marketing actions triggered by client events like birthdays, no-shows, or new signups.</p>
              <button className="mh-btn mh-btn-primary" onClick={() => { resetAutomationForm(); setShowAutomationModal(true); }}>
                <Plus width={16} height={16} /> Create Automation
              </button>
            </div>
          ) : (
            <div className="mh-automations-list">
              {automations.filter(a => !searchTerm || a.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(a => {
                const TrigIcon = TRIGGER_ICONS[a.trigger_type] || Settings;
                const trigColor = TRIGGER_COLORS[a.trigger_type] || TRIGGER_COLORS.custom;
                return (
                  <div className="mh-automation-card" key={a.id}>
                    <div className="mh-automation-icon" style={{ background: trigColor.bg, color: trigColor.color }}>
                      <TrigIcon width={22} height={22} />
                    </div>
                    <div className="mh-automation-info">
                      <div className="mh-automation-name">{a.name}</div>
                      <div className="mh-automation-desc">
                        {a.description || `Trigger: ${(a.trigger_type || '').replace(/_/g, ' ')} → ${(a.action_type || '').replace(/_/g, ' ')}`}
                      </div>
                    </div>
                    <div className="mh-automation-stats">
                      <div className="mh-automation-stat">
                        <div className="mh-automation-stat-val">{a.total_triggered || 0}</div>
                        <div className="mh-automation-stat-lbl">Triggered</div>
                      </div>
                      <div className="mh-automation-stat">
                        <div className="mh-automation-stat-val">{a.total_successful || 0}</div>
                        <div className="mh-automation-stat-lbl">Successful</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="mh-btn mh-btn-sm mh-btn-ghost" onClick={() => editAutomation(a)}>
                        <EditPencil width={14} height={14} />
                      </button>
                      <button className="mh-btn mh-btn-sm mh-btn-ghost" style={{ color: '#ef4444' }} onClick={() => handleDeleteAutomation(a.id)}>
                        <Trash width={14} height={14} />
                      </button>
                      <button
                        className={`mh-automation-toggle ${a.is_active ? 'on' : 'off'}`}
                        onClick={() => handleToggleAutomation(a.id)}
                        title={a.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
         MODALS
         ═══════════════════════════════════════════ */}

      {/* Campaign Modal */}
      <Modal show={showCampaignModal} onHide={() => { setShowCampaignModal(false); resetCampaignForm(); }} size="lg" centered className="mh-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingId ? 'Edit Campaign' : 'Create Campaign'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mh-form-group">
            <label>Campaign Name *</label>
            <input value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Beauty Special" />
          </div>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Channel</label>
              <select value={campaignForm.type} onChange={e => setCampaignForm(f => ({ ...f, type: e.target.value }))}>
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="social">📣 Social</option>
                <option value="push">🔔 Push Notification</option>
              </select>
            </div>
            <div className="mh-form-group">
              <label>Campaign Type</label>
              <select value={campaignForm.campaign_type} onChange={e => setCampaignForm(f => ({ ...f, campaign_type: e.target.value }))}>
                <option value="promotional">Promotional</option>
                <option value="transactional">Transactional</option>
                <option value="automated">Automated</option>
                <option value="birthday">Birthday</option>
                <option value="reengagement">Re-engagement</option>
                <option value="welcome">Welcome</option>
                <option value="review_request">Review Request</option>
                <option value="referral">Referral</option>
                <option value="seasonal">Seasonal</option>
                <option value="flash_sale">Flash Sale</option>
              </select>
            </div>
          </div>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Target Audience</label>
              <select value={campaignForm.audience_id} onChange={e => setCampaignForm(f => ({ ...f, audience_id: e.target.value }))}>
                <option value="">All Contacts</option>
                {audiences.map(a => <option key={a.id} value={a.id}>{a.name} ({a.member_count || 0})</option>)}
              </select>
            </div>
            <div className="mh-form-group">
              <label>Email Template</label>
              <select value={campaignForm.template_id} onChange={e => setCampaignForm(f => ({ ...f, template_id: e.target.value }))}>
                <option value="">No Template</option>
                {templates.filter(t => t.template_type === campaignForm.type || campaignForm.type === 'email').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mh-form-group">
            <label>Subject Line</label>
            <input value={campaignForm.subject} onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. ✨ Special Offer Just For You!" />
          </div>
          <div className="mh-form-group">
            <label>Content / Message</label>
            <textarea value={campaignForm.content} onChange={e => setCampaignForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your campaign message..." rows={4} />
          </div>
          <div className="mh-form-group">
            <label>Description (internal note)</label>
            <input value={campaignForm.description} onChange={e => setCampaignForm(f => ({ ...f, description: e.target.value }))} placeholder="Internal description..." />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="mh-btn mh-btn-ghost" onClick={() => { setShowCampaignModal(false); resetCampaignForm(); }}>Cancel</button>
          <button className="mh-btn mh-btn-primary" onClick={handleSaveCampaign}>
            {editingId ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Audience Modal */}
      <Modal show={showAudienceModal} onHide={() => { setShowAudienceModal(false); resetAudienceForm(); }} centered className="mh-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingId ? 'Edit Audience' : 'Create Audience'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mh-form-group">
            <label>Audience Name *</label>
            <input value={audienceForm.name} onChange={e => setAudienceForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. VIP Clients" />
          </div>
          <div className="mh-form-group">
            <label>Description</label>
            <textarea value={audienceForm.description} onChange={e => setAudienceForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this audience..." rows={3} />
          </div>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Type</label>
              <select value={audienceForm.type} onChange={e => setAudienceForm(f => ({ ...f, type: e.target.value }))}>
                <option value="static">Static</option>
                <option value="dynamic">Dynamic</option>
                <option value="smart">Smart</option>
              </select>
            </div>
            <div className="mh-form-group">
              <label>Segment</label>
              <select value={audienceForm.segment_type} onChange={e => setAudienceForm(f => ({ ...f, segment_type: e.target.value }))}>
                <option value="all_clients">All Clients</option>
                <option value="new_clients">New Clients (Last 30 Days)</option>
                <option value="vip_clients">VIP Clients (High Spenders)</option>
                <option value="inactive_clients">Inactive Clients (60+ Days)</option>
                <option value="birthday_month">Birthday This Month</option>
                <option value="service_based">Service Based</option>
                <option value="spend_based">Spend Based</option>
                <option value="membership">Membership Holders</option>
                <option value="loyalty_tier">Loyalty Tier</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="mh-btn mh-btn-ghost" onClick={() => { setShowAudienceModal(false); resetAudienceForm(); }}>Cancel</button>
          <button className="mh-btn mh-btn-primary" onClick={handleSaveAudience}>
            {editingId ? 'Update Audience' : 'Create Audience'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Template Modal */}
      <Modal show={showTemplateModal} onHide={() => { setShowTemplateModal(false); resetTemplateForm(); }} size="lg" centered className="mh-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingId ? 'Edit Template' : 'Create Template'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Template Name *</label>
              <input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Email" />
            </div>
            <div className="mh-form-group">
              <label>Category</label>
              <select value={templateForm.category} onChange={e => setTemplateForm(f => ({ ...f, category: e.target.value }))}>
                <option value="appointment">Appointment</option>
                <option value="reminder">Reminder</option>
                <option value="welcome">Welcome</option>
                <option value="review">Review</option>
                <option value="birthday">Birthday</option>
                <option value="promotion">Promotion</option>
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
                <option value="membership">Membership</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Type</label>
              <select value={templateForm.template_type} onChange={e => setTemplateForm(f => ({ ...f, template_type: e.target.value }))}>
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="push">🔔 Push</option>
              </select>
            </div>
            <div className="mh-form-group">
              <label>Subject Line *</label>
              <input value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Your appointment is confirmed! ✨" />
            </div>
          </div>
          <div className="mh-form-group">
            <label>Body / Content * <span style={{ fontWeight: 400, color: '#adb5bd', fontSize: '0.75rem' }}>Supports HTML. Use {'{{client_name}}'}, {'{{service_name}}'}, etc.</span></label>
            <textarea
              value={templateForm.body}
              onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your template content here..."
              rows={8}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
          </div>
          {templateForm.body && (
            <div className="mh-preview-panel" style={{ marginTop: 12 }}>
              <div className="mh-preview-header">
                <div className="mh-preview-dots"><span /><span /><span /></div>
                <div className="mh-preview-subject">Preview</div>
              </div>
              <div className="mh-preview-body" dangerouslySetInnerHTML={{ __html: templateForm.body }} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="mh-btn mh-btn-ghost" onClick={() => { setShowTemplateModal(false); resetTemplateForm(); }}>Cancel</button>
          <button className="mh-btn mh-btn-primary" onClick={handleSaveTemplate}>
            {editingId ? 'Update Template' : 'Create Template'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Automation Modal */}
      <Modal show={showAutomationModal} onHide={() => { setShowAutomationModal(false); resetAutomationForm(); }} centered className="mh-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingId ? 'Edit Automation' : 'Create Automation'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mh-form-group">
            <label>Automation Name *</label>
            <input value={automationForm.name} onChange={e => setAutomationForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome New Clients" />
          </div>
          <div className="mh-form-group">
            <label>Description</label>
            <textarea value={automationForm.description} onChange={e => setAutomationForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what this automation does..." rows={2} />
          </div>
          <div className="mh-form-row">
            <div className="mh-form-group">
              <label>Trigger Event *</label>
              <select value={automationForm.trigger_type} onChange={e => setAutomationForm(f => ({ ...f, trigger_type: e.target.value }))}>
                <option value="new_client">New Client Registration</option>
                <option value="appointment_completed">Appointment Completed</option>
                <option value="birthday">Client Birthday</option>
                <option value="no_visit_30d">No Visit (30 Days)</option>
                <option value="no_visit_60d">No Visit (60 Days)</option>
                <option value="no_visit_90d">No Visit (90 Days)</option>
                <option value="review_request">Review Request</option>
                <option value="membership_expiring">Membership Expiring</option>
                <option value="package_expiring">Package Expiring</option>
                <option value="welcome">Welcome Message</option>
                <option value="custom">Custom Trigger</option>
              </select>
            </div>
            <div className="mh-form-group">
              <label>Action</label>
              <select value={automationForm.action_type} onChange={e => setAutomationForm(f => ({ ...f, action_type: e.target.value }))}>
                <option value="send_email">Send Email</option>
                <option value="send_sms">Send SMS</option>
                <option value="send_whatsapp">Send WhatsApp</option>
                <option value="create_promotion">Create Promotion</option>
                <option value="add_loyalty_points">Add Loyalty Points</option>
                <option value="assign_tag">Assign Tag</option>
              </select>
            </div>
          </div>
          <div className="mh-form-group">
            <label>Delay (minutes)</label>
            <input type="number" min="0" value={automationForm.delay_minutes} onChange={e => setAutomationForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))} placeholder="0 = immediate" />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="mh-btn mh-btn-ghost" onClick={() => { setShowAutomationModal(false); resetAutomationForm(); }}>Cancel</button>
          <button className="mh-btn mh-btn-primary" onClick={handleSaveAutomation}>
            {editingId ? 'Update Automation' : 'Create Automation'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg" centered className="mh-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>Template Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {previewContent && (
            <div className="mh-preview-panel" style={{ border: 'none', borderRadius: 0 }}>
              <div className="mh-preview-header">
                <div className="mh-preview-dots"><span /><span /><span /></div>
                <div className="mh-preview-subject"><strong>Subject:</strong> {previewContent.subject}</div>
              </div>
              <div className="mh-preview-body" dangerouslySetInnerHTML={{ __html: previewContent.body }} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="mh-btn mh-btn-ghost" onClick={() => setShowPreviewModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
