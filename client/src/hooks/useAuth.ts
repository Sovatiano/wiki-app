import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

export const useAuth = () => {
  const { user, loading, error } = useSelector((state: RootState) => state.auth);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    error,
    isAdmin: user?.role === 'admin'
  };
};