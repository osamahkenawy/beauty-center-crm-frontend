import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GraphUp, Plus, EditPencil, Trash, Xmark, Check,
  Percentage, Trophy, XmarkCircle, ArrowDown, Drag
} from 'iconoir-react';
import api from '../lib/api';
import SEO from '../components/SEO';
import './Pipelines.css';

export default function Pipelines() {
  const { t } = useTranslation();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', industry: '', is_default: false, stages: []
  });
  const [toast, setToast] = useState({ show: false, type: '', text: '' });

  const translateStageName = (stageName) => {
    if (!stageName) return '';
    const stageKey = `pipelineStages.${stageName.toLowerCase().replace(/\s+/g, '')}`;
    return t(stageKey, { defaultValue: stageName });
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: '', text: '' }), 3000);
  };

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const data = await api.get('/pipelines');
      if (data.success) setPipelines(data.data || []);
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPipeline(null);
    setFormData({
      name: '', description: '', industry: '', is_default: false,
      stages: [
        { name: t('pipelineStages.qualification', { defaultValue: 'Qualification' }), color: '#3b82f6', probability: 10 },
        { name: t('pipelineStages.needsanalysis', { defaultValue: 'Needs Analysis' }), color: '#8b5cf6', probability: 25 },
        { name: t('pipelineStages.proposal', { defaultValue: 'Proposal' }), color: '#f59e0b', probability: 50 },
        { name: t('pipelineStages.negotiation', { defaultValue: 'Negotiation' }), color: '#ec4899', probability: 75 },
        { name: t('pipelineStages.closedwon', { defaultValue: 'Closed Won' }), color: '#22c55e', probability: 100, is_won: true },
        { name: t('pipelineStages.closedlost', { defaultValue: 'Closed Lost' }), color: '#6b7280', probability: 0, is_lost: true },
      ]
    });
    setShowModal(true);
  };

  const openEditModal = (pipeline) => {
    setEditingPipeline(pipeline);
    setFormData({
      name: pipeline.name || '', 
      description: pipeline.description || '',
      industry: pipeline.industry || '', 
      is_default: pipeline.is_default === 1,
      stages: pipeline.stages || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = editingPipeline 
        ? await api.put(`/pipelines/${editingPipeline.id}`, formData)
        : await api.post('/pipelines', formData);
      
      if (data.success) {
        showToast('success', data.message || t('pipelines.pipelineSaved'));
        fetchPipelines();
        setShowModal(false);
      } else {
        showToast('error', data.message || t('pipelines.failedToSave'));
      }
    } catch (error) {
      showToast('error', t('pipelines.errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('pipelines.deleteConfirm'))) return;
    try {
      const data = await api.delete(`/pipelines/${id}`);
      if (data.success) {
        showToast('success', t('pipelines.pipelineDeleted'));
        fetchPipelines();
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', t('pipelines.failedToDelete'));
    }
  };

  const addStage = () => {
    setFormData(prev => ({
      ...prev,
      stages: [...prev.stages, { name: '', color: '#667eea', probability: 0 }]
    }));
  };

  const updateStage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeStage = (index) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  // Calculate stats
  const stats = {
    total: pipelines.length,
    defaultPipeline: pipelines.find(p => p.is_default === 1)?.name || 'None',
    totalStages: pipelines.reduce((sum, p) => sum + (p.stages?.length || 0), 0),
    industries: [...new Set(pipelines.map(p => p.industry).filter(Boolean))].length
  };

  return (
    <div className="pipelines-page">
      <SEO page="pipelines" noindex={true} />
      {/* Toast */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check width={16} height={16} /> : <Xmark width={16} height={16} />}
          {toast.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <GraphUp width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('pipelines.totalPipelines')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <Trophy width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalStages}</div>
            <div className="stat-label">{t('pipelines.totalStages')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <Percentage width={24} height={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.industries || 0}</div>
            <div className="stat-label">{t('pipelines.industries')}</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="page-card">
        <div className="card-header">
          <div className="header-left">
            <h2>{t('pipelines.title')}</h2>
            <span className="count-badge">{pipelines.length}</span>
          </div>
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            <span>{t('pipelines.newPipeline')}</span>
          </button>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('pipelines.loadingPipelines')}</p>
            </div>
          ) : pipelines.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <GraphUp width={48} height={48} />
              </div>
              <h3>{t('pipelines.noPipelinesFound')}</h3>
              <p>{t('pipelines.createFirstPipeline')}</p>
              <button className="btn-create" onClick={openCreateModal}>
                <Plus width={18} height={18} />
                <span>{t('pipelines.newPipeline')}</span>
              </button>
            </div>
          ) : (
            <div className="pipelines-grid">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="pipeline-card">
                  <div className="pipeline-header">
                    <div className="pipeline-title">
                      <h3>{pipeline.name}</h3>
                      {pipeline.is_default === 1 && (
                        <span className="default-badge">{t('pipelines.default')}</span>
                      )}
                    </div>
                    <div className="pipeline-actions">
                      <button 
                        className="action-btn edit" 
                        onClick={() => openEditModal(pipeline)}
                        title={t('pipelines.editPipeline')}
                      >
                        <EditPencil width={20} height={20} />
                      </button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => handleDelete(pipeline.id)}
                        title={t('pipelines.deletePipeline')}
                      >
                        <Trash width={20} height={20} />
                      </button>
                    </div>
                  </div>
                  
                  {pipeline.description && (
                    <p className="pipeline-description">{pipeline.description}</p>
                  )}
                  
                  {pipeline.industry && (
                    <div className="pipeline-industry">
                      <span>{pipeline.industry}</span>
                    </div>
                  )}

                  <div className="stages-container">
                    <div className="stages-header">
                      <span>{t('pipelines.stages')} ({pipeline.stages?.length || 0})</span>
                    </div>
                    <div className="stages-flow">
                      {pipeline.stages?.map((stage, i) => (
                        <div key={i} className="stage-item">
                          <div 
                            className="stage-indicator" 
                            style={{ backgroundColor: stage.color }}
                          >
                            {stage.is_won ? (
                              <Trophy width={12} height={12} />
                            ) : stage.is_lost ? (
                              <XmarkCircle width={12} height={12} />
                            ) : (
                              <span className="stage-number">{i + 1}</span>
                            )}
                          </div>
                          <div className="stage-details">
                            <span className="stage-name">{translateStageName(stage.name)}</span>
                            <span className="stage-probability">{stage.probability}%</span>
                          </div>
                          {i < (pipeline.stages?.length || 0) - 1 && (
                            <div className="stage-connector">
                              <ArrowDown width={14} height={14} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPipeline ? t('pipelines.editPipeline') : t('pipelines.newPipeline')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <Xmark width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <GraphUp width={14} height={14} />
                      {t('pipelines.pipelineName')} *
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      placeholder={t('pipelines.defaultSalesPipeline', { defaultValue: 'e.g., Sales Pipeline' })}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('pipelines.industry')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      placeholder={t('pipelines.industry', { defaultValue: 'e.g., Real Estate, Technology' })}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('pipelines.description')}</label>
                  <textarea 
                    className="form-input" 
                    value={formData.description} 
                    rows={2}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder={t('pipelines.description', { defaultValue: 'Brief description of this pipeline...' })}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={formData.is_default}
                      onChange={(e) => setFormData({...formData, is_default: e.target.checked})} 
                    />
                    <span className="checkmark"></span>
                    {t('pipelines.setAsDefault')}
                  </label>
                </div>
                
                <div className="stages-section">
                  <div className="section-header">
                    <h4>{t('pipelines.pipelineStages')}</h4>
                    <button type="button" className="btn-add-stage" onClick={addStage}>
                      <Plus width={16} height={16} />
                      {t('pipelines.addStage')}
                    </button>
                  </div>
                  
                  <div className="stages-list">
                    {formData.stages.map((stage, index) => (
                      <div key={index} className="stage-row">
                        <div className="stage-drag">
                          <Drag width={16} height={16} />
                        </div>
                        <input
                          type="color"
                          value={stage.color}
                          onChange={(e) => updateStage(index, 'color', e.target.value)}
                          className="color-picker"
                          title="Stage Color"
                        />
                        <input
                          type="text"
                          className="form-input stage-name-input"
                          placeholder={t('pipelines.stageName')}
                          value={stage.name}
                          onChange={(e) => updateStage(index, 'name', e.target.value)}
                          required
                        />
                        <div className="probability-input">
                          <input
                            type="number"
                            className="form-input"
                            placeholder="0"
                            value={stage.probability}
                            onChange={(e) => updateStage(index, 'probability', parseInt(e.target.value) || 0)}
                            min="0"
                            max="100"
                          />
                          <span className="probability-suffix">%</span>
                        </div>
                        <label className="stage-checkbox">
                          <input 
                            type="checkbox" 
                            checked={stage.is_won || false}
                            onChange={(e) => updateStage(index, 'is_won', e.target.checked)} 
                          />
                          <Trophy width={14} height={14} className={stage.is_won ? 'active' : ''} />
                        </label>
                        <label className="stage-checkbox">
                          <input 
                            type="checkbox" 
                            checked={stage.is_lost || false}
                            onChange={(e) => updateStage(index, 'is_lost', e.target.checked)} 
                          />
                          <XmarkCircle width={14} height={14} className={stage.is_lost ? 'active' : ''} />
                        </label>
                        <button 
                          type="button" 
                          className="btn-remove-stage" 
                          onClick={() => removeStage(index)}
                          title={t('pipelines.removeStage')}
                        >
                          <Trash width={14} height={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {t('pipelines.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? t('pipelines.saving') : (editingPipeline ? t('pipelines.updatePipeline') : t('pipelines.createPipeline'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
