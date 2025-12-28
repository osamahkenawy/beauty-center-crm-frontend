import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User, Search, Plus, Eye, EditPencil, Trash,
  CheckCircle, Xmark, Mail, Phone, Building, Refresh
} from 'iconoir-react';
import './SuperAdmin.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const SuperAdminUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchTenants();
    fetchUsers();
  }, [selectedTenant]);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${API_BASE_URL}/super-admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('superAdminToken');
      
      // Fetch users from all tenants
      let allUsers = [];
      for (const tenant of tenants) {
        if (selectedTenant && tenant.id !== parseInt(selectedTenant)) continue;
        
        const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${tenant.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const usersWithTenant = (data.users || []).map(user => ({
            ...user,
            tenant_name: tenant.name,
            tenant_id: tenant.id
          }));
          allUsers = [...allUsers, ...usersWithTenant];
        }
      }
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.tenant_name?.toLowerCase().includes(search)
    );
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'primary';
      case 'manager': return 'info';
      case 'staff': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Platform Users</h1>
          <p>Manage all users across tenants</p>
        </div>
        <button className="sa-primary-btn" onClick={fetchUsers}>
          <Refresh size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-icon primary">
            <User size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{users.filter(u => u.is_active).length}</h3>
            <p>Active Users</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon warning">
            <Building size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{tenants.length}</h3>
            <p>Tenants</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon info">
            <User size={24} />
          </div>
          <div className="sa-stat-content">
            <h3>{users.filter(u => u.role === 'admin').length}</h3>
            <p>Admins</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sa-filters">
        <div className="sa-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
          className="sa-filter-select"
        >
          <option value="">All Tenants</option>
          {tenants.map(tenant => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="sa-card">
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Tenant</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="sa-loading-row">
                    <div className="loading-spinner"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sa-empty-row">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={`${user.tenant_id}-${user.id}`}>
                    <td>
                      <div className="sa-user-cell">
                        <div className="sa-user-avatar">
                          {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="sa-user-name-cell">{user.full_name || user.username}</span>
                          <span className="sa-user-email-cell">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sa-tenant-badge">{user.tenant_name}</span>
                    </td>
                    <td>
                      <span className={`sa-role-badge ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`sa-status-badge ${user.is_active ? 'success' : 'danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString() 
                        : 'Never'}
                    </td>
                    <td>
                      <div className="sa-actions">
                        <button className="sa-action-btn" title="View Details">
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUsers;


