import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, fetchCurrentUser } from './authSlice';
import { RootState, AppDispatch } from '../../app/store';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import './Auth.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login({ username, password })).unwrap();
      // Fetch user data after login
      await dispatch(fetchCurrentUser()).unwrap();
      // Invalidate pages cache to refresh data after login
      dispatch(api.util.invalidateTags(['Pages']));
      navigate('/');
    } catch (error) {
      // Error handled by slice
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Login to WikiApp</h2>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-message">{error}</div>}
          <Button type="submit" disabled={loading} className="auth-button">
            {loading ? <Spinner size="small" /> : 'Login'}
          </Button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;