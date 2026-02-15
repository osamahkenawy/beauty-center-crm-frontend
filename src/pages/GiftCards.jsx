import { useState } from 'react';
import './GiftCards.css';

// Mock data
const mockGiftCards = [
  { id: 'GC001', code: 'BEAUTY2026', amount: 500, balance: 350, purchaser: 'Sara Ahmed', recipient: 'Layla Omar', status: 'active', createdAt: '2026-01-15', expiresAt: '2027-01-15' },
  { id: 'GC002', code: 'GLAM500', amount: 500, balance: 0, purchaser: 'Noor Ali', recipient: 'Fatima Hassan', status: 'redeemed', createdAt: '2025-12-20', expiresAt: '2026-12-20' },
  { id: 'GC003', code: 'SPA1000', amount: 1000, balance: 1000, purchaser: 'Maryam Khan', recipient: 'Hala Said', status: 'active', createdAt: '2026-02-01', expiresAt: '2027-02-01' },
  { id: 'GC004', code: 'TREAT250', amount: 250, balance: 250, purchaser: 'Rania Yusuf', recipient: 'Dana Ali', status: 'expired', createdAt: '2025-01-10', expiresAt: '2026-01-10' },
];

const templates = [
  { id: 1, name: 'Classic', color: '#E91E63', icon: '🎁' },
  { id: 2, name: 'Spa Day', color: '#9C27B0', icon: '🧖' },
  { id: 3, name: 'Birthday', color: '#FF9800', icon: '🎂' },
  { id: 4, name: 'Thank You', color: '#4CAF50', icon: '💐' },
];

export default function GiftCards() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

  const filteredCards = mockGiftCards.filter(card => {
    if (filter === 'all') return true;
    return card.status === filter;
  });

  const totalValue = mockGiftCards.reduce((sum, c) => sum + c.amount, 0);
  const totalBalance = mockGiftCards.reduce((sum, c) => sum + c.balance, 0);
  const activeCards = mockGiftCards.filter(c => c.status === 'active').length;

  const getStatusBadge = (status) => {
    const classes = {
      active: 'badge-success',
      redeemed: 'badge-info',
      expired: 'badge-danger'
    };
    return `status-badge ${classes[status] || 'badge-secondary'}`;
  };

  return (
    <div className="gift-cards-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Gift Cards</h2>
          <p>Manage and sell gift cards</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          ➕ Create Gift Card
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon purple">🎁</div>
          <div className="stat-content">
            <span className="stat-value">{mockGiftCards.length}</span>
            <span className="stat-label">Total Cards</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div className="stat-content">
            <span className="stat-value">{activeCards}</span>
            <span className="stat-label">Active Cards</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-content">
            <span className="stat-value">{totalValue} SAR</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">💳</div>
          <div className="stat-content">
            <span className="stat-value">{totalBalance} SAR</span>
            <span className="stat-label">Outstanding Balance</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="filter-tabs">
          {['all', 'active', 'redeemed', 'expired'].map(f => (
            <button 
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Gift Cards Grid */}
      <div className="cards-grid">
        {filteredCards.map(card => (
          <div key={card.id} className={`gift-card-item ${card.status}`}>
            <div className="card-design" style={{ background: `linear-gradient(135deg, #E91E63, #9C27B0)` }}>
              <div className="card-logo">💇 Glamour Beauty</div>
              <div className="card-amount">{card.amount} SAR</div>
              <div className="card-code">{card.code}</div>
            </div>
            <div className="card-details">
              <div className="detail-row">
                <span>Balance:</span>
                <strong>{card.balance} SAR</strong>
              </div>
              <div className="detail-row">
                <span>Recipient:</span>
                <span>{card.recipient}</span>
              </div>
              <div className="detail-row">
                <span>Expires:</span>
                <span>{card.expiresAt}</span>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <span className={getStatusBadge(card.status)}>{card.status}</span>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-action">View</button>
              <button className="btn-action">Resend</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Gift Card</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Template</label>
                <div className="template-grid">
                  {templates.map(t => (
                    <div 
                      key={t.id}
                      className={`template-option ${selectedTemplate.id === t.id ? 'selected' : ''}`}
                      style={{ borderColor: selectedTemplate.id === t.id ? t.color : 'transparent' }}
                      onClick={() => setSelectedTemplate(t)}
                    >
                      <div className="template-preview" style={{ background: `linear-gradient(135deg, ${t.color}, #9C27B0)` }}>
                        <span className="template-icon">{t.icon}</span>
                      </div>
                      <span className="template-name">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (SAR)</label>
                  <select defaultValue="500">
                    <option value="100">100 SAR</option>
                    <option value="250">250 SAR</option>
                    <option value="500">500 SAR</option>
                    <option value="1000">1000 SAR</option>
                    <option value="custom">Custom Amount</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Validity</label>
                  <select defaultValue="12">
                    <option value="6">6 Months</option>
                    <option value="12">1 Year</option>
                    <option value="24">2 Years</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Recipient Name</label>
                <input type="text" placeholder="Enter recipient name" />
              </div>
              <div className="form-group">
                <label>Recipient Email</label>
                <input type="email" placeholder="Enter recipient email" />
              </div>
              <div className="form-group">
                <label>Personal Message (Optional)</label>
                <textarea rows={3} placeholder="Add a personal message..."></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-create-card">Create & Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
