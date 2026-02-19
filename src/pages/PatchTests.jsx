import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Badge } from 'react-bootstrap';
import { ShieldCheck, Plus, Eye, Check, Clock, Calendar, User, Clipboard, Search, Filter, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../lib/api';
import './PatchTests.css';

const RESULT_CONFIG = {
  pending: { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending' },
  pass: { color: '#22c55e', bg: '#dcfce7', icon: '✓', label: 'Pass' },
  fail: { color: '#ef4444', bg: '#fee2e2', icon: '✗', label: 'Fail' },
  reaction: { color: '#dc2626', bg: '#fef2f2', icon: '⚠', label: 'Reaction' },
};

export default function PatchTests() {
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResult, setShowResult] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    customer_id: '', service_id: '', staff_id: '', branch_id: '', test_date: '', notes: '', valid_until: ''
  });
  const [resultForm, setResultForm] = useState({ result: 'pass', notes: '', valid_until: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes, svcRes, cRes, stRes, brRes] = await Promise.all([
        api.get(`/patch-tests${filter ? `?result=${filter}` : ''}`),
        api.get('/patch-tests/stats'),
        api.get('/products?active=true'),
        api.get('/contacts?limit=200'),
        api.get('/staff?limit=200'),
        api.get('/branches'),
      ]);
      if (tRes.success) setTests(tRes.data || []);
      if (sRes.success) setStats(sRes.data || {});
      if (svcRes.success) setServices(svcRes.data || []);
      if (cRes.success) setClients(cRes.data || []);
      if (stRes.success) setStaffList(stRes.data || []);
      if (brRes.success) setBranches(brRes.data || []);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load data', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTests = tests.filter(t => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (t.customer_first_name || '').toLowerCase().includes(q) ||
      (t.customer_last_name || '').toLowerCase().includes(q) ||
      (t.service_name || '').toLowerCase().includes(q) ||
      (t.staff_name || '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!form.customer_id || !form.test_date) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please select a client and test date', confirmButtonColor: '#f2421b' });
      return;
    }
    try {
      const res = await api.post('/patch-tests', form);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Patch Test Created!', text: 'The test has been scheduled successfully', timer: 2000, showConfirmButton: false });
        setShowModal(false);
        setForm({ customer_id: '', service_id: '', staff_id: '', branch_id: '', test_date: '', notes: '', valid_until: '' });
        fetchData();
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to create patch test', confirmButtonColor: '#f2421b' });
    }
  };

  const handleRecordResult = async () => {
    if (!showResult) return;
    try {
      const res = await api.post(`/patch-tests/${showResult.id}/result`, resultForm);
      if (res.success) {
        Swal.fire({
          icon: resultForm.result === 'pass' ? 'success' : 'warning',
          title: `Result: ${resultForm.result.charAt(0).toUpperCase() + resultForm.result.slice(1)}`,
          text: resultForm.result === 'pass' ? 'Client has passed the patch test!' : 'Test result has been recorded',
          timer: 2000, showConfirmButton: false
        });
        setShowResult(null);
        fetchData();
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to record result', confirmButtonColor: '#f2421b' });
    }
  };

  const openResultModal = (test) => {
    setShowResult(test);
    setResultForm({ result: 'pass', notes: test.notes || '', valid_until: '' });
  };

  const handleDelete = (test) => {
    Swal.fire({
      title: 'Cannot Delete',
      html: `<p style="margin:0;color:#666;">For complete removal, please contact support:</p><p style="margin:8px 0 0;"><strong>📧 info@trasealla.com</strong></p>`,
      icon: 'info',
      confirmButtonColor: '#f2421b',
      confirmButtonText: 'OK'
    });
  };

  const getClientName = (t) => `${t.customer_first_name || ''} ${t.customer_last_name || ''}`.trim() || 'Unknown';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="pt-page">
      {/* Header */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><ShieldCheck size={26} /></div>
          <div>
            <h1 className="module-hero-title">Patch Tests</h1>
            <p className="module-hero-sub">Track allergy & sensitivity tests before treatments</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" data-tooltip="Schedule patch test" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Patch Test
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="pt-stats-grid">
        <div className="pt-stat-card">
          <div className="pt-stat-icon" style={{ background: 'rgba(242,66,27,0.1)' }}>
            <Activity size={20} color="#f2421b" />
          </div>
          <div>
            <div className="pt-stat-value">{stats.total || 0}</div>
            <div className="pt-stat-label">Total Tests</div>
          </div>
        </div>
        <div className="pt-stat-card">
          <div className="pt-stat-icon" style={{ background: RESULT_CONFIG.pending.bg }}>
            <Clock size={20} color={RESULT_CONFIG.pending.color} />
          </div>
          <div>
            <div className="pt-stat-value" style={{ color: RESULT_CONFIG.pending.color }}>{stats.pending || 0}</div>
            <div className="pt-stat-label">Pending</div>
          </div>
        </div>
        <div className="pt-stat-card">
          <div className="pt-stat-icon" style={{ background: RESULT_CONFIG.pass.bg }}>
            <CheckCircle2 size={20} color={RESULT_CONFIG.pass.color} />
          </div>
          <div>
            <div className="pt-stat-value" style={{ color: RESULT_CONFIG.pass.color }}>{stats.passed || 0}</div>
            <div className="pt-stat-label">Passed</div>
          </div>
        </div>
        <div className="pt-stat-card">
          <div className="pt-stat-icon" style={{ background: RESULT_CONFIG.fail.bg }}>
            <AlertCircle size={20} color={RESULT_CONFIG.fail.color} />
          </div>
          <div>
            <div className="pt-stat-value" style={{ color: RESULT_CONFIG.fail.color }}>{stats.failed || 0}</div>
            <div className="pt-stat-label">Failed</div>
          </div>
        </div>
        <div className="pt-stat-card">
          <div className="pt-stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <ShieldCheck size={20} color="#3b82f6" />
          </div>
          <div>
            <div className="pt-stat-value" style={{ color: '#3b82f6' }}>{stats.currently_valid || 0}</div>
            <div className="pt-stat-label">Currently Valid</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="pt-toolbar">
        <div className="pt-search-wrap">
          <Search size={15} className="pt-search-icon" />
          <input
            type="text"
            placeholder="Search by client, service, or staff..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pt-search-input"
          />
        </div>
        <div className="pt-filter-wrap">
          <Filter size={14} />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="pt-filter-select">
            <option value="">All Results</option>
            <option value="pending">⏳ Pending</option>
            <option value="pass">✓ Pass</option>
            <option value="fail">✗ Fail</option>
            <option value="reaction">⚠ Reaction</option>
          </select>
        </div>
      </div>

      {/* Tests Table */}
      <div className="pt-table-wrap">
        {loading ? (
          <div className="pt-loading">
            <div className="pt-spinner" />
            <p>Loading patch tests...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="pt-empty">
            <ShieldCheck size={48} strokeWidth={1} />
            <h4>No patch tests found</h4>
            <p>Schedule a patch test to get started</p>
            <button className="pt-add-btn" data-tooltip="Schedule patch test" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Patch Test
            </button>
          </div>
        ) : (
          <table className="pt-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>SERVICE</th>
                <th>STAFF</th>
                <th>TEST DATE</th>
                <th>RESULT</th>
                <th>VALID UNTIL</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map(t => {
                const cfg = RESULT_CONFIG[t.result] || RESULT_CONFIG.pending;
                return (
                  <tr key={t.id} className={t.result === 'fail' || t.result === 'reaction' ? 'pt-row-warn' : ''}>
                    <td>
                      <div className="pt-client-cell">
                        <div className="pt-avatar">{(t.customer_first_name || '?')[0].toUpperCase()}</div>
                        <div>
                          <div className="pt-client-name">{getClientName(t)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="pt-service-tag">{t.service_name || '—'}</span></td>
                    <td>{t.staff_name || '—'}</td>
                    <td>{formatDate(t.test_date)}</td>
                    <td>
                      <span className="pt-result-badge" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td>{formatDate(t.valid_until)}</td>
                    <td>
                      <div className="pt-actions">
                        <button className="pt-action-btn view" onClick={() => setShowDetail(t)} title="View Details" data-tooltip="View details">
                          <Eye size={14} />
                        </button>
                        {t.result === 'pending' && (
                          <button className="pt-action-btn record" onClick={() => openResultModal(t)} title="Record Result" data-tooltip="Record result">
                            <Clipboard size={14} /> Record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══ Create Modal ═══ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="pt-modal-header">
          <Modal.Title><ShieldCheck size={18} /> New Patch Test</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-modal-body">
          <div className="pt-form-grid">
            <Form.Group>
              <Form.Label>Client <span className="text-danger">*</span></Form.Label>
              <Form.Select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Service</Form.Label>
              <Form.Select value={form.service_id} onChange={e => setForm(p => ({ ...p, service_id: e.target.value }))}>
                <option value="">Select service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Staff</Form.Label>
              <Form.Select value={form.staff_id} onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}>
                <option value="">Select staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Branch</Form.Label>
              <Form.Select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}>
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Test Date <span className="text-danger">*</span></Form.Label>
              <Form.Control type="datetime-local" value={form.test_date} onChange={e => setForm(p => ({ ...p, test_date: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Valid Until</Form.Label>
              <Form.Control type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </Form.Group>
            <Form.Group className="pt-full-width">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes about the test..." />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer className="pt-modal-footer">
          <button className="pt-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="pt-btn-primary" onClick={handleCreate}><Plus size={14} /> Schedule Test</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Record Result Modal ═══ */}
      <Modal show={!!showResult} onHide={() => setShowResult(null)} centered>
        <Modal.Header closeButton className="pt-modal-header">
          <Modal.Title><Clipboard size={18} /> Record Test Result</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-modal-body">
          <div className="pt-result-client-info">
            <div className="pt-avatar-lg">{(showResult?.customer_first_name || '?')[0].toUpperCase()}</div>
            <div>
              <strong>{showResult?.customer_first_name} {showResult?.customer_last_name}</strong>
              <span>{showResult?.service_name || 'No service specified'}</span>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Result <span className="text-danger">*</span></Form.Label>
            <div className="pt-result-options">
              {[
                { key: 'pass', label: 'Pass', icon: '✓', color: '#22c55e', bg: '#dcfce7' },
                { key: 'fail', label: 'Fail', icon: '✗', color: '#ef4444', bg: '#fee2e2' },
                { key: 'reaction', label: 'Reaction', icon: '⚠', color: '#dc2626', bg: '#fef2f2' },
              ].map(r => (
                <button key={r.key}
                  className={`pt-result-option ${resultForm.result === r.key ? 'active' : ''}`}
                  style={{ '--res-color': r.color, '--res-bg': r.bg }}
                  onClick={() => setResultForm(p => ({ ...p, result: r.key }))}>
                  <span className="pt-result-option-icon">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Valid Until</Form.Label>
            <Form.Control type="date" value={resultForm.valid_until}
              onChange={e => setResultForm(p => ({ ...p, valid_until: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={resultForm.notes}
              onChange={e => setResultForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Observations, reactions, or additional notes..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="pt-modal-footer">
          <button className="pt-btn-secondary" onClick={() => setShowResult(null)}>Cancel</button>
          <button className="pt-btn-primary" onClick={handleRecordResult}><Check size={14} /> Save Result</button>
        </Modal.Footer>
      </Modal>

      {/* ═══ Detail Modal ═══ */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} centered>
        <Modal.Header closeButton className="pt-modal-header">
          <Modal.Title><Eye size={18} /> Test Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-modal-body">
          {showDetail && (
            <div className="pt-detail">
              <div className="pt-detail-top">
                <div className="pt-avatar-lg">{(showDetail.customer_first_name || '?')[0].toUpperCase()}</div>
                <div>
                  <h5>{getClientName(showDetail)}</h5>
                  <span className="pt-result-badge" style={{ background: RESULT_CONFIG[showDetail.result]?.bg, color: RESULT_CONFIG[showDetail.result]?.color }}>
                    {RESULT_CONFIG[showDetail.result]?.icon} {RESULT_CONFIG[showDetail.result]?.label}
                  </span>
                </div>
              </div>
              <div className="pt-detail-grid">
                <div className="pt-detail-item">
                  <span className="pt-detail-label">Service</span>
                  <span className="pt-detail-value">{showDetail.service_name || '—'}</span>
                </div>
                <div className="pt-detail-item">
                  <span className="pt-detail-label">Staff</span>
                  <span className="pt-detail-value">{showDetail.staff_name || '—'}</span>
                </div>
                <div className="pt-detail-item">
                  <span className="pt-detail-label">Test Date</span>
                  <span className="pt-detail-value">{formatDate(showDetail.test_date)}</span>
                </div>
                <div className="pt-detail-item">
                  <span className="pt-detail-label">Valid Until</span>
                  <span className="pt-detail-value">{formatDate(showDetail.valid_until)}</span>
                </div>
              </div>
              {showDetail.notes && (
                <div className="pt-detail-notes">
                  <strong>Notes:</strong>
                  <p>{showDetail.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
