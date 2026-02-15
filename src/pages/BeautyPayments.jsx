import { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import './BeautyPayments.css';

// Mock data for payments
const mockPayments = [
  { id: 1, client: 'Sarah Ahmed', service: 'Hair Treatment', amount: 450, date: '2026-02-14', status: 'completed', method: 'Card' },
  { id: 2, client: 'Fatima Hassan', service: 'Facial', amount: 300, date: '2026-02-14', status: 'completed', method: 'Cash' },
  { id: 3, client: 'Layla Omar', service: 'Manicure & Pedicure', amount: 180, date: '2026-02-14', status: 'pending', method: 'Card' },
  { id: 4, client: 'Noor Ali', service: 'Full Package', amount: 850, date: '2026-02-13', status: 'completed', method: 'Card' },
  { id: 5, client: 'Maryam Khan', service: 'Hair Color', amount: 550, date: '2026-02-13', status: 'refunded', method: 'Cash' },
];

export default function BeautyPayments() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = mockPayments.filter(payment => {
    const matchesFilter = filter === 'all' || payment.status === filter;
    const matchesSearch = payment.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.service.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalRevenue = mockPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = mockPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusBadge = (status) => {
    const classes = {
      completed: 'badge-success',
      pending: 'badge-warning',
      refunded: 'badge-danger'
    };
    return `status-badge ${classes[status] || 'badge-secondary'}`;
  };

  return (
    <div className="beauty-payments-page">
      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon revenue">💰</div>
          <div className="stat-content">
            <span className="stat-value">{totalRevenue} SAR</span>
            <span className="stat-label">Today's Revenue</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{pendingAmount} SAR</span>
            <span className="stat-label">Pending Payments</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon transactions">📊</div>
          <div className="stat-content">
            <span className="stat-value">{mockPayments.length}</span>
            <span className="stat-label">Total Transactions</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="payments-header">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by client or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-tab ${filter === 'refunded' ? 'active' : ''}`}
            onClick={() => setFilter('refunded')}
          >
            Refunded
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="payments-card">
        <div className="card-header">
          <h3>Recent Transactions</h3>
          <button className="btn-export">📥 Export</button>
        </div>
        <div className="table-responsive">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id}>
                  <td>
                    <div className="client-info">
                      <span className="client-avatar">{payment.client.charAt(0)}</span>
                      <span>{payment.client}</span>
                    </div>
                  </td>
                  <td>{payment.service}</td>
                  <td className="amount">{payment.amount} SAR</td>
                  <td>{payment.date}</td>
                  <td>
                    <span className="method-badge">{payment.method}</span>
                  </td>
                  <td>
                    <span className={getStatusBadge(payment.status)}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action view" title="View">👁️</button>
                      <button className="btn-action print" title="Print">🖨️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
