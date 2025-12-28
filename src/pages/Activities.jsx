import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, Calendar, Phone, Mail, Check, ChatBubble, Page, Plus,
  Search, Eye, EditPencil, Trash, Filter, CheckCircle, Clock, WarningTriangle
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ overdue: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [relatedEntities, setRelatedEntities] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, loading: false });
  
  const [formData, setFormData] = useState({
    type: 'task', subject: '', description: '', due_date: '', due_time: '',
    priority: 'medium', related_type: '', related_id: '', reminder_datetime: '',
    assigned_to: '', status: 'pending'
  });

  const activityTypes = useMemo(() => [
    { value: 'call', label: 'Call', icon: '📞', color: '#28c76f' },
    { value: 'meeting', label: 'Meeting', icon: '👥', color: '#7367f0' },
    { value: 'email', label: 'Email', icon: '📧', color: '#00cfe8' },
    { value: 'task', label: 'Task', icon: '✅', color: '#ff9f43' },
    { value: 'follow_up', label: 'Follow Up', icon: '🔄', color: '#667eea' },
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
    { value: 'note', label: 'Note', icon: '📝', color: '#82868b' },
    { value: 'sms', label: 'SMS', icon: '📱', color: '#f56565' }
  ], []);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('due_date', filterDate);
      
      const res = await fetch(`${API_URL}/activities?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.data || []);
        setStats(data.stats || { overdue: 0, today: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterDate]);

  const fetchStaff = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/staff`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStaffList(data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRelatedEntities = useCallback(async (type) => {
    if (!type) { setRelatedEntities([]); return; }
    setLoadingRelated(true);
    try {
      const token = localStorage.getItem('crm_token');
      let url = '';
      switch (type) {
        case 'lead': url = `${API_URL}/leads?limit=100`; break;
        case 'contact': url = `${API_URL}/contacts?limit=100`; break;
        case 'account': url = `${API_URL}/accounts?limit=100`; break;
        case 'deal': url = `${API_URL}/deals?limit=100`; break;
        default: return;
      }
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const entities = (data.data || []).map(e => ({
          id: e.id,
          name: type === 'account' || type === 'deal' ? e.name : `${e.first_name || ''} ${e.last_name || ''}`.trim()
        }));
        setRelatedEntities(entities);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingRelated(false); }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchStaff();
  }, [fetchActivities, fetchStaff]);

  useEffect(() => {
    if (showModal && formData.related_type) {
      fetchRelatedEntities(formData.related_type);
    }
  }, [formData.related_type, showModal, fetchRelatedEntities]);

  useEffect(() => {
    if (selectAll) {
      setSelectedIds(new Set(activities.map(a => a.id)));
    }
  }, [selectAll, activities]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const openCreateModal = useCallback(() => {
    setEditing(null);
    setFormData({
      type: 'task', subject: '', description: '', 
      due_date: new Date().toISOString().split('T')[0], due_time: '10:00',
      priority: 'medium', related_type: '', related_id: '', reminder_datetime: '',
      assigned_to: '', status: 'pending'
    });
    setRelatedEntities([]);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((activity) => {
    setEditing(activity);
    setFormData({
      type: activity.type || 'task', 
      subject: activity.subject || '',
      description: activity.description || '',
      due_date: activity.due_date ? activity.due_date.split('T')[0] : '',
      due_time: activity.due_time || '',
      priority: activity.priority || 'medium',
      related_type: activity.related_type || '',
      related_id: activity.related_id || '',
      reminder_datetime: activity.reminder_datetime ? activity.reminder_datetime.slice(0, 16) : '',
      assigned_to: activity.assigned_to || '',
      status: activity.status || 'pending'
    });
    setShowModal(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const payload = { ...formData };
      if (payload.related_type === '') payload.related_type = null;
      if (payload.related_id === '') payload.related_id = null;
      if (payload.assigned_to === '') payload.assigned_to = null;
      if (payload.reminder_datetime === '') payload.reminder_datetime = null;

      const res = await fetch(`${API_URL}/activities${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', editing ? 'Activity updated!' : 'Activity created!');
        setShowModal(false);
        fetchActivities();
      } else {
        showToast('error', data.message || 'Failed to save');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (activity, newStatus) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', newStatus === 'completed' ? 'Activity completed!' : 'Activity reopened');
        fetchActivities();
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
    }
  };

  const handleDelete = useCallback((activity) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Activity',
      message: `Are you sure you want to delete "${activity.subject}"?`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const token = localStorage.getItem('crm_token');
          const res = await fetch(`${API_URL}/activities/${activity.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            showToast('success', 'Activity deleted');
            fetchActivities();
          }
        } catch (error) {
          showToast('error', 'Failed to delete');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
      }
    });
  }, [fetchActivities, showToast]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Multiple Activities',
      message: `Are you sure you want to delete ${selectedIds.size} selected activities?`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const token = localStorage.getItem('crm_token');
          const deletePromises = Array.from(selectedIds).map(id =>
            fetch(`${API_URL}/activities/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
          );
          await Promise.all(deletePromises);
          showToast('success', `${selectedIds.size} activities deleted`);
          setSelectedIds(new Set());
          setSelectAll(false);
          fetchActivities();
        } catch (error) {
          showToast('error', 'Failed to delete some activities');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
      }
    });
  }, [selectedIds, fetchActivities, showToast]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectAll || selectedIds.size === activities.length) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(activities.map(a => a.id)));
      setSelectAll(true);
    }
  }, [selectAll, selectedIds.size, activities]);

  const getTypeData = useCallback((type) => activityTypes.find(t => t.value === type) || activityTypes[3], [activityTypes]);
  
  const isOverdue = useCallback((activity) => {
    if (!activity.due_date) return false;
    if (['completed', 'cancelled'].includes(activity.status)) return false;
    return new Date(activity.due_date) < new Date().setHours(0, 0, 0, 0);
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const statusBadges = useMemo(() => ({
    pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
    in_progress: { bg: '#cce5ff', color: '#004085', label: 'In Progress' },
    completed: { bg: '#d4edda', color: '#155724', label: 'Completed' },
    cancelled: { bg: '#f8d7da', color: '#721c24', label: 'Cancelled' }
  }), []);

  const priorityColors = useMemo(() => ({
    low: { bg: '#e2e8f0', color: '#475569' },
    medium: { bg: '#fef3c7', color: '#92400e' },
    high: { bg: '#fee2e2', color: '#991b1b' },
    urgent: { bg: '#fecaca', color: '#dc2626' }
  }), []);

  const clearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterDate('');
  };

  return (
    <div className="crm-page">
      <style>{`
        /* Toast */
        .activity-toast {
          position: fixed; top: 20px; right: 20px; z-index: 9999;
          padding: 16px 24px; border-radius: 12px; color: white; font-weight: 600;
          display: flex; align-items: center; gap: 10px;
          animation: toastSlide 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .activity-toast.success { background: linear-gradient(135deg, #28c76f, #48da89); }
        .activity-toast.error { background: linear-gradient(135deg, #ea5455, #f08182); }
        @keyframes toastSlide { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Header */
        .activities-header {
          background: linear-gradient(135deg, #244066 0%, #3a5a8a 100%);
          border-radius: 20px; padding: 28px 32px; margin-bottom: 24px; color: white;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;
        }
        .header-title h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px 0; }
        .header-title p { margin: 0; opacity: 0.85; font-size: 14px; }
        .header-stats { display: flex; gap: 16px; }
        .stat-card {
          background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
          padding: 16px 24px; border-radius: 14px; text-align: center; min-width: 100px;
          transition: all 0.2s;
        }
        .stat-card:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .stat-card.danger { background: rgba(234,84,85,0.3); }
        .stat-card.warning { background: rgba(255,159,67,0.3); }
        .stat-value { font-size: 32px; font-weight: 800; line-height: 1; }
        .stat-label { font-size: 12px; opacity: 0.9; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .btn-add {
          background: #f2421b; color: white; border: none; padding: 14px 28px; border-radius: 12px;
          font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px;
          transition: all 0.2s; font-size: 14px;
        }
        .btn-add:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(242,66,27,0.3); }

        /* Filters */
        .filters-bar {
          background: white; border-radius: 16px; padding: 20px 24px; margin-bottom: 24px;
          display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-label { font-size: 11px; font-weight: 600; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
        .filter-select, .filter-input {
          padding: 10px 16px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;
          min-width: 150px; background: white; cursor: pointer; transition: all 0.2s; height: 44px;
        }
        .filter-select:focus, .filter-input:focus { border-color: #244066; outline: none; box-shadow: 0 0 0 3px rgba(36,64,102,0.1); }
        .clear-filters {
          background: #f8f9fa; border: 2px solid #e9ecef; padding: 10px 20px; border-radius: 10px;
          font-weight: 600; cursor: pointer; color: #6c757d; transition: all 0.2s; height: 44px;
        }
        .clear-filters:hover { background: #e9ecef; color: #333; }
        .bulk-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .bulk-count { font-size: 13px; color: #6c757d; font-weight: 600; }
        .btn-bulk-delete {
          background: linear-gradient(135deg, #ea5455, #f08182); color: white; border: none;
          padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .btn-bulk-delete:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(234,84,85,0.3); }

        /* Activities List */
        .activities-container {
          background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .list-header {
          padding: 16px 24px; background: #f8f9fa; border-bottom: 1px solid #e9ecef;
          display: flex; align-items: center; gap: 16px; font-size: 13px; color: #6c757d; font-weight: 600;
        }
        .activity-card {
          display: flex; align-items: flex-start; gap: 16px; padding: 20px 24px;
          border-bottom: 1px solid #f0f2f5; transition: background 0.15s; position: relative;
        }
        .activity-card:last-child { border-bottom: none; }
        .activity-card:hover { background: #fafbfc; }
        .activity-card.overdue { border-left: 4px solid #ea5455; background: linear-gradient(90deg, rgba(234,84,85,0.03) 0%, transparent 30%); }
        .activity-card.completed { opacity: 0.7; }
        .activity-card.selected { background: rgba(36,64,102,0.05); }

        /* Checkbox */
        .activity-select {
          width: 22px; height: 22px; border: 2px solid #dee2e6; border-radius: 6px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 4px; transition: all 0.15s; background: white;
        }
        .activity-select:hover { border-color: #244066; }
        .activity-select.checked { background: #244066; border-color: #244066; color: white; }
        
        /* Status Toggle */
        .activity-check {
          width: 28px; height: 28px; border: 2px solid #dee2e6; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s; font-size: 14px;
        }
        .activity-check:hover { border-color: #28c76f; background: rgba(40,199,111,0.1); }
        .activity-check.checked { background: linear-gradient(135deg, #28c76f, #48da89); border-color: #28c76f; color: white; }

        /* Type Icon */
        .activity-type-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 22px;
        }

        /* Content */
        .activity-body { flex: 1; min-width: 0; }
        .activity-title {
          font-size: 16px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px;
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .activity-title.done { text-decoration: line-through; color: #999; }
        .activity-desc { color: #6c757d; font-size: 13px; margin-bottom: 10px; }
        .activity-meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6c757d; }
        .meta-item { display: flex; align-items: center; gap: 6px; }
        .meta-item.overdue { color: #ea5455; font-weight: 600; }

        /* Badges */
        .priority-badge, .status-badge {
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize;
        }

        /* Actions */
        .activity-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .activity-actions button {
          width: 40px; height: 40px; border: none; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
          background: #f1f3f4; color: #64748b;
        }
        .activity-actions button:hover { background: #244066; color: white; }
        .activity-actions button.delete:hover { background: #ea5455; }

        /* Modal */
        .crm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .crm-modal-container { background: white; border-radius: 16px; max-width: 700px; width: 95%; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25); animation: modalSlideIn 0.3s ease; }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .crm-modal-header { padding: 20px 25px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; display: flex; justify-content: space-between; align-items: center; }
        .crm-modal-title { font-size: 18px; font-weight: 700; margin: 0; }
        .crm-modal-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 20px; }
        .crm-modal-body { padding: 25px; max-height: 60vh; overflow-y: auto; }
        .crm-modal-footer { padding: 20px 25px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 10px; background: #fafafa; }
        
        .form-group { margin-bottom: 16px; }
        .form-label { font-weight: 600; color: #495057; margin-bottom: 6px; display: block; font-size: 13px; }
        .form-control, .form-select { width: 100%; padding: 10px 14px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; }
        .form-control:focus, .form-select:focus { border-color: #244066; outline: none; }
        textarea.form-control { min-height: 100px; resize: vertical; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-secondary { background: #e9ecef; color: #495057; }
        .btn-primary { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Confirm Modal */
        .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .confirm-modal { background: white; border-radius: 16px; max-width: 400px; width: 90%; padding: 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .confirm-modal h3 { margin: 0 0 10px 0; font-size: 20px; color: #1a1a2e; }
        .confirm-modal p { color: #6c757d; margin-bottom: 24px; }
        .confirm-modal-actions { display: flex; gap: 12px; justify-content: center; }
        .btn-cancel { background: #e9ecef; color: #495057; padding: 12px 24px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btn-confirm-delete { background: linear-gradient(135deg, #ea5455, #f08182); color: white; padding: 12px 24px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

        /* Empty State */
        .empty-state { text-align: center; padding: 60px 20px; color: #6c757d; }
        .empty-icon { font-size: 64px; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; }
        .empty-state h4 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
        
        /* Loading */
        .loading-state { display: flex; justify-content: center; align-items: center; padding: 60px; }
        .spinner-border { width: 40px; height: 40px; border: 4px solid #e9ecef; border-top-color: #244066; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast */}
      {toast.show && (
        <div className={`activity-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '!'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="activities-header">
        <div className="header-title">
          <h1>Activities</h1>
          <p>Manage your tasks, calls, meetings and more</p>
        </div>
        <div className="header-stats">
          <div className="stat-card danger">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.today}</div>
            <div className="stat-label">Due Today</div>
          </div>
        </div>
        <button className="btn-add" onClick={openCreateModal}>
          + New Activity
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <div className="filter-label">Type</div>
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {activityTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Status</div>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Due Date</div>
          <input type="date" className="filter-input" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <button className="clear-filters" onClick={clearFilters}>Clear</button>
        
        {selectedIds.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selectedIds.size} selected</span>
            <button className="btn-bulk-delete" onClick={handleBulkDelete}><Trash width={16} height={16} /> Delete Selected</button>
          </div>
        )}
      </div>

      {/* Activities List */}
      <div className="activities-container">
        <div className="list-header">
          <div className="activity-select" onClick={toggleSelectAll}>
            {(selectAll || selectedIds.size === activities.length) && activities.length > 0 ? '✓' : ''}
          </div>
          <span style={{ flex: 1 }}>{activities.length} Activities</span>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner-border"></div></div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h4>No activities found</h4>
            <p>Create your first activity to get started</p>
          </div>
        ) : (
          activities.map(activity => {
            const typeData = getTypeData(activity.type);
            const overdue = isOverdue(activity);
            const statusStyle = statusBadges[activity.status] || statusBadges.pending;
            const priorityStyle = priorityColors[activity.priority] || priorityColors.medium;
            
            return (
              <div key={activity.id} className={`activity-card ${overdue ? 'overdue' : ''} ${activity.status === 'completed' ? 'completed' : ''} ${selectedIds.has(activity.id) ? 'selected' : ''}`}>
                <div className={`activity-select ${selectedIds.has(activity.id) ? 'checked' : ''}`} onClick={() => toggleSelect(activity.id)}>
                  {selectedIds.has(activity.id) && '✓'}
                </div>
                <div 
                  className={`activity-check ${activity.status === 'completed' ? 'checked' : ''}`}
                  onClick={() => handleStatusChange(activity, activity.status === 'completed' ? 'pending' : 'completed')}
                >
                  {activity.status === 'completed' && '✓'}
                </div>
                <div className="activity-type-icon" style={{ background: `${typeData.color}20` }}>
                  {typeData.icon}
                </div>
                <div className="activity-body">
                  <div className={`activity-title ${activity.status === 'completed' ? 'done' : ''}`}>
                    {activity.subject}
                    <span className="priority-badge" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>{activity.priority}</span>
                    <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                  </div>
                  {activity.description && <div className="activity-desc">{activity.description.slice(0, 100)}...</div>}
                  <div className="activity-meta">
                    {activity.due_date && (
                      <span className={`meta-item ${overdue ? 'overdue' : ''}`}>
                        📅 {formatDate(activity.due_date)} {activity.due_time?.slice(0, 5)}
                      </span>
                    )}
                    {activity.assigned_name && <span className="meta-item">👤 {activity.assigned_name}</span>}
                    {activity.related_name && <span className="meta-item">🔗 {activity.related_name}</span>}
                  </div>
                </div>
                <div className="activity-actions">
                  <button onClick={() => openEditModal(activity)} title="Edit">
                    <EditPencil width={18} height={18} />
                  </button>
                  <button className="delete" onClick={() => handleDelete(activity)} title="Delete">
                    <Trash width={18} height={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h5 className="crm-modal-title">{editing ? 'Edit Activity' : 'New Activity'}</h5>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="crm-modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" name="type" value={formData.type} onChange={handleInputChange}>
                      {activityTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" name="priority" value={formData.priority} onChange={handleInputChange}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input type="text" className="form-control" name="subject" value={formData.subject} onChange={handleInputChange} required placeholder="Activity subject" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} placeholder="Activity details..."></textarea>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-control" name="due_date" value={formData.due_date} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input type="time" className="form-control" name="due_time" value={formData.due_time} onChange={handleInputChange} />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Related To</label>
                    <select className="form-select" name="related_type" value={formData.related_type} onChange={handleInputChange}>
                      <option value="">None</option>
                      <option value="lead">Lead</option>
                      <option value="contact">Contact</option>
                      <option value="account">Account</option>
                      <option value="deal">Deal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Select {formData.related_type || 'Entity'}</label>
                    <select className="form-select" name="related_id" value={formData.related_id} onChange={handleInputChange} disabled={!formData.related_type || loadingRelated}>
                      <option value="">{loadingRelated ? 'Loading...' : `Select ${formData.related_type || 'entity'}`}</option>
                      {relatedEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned To</label>
                    <select className="form-select" name="assigned_to" value={formData.assigned_to} onChange={handleInputChange}>
                      <option value="">Select staff member</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Reminder</label>
                  <input type="datetime-local" className="form-control" name="reminder_datetime" value={formData.reminder_datetime} onChange={handleInputChange} />
                </div>
              </div>
              <div className="crm-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update Activity' : 'Create Activity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>⚠️ {confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>Cancel</button>
              <button className="btn-confirm-delete" onClick={confirmModal.onConfirm} disabled={confirmModal.loading}>
                {confirmModal.loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
