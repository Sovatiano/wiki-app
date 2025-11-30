import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api as axiosApi } from '../../utils/api';
import './AdminPanel.css';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axiosApi.get('/users/admin/users');
      setUsers(response.data);
    } catch (err: any) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to block this user?')) {
      return;
    }

    setActionLoading(userId);
    try {
      await axiosApi.put(`/users/admin/users/${userId}/block`);
      await fetchUsers();
    } catch (err: any) {
      setError('Failed to block user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateUser = async (userId: number) => {
    setActionLoading(userId);
    try {
      await axiosApi.put(`/users/admin/users/${userId}/unblock`);
      await fetchUsers();
    } catch (err: any) {
      setError('Failed to activate user');
    } finally {
      setActionLoading(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-panel">
        <div className="error">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading"><Spinner size="large" />Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'users' && (
        <div className="users-section">
          <h2>User Management</h2>
          <div className="users-table">
            <div className="table-header">
              <div>Username</div>
              <div>Email</div>
              <div>Role</div>
              <div>Status</div>
              <div>Joined</div>
              <div>Actions</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <div>{user.username}</div>
                <div>{user.email}</div>
                <div>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <span className={`status-badge ${user.is_active ? 'active' : 'blocked'}`}>
                    {user.is_active ? 'Active' : 'Blocked'}
                  </span>
                </div>
                <div>{new Date(user.created_at).toLocaleDateString()}</div>
                <div className="action-buttons">
                  {user.is_active ? (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleBlockUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? <Spinner size="small" /> : 'Block'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleActivateUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? <Spinner size="small" /> : 'Activate'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="stats-section">
          <h2>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-number">{users.length}</p>
            </div>
            <div className="stat-card">
              <h3>Active Users</h3>
              <p className="stat-number">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
            <div className="stat-card">
              <h3>Admins</h3>
              <p className="stat-number">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;