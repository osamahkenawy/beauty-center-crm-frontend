import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { FileIcon, Plus, Edit, Trash2, Check, Search, Download, Eye, Upload } from 'lucide-react';
import SEO from '../components/SEO';
import { supportAlert } from '../utils/supportAlert';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    title: '', file_name: '', file_path: '', file_type: '', file_size: 0,
    related_type: '', related_id: '', version: '1.0', description: '', is_private: false
  });

  const relatedTypes = ['account', 'contact', 'deal', 'lead', 'quote', 'other'];

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDocuments(data.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateModal = () => {
    setEditingDocument(null);
    setFormData({
      title: '', file_name: '', file_path: '', file_type: '', file_size: 0,
      related_type: '', related_id: '', version: '1.0', description: '', is_private: false
    });
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setEditingDocument(doc);
    setFormData({
      title: doc.title, file_name: doc.file_name, file_path: doc.file_path,
      file_type: doc.file_type || '', file_size: doc.file_size || 0,
      related_type: doc.related_type || '', related_id: doc.related_id || '',
      version: doc.version || '1.0', description: doc.description || '',
      is_private: doc.is_private === 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/documents${editingDocument ? `/${editingDocument.id}` : ''}`, {
        method: editingDocument ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, related_id: formData.related_id || null })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchDocuments();
        setShowModal(false);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => supportAlert();

  const filteredDocs = documents.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.file_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    const icons = {
      'pdf': '📄', 'doc': '📝', 'docx': '📝', 'xls': '📊', 'xlsx': '📊',
      'ppt': '📽️', 'pptx': '📽️', 'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️',
      'gif': '🖼️', 'zip': '📦', 'rar': '📦'
    };
    return icons[type?.toLowerCase()] || '📎';
  };

  return (
    <div className="crm-page">
      <SEO page="documents" noindex={true} />
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <span>!</span>}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h1>Documents</h1>
          <p className="subtitle">{documents.length} documents</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Upload size={18} /> Upload Document
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : filteredDocs.length === 0 ? (
        <div className="empty-state">
          <FileIcon size={64} />
          <h3>No documents found</h3>
          <p>Upload your first document</p>
          <button className="btn-primary" onClick={openCreateModal}>
            <Upload size={18} /> Upload Document
          </button>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="doc-icon">{getFileIcon(doc.file_type)}</div>
              <div className="doc-info">
                <h4 className="doc-title">{doc.title}</h4>
                <div className="doc-meta">
                  <span>{doc.file_name}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  {doc.version && <span>v{doc.version}</span>}
                </div>
                {doc.related_type && (
                  <div className="doc-related">
                    {doc.related_type} #{doc.related_id}
                  </div>
                )}
                {doc.owner_name && <div className="doc-owner">By {doc.owner_name}</div>}
              </div>
              <div className="doc-actions">
                <button onClick={() => openEditModal(doc)} title="Edit"><Edit size={14} /></button>
                <button onClick={() => handleDelete(doc)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDocument ? 'Edit Document' : 'Upload Document'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>File Name *</label>
                    <input type="text" name="file_name" value={formData.file_name} onChange={handleInputChange} className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label>File Type</label>
                    <input type="text" name="file_type" value={formData.file_type} onChange={handleInputChange} className="form-control" placeholder="e.g., pdf" />
                  </div>
                </div>
                <div className="form-group">
                  <label>File Path/URL *</label>
                  <input type="text" name="file_path" value={formData.file_path} onChange={handleInputChange} className="form-control" required placeholder="/documents/file.pdf or https://..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Related To</label>
                    <select name="related_type" value={formData.related_type} onChange={handleInputChange} className="form-control">
                      <option value="">None</option>
                      {relatedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Related ID</label>
                    <input type="number" name="related_id" value={formData.related_id} onChange={handleInputChange} className="form-control" disabled={!formData.related_type} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Version</label>
                    <input type="text" name="version" value={formData.version} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>File Size (bytes)</label>
                    <input type="number" name="file_size" value={formData.file_size} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows={2}></textarea>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleInputChange} /> Private (only visible to you)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingDocument ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .documents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .document-card { display: flex; gap: 16px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); align-items: flex-start; }
        .doc-icon { font-size: 36px; flex-shrink: 0; }
        .doc-info { flex: 1; min-width: 0; }
        .doc-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0 0 6px 0; }
        .doc-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #6b7280; }
        .doc-meta span { background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
        .doc-related { font-size: 12px; color: #244066; margin-top: 8px; text-transform: capitalize; }
        .doc-owner { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        .doc-actions { display: flex; flex-direction: column; gap: 8px; }
        .doc-actions button { width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s; }
        .doc-actions button:hover { background: #244066; color: white; }
      `}</style>
    </div>
  );
}

