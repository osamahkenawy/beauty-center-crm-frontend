import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Notes() {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    related_type: '',
    related_id: '',
    is_pinned: false,
    is_private: false
  });

  useEffect(() => {
    fetchNotes();
  }, [search, filterType]);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType) params.append('related_type', filterType);
      
      const res = await fetch(`${API_URL}/notes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData({
      title: '',
      content: '',
      related_type: '',
      related_id: '',
      is_pinned: false,
      is_private: false
    });
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const openEditModal = (note) => {
    setEditing(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      related_type: note.related_type || '',
      related_id: note.related_id || '',
      is_pinned: note.is_pinned === 1 || note.is_pinned === true,
      is_private: note.is_private === 1 || note.is_private === true
    });
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('crm_token');
      const url = editing ? `${API_URL}/notes/${editing.id}` : `${API_URL}/notes`;
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchNotes();
      } else {
        setMessage({ type: 'error', text: data.message || t('notes.failedToSave') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('notes.errorOccurred') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => supportAlert();

  const formatDate = (date) => {
    if (!date) return '-';
    const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const translateRelatedType = (type) => {
    if (!type) return '';
    return t(`notes.${type}`, { defaultValue: type });
  };

  const getTypeIcon = (type) => {
    const icons = {
      account: '🏢',
      contact: '👤',
      lead: '🎯',
      deal: '💰',
      activity: '📅'
    };
    return icons[type] || '📝';
  };

  // Sort notes - pinned first
  const sortedNotes = [...notes]
    .filter(n => n.content?.toLowerCase().includes(search.toLowerCase()) || n.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

  return (
    <div className="crm-page">
      <SEO page="notes" noindex={true} />
      <style>{`
        .notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .notes-filters { display: flex; gap: 10px; flex-wrap: wrap; }
        .notes-filters input, .notes-filters select { padding: 10px 14px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 13px; }
        .notes-filters input:focus, .notes-filters select:focus { border-color: #244066; outline: none; }
        .btn-create { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
        .btn-create:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(36, 64, 102, 0.3); }
        
        .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
        .note-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 2px solid transparent; transition: all 0.3s; position: relative; }
        .note-card:hover { border-color: #244066; transform: translateY(-3px); }
        .note-card.pinned { border-color: #ff9f43; }
        .note-card.pinned::before { content: '📌'; position: absolute; top: -10px; right: 15px; font-size: 20px; }
        .note-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
        .note-title { font-weight: 700; font-size: 16px; color: #1a1a2e; margin: 0; }
        .note-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #6c757d; margin-top: 5px; }
        .note-type { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: #f0f0f0; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .note-content { color: #495057; line-height: 1.6; margin-bottom: 15px; max-height: 100px; overflow: hidden; text-overflow: ellipsis; white-space: pre-wrap; }
        .note-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #f0f0f0; }
        .note-date { font-size: 12px; color: #adb5bd; }
        .note-actions { display: flex; gap: 8px; }
        .note-actions button { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; }
        .note-actions .btn-edit { background: rgba(36, 64, 102, 0.1); color: #244066; }
        .note-actions .btn-edit:hover { background: #244066; color: white; }
        .note-actions .btn-delete { background: rgba(234, 84, 85, 0.1); color: #ea5455; }
        .note-actions .btn-delete:hover { background: #ea5455; color: white; }
        .private-badge { font-size: 10px; padding: 3px 8px; background: #6c757d; color: white; border-radius: 10px; }
        
        .crm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .crm-modal-container { background: white; border-radius: 16px; max-width: 600px; width: 95%; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25); animation: modalSlideIn 0.3s ease; }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .crm-modal-header { padding: 20px 25px; background: linear-gradient(135deg, #244066, #3a5a8a); color: white; display: flex; justify-content: space-between; align-items: center; }
        .crm-modal-title { font-size: 18px; font-weight: 700; margin: 0; }
        .crm-modal-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 20px; transition: all 0.2s; }
        .crm-modal-close:hover { background: rgba(255,255,255,0.3); }
        .crm-modal-body { padding: 25px; max-height: 60vh; overflow-y: auto; }
        .crm-modal-footer { padding: 20px 25px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 10px; background: #fafafa; }
        
        .form-group { margin-bottom: 16px; }
        .form-label { font-weight: 600; color: #495057; margin-bottom: 6px; display: block; font-size: 13px; }
        .form-control, .form-select { width: 100%; padding: 10px 14px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.2s; }
        .form-control:focus, .form-select:focus { border-color: #244066; outline: none; box-shadow: 0 0 0 3px rgba(36, 64, 102, 0.1); }
        textarea.form-control { min-height: 150px; resize: vertical; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-check { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; cursor: pointer; }
        .form-check-input { width: 20px; height: 20px; cursor: pointer; accent-color: #244066; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-secondary { background: #e9ecef; color: #495057; }
        .btn-secondary:hover { background: #dee2e6; }
        .btn-primary { background: linear-gradient(135deg, #244066, #3a5a8a); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(36, 64, 102, 0.3); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
        .alert-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .alert-success { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        
        .empty-state { text-align: center; padding: 60px 20px; color: #6c757d; }
        .empty-icon { font-size: 64px; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; width: 100%; }
        .empty-state h4 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
        .empty-state p { color: #6c757d; }
        
        .loading-state { display: flex; justify-content: center; align-items: center; padding: 60px; }
        .spinner-border { width: 40px; height: 40px; border: 4px solid #e9ecef; border-top-color: #244066; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="notes-header">
        <div className="notes-filters">
          <input
            type="text"
            placeholder={`🔍 ${t('notes.searchNotes')}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">{t('notes.allTypes')}</option>
            <option value="account">{t('notes.accountNotes')}</option>
            <option value="contact">{t('notes.contactNotes')}</option>
            <option value="lead">{t('notes.leadNotes')}</option>
            <option value="deal">{t('notes.dealNotes')}</option>
            <option value="activity">{t('notes.activityNotes')}</option>
          </select>
        </div>
        <button className="btn-create" onClick={openCreateModal}>
          <i className="iconoir-plus"></i> {t('notes.newNote')}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner-border"></div>
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h4>{t('notes.noNotesYet')}</h4>
          <p>{t('notes.createFirstNote')}</p>
        </div>
      ) : (
        <div className="notes-grid">
          {sortedNotes.map(note => (
            <div key={note.id} className={`note-card ${(note.is_pinned === 1 || note.is_pinned === true) ? 'pinned' : ''}`}>
              <div className="note-header">
                <div>
                  <h5 className="note-title">{note.title || t('notes.untitled')}</h5>
                  <div className="note-meta">
                    {note.related_type && (
                      <span className="note-type">
                        {getTypeIcon(note.related_type)} {translateRelatedType(note.related_type)}
                      </span>
                    )}
                    {(note.is_private === 1 || note.is_private === true) && <span className="private-badge">🔒 {t('notes.private')}</span>}
                  </div>
                </div>
              </div>
              <div className="note-content">{note.content}</div>
              <div className="note-footer">
                <span className="note-date">{formatDate(note.updated_at || note.created_at)}</span>
                <div className="note-actions">
                  <button className="btn-edit" onClick={() => openEditModal(note)}>{t('notes.edit')}</button>
                  <button className="btn-delete" onClick={() => handleDelete(note.id)}>{t('notes.delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="crm-modal-container" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h5 className="crm-modal-title">{editing ? t('notes.editNote') : t('notes.newNote')}</h5>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="crm-modal-body">
                {message.text && <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>{message.text}</div>}

                <div className="form-group">
                  <label className="form-label">{t('notes.formTitle')}</label>
                  <input type="text" className="form-control" name="title" value={formData.title} onChange={handleInputChange} placeholder={t('notes.noteTitlePlaceholder')} />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('notes.content')} *</label>
                  <textarea className="form-control" name="content" value={formData.content} onChange={handleInputChange} required placeholder={t('notes.writeNotePlaceholder')}></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('notes.relatedTo')}</label>
                    <select className="form-select" name="related_type" value={formData.related_type} onChange={handleInputChange}>
                      <option value="">{t('notes.none')}</option>
                      <option value="account">{t('notes.account')}</option>
                      <option value="contact">{t('notes.contact')}</option>
                      <option value="lead">{t('notes.lead')}</option>
                      <option value="deal">{t('notes.deal')}</option>
                      <option value="activity">{t('notes.activity')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('notes.relatedId')}</label>
                    <input type="number" className="form-control" name="related_id" value={formData.related_id} onChange={handleInputChange} placeholder={t('notes.idPlaceholder')} />
                  </div>
                </div>

                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="is_pinned" name="is_pinned" checked={formData.is_pinned} onChange={handleInputChange} />
                  <label htmlFor="is_pinned">📌 {t('notes.pinThisNote')}</label>
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="is_private" name="is_private" checked={formData.is_private} onChange={handleInputChange} />
                  <label htmlFor="is_private">🔒 {t('notes.privateOnlyVisible')}</label>
                </div>
              </div>
              <div className="crm-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('notes.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('notes.saving') : (editing ? t('notes.update') : t('notes.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
