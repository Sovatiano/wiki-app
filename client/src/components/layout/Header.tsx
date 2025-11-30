import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { RootState, AppDispatch } from '../../app/store';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #dee2e6',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '0 2rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '60px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          margin: 0,
          color: '#667eea',
          cursor: 'pointer'
        }} onClick={() => navigate('/')}>
          WikiApp
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/search')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#667eea',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Search
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #667eea',
                    color: '#667eea',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Admin
                </button>
              )}
              <span style={{ fontSize: '0.875rem' }}>Hello, {user.username}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: '1px solid #667eea',
                  color: '#667eea',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;