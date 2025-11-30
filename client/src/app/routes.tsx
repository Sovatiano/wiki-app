import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';

// Lazy loading for better performance
const Login = React.lazy(() => import('../features/auth/Login'));
const Register = React.lazy(() => import('../features/auth/Register'));
const PageViewer = React.lazy(() => import('../features/wiki/PageViewer'));
const PageEditor = React.lazy(() => import('../features/wiki/PageEditor'));
const PageHistory = React.lazy(() => import('../features/wiki/PageHistory'));
const PageCollaborators = React.lazy(() => import('../features/wiki/PageCollaborators'));
const AdminPanel = React.lazy(() => import('../features/admin/AdminPanel'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  return !user ? <>{children}</> : <Navigate to="/" />;
};

const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } />

        <Route path="/page/new" element={
          <ProtectedRoute>
            <PageEditor />
          </ProtectedRoute>
        } />

        <Route path="/page/:pageId/edit" element={
          <ProtectedRoute>
            <PageEditor />
          </ProtectedRoute>
        } />

        <Route path="/page/:pageId/history" element={
          <ProtectedRoute>
            <PageHistory />
          </ProtectedRoute>
        } />

        <Route path="/page/:pageId/collaborators" element={
          <ProtectedRoute>
            <PageCollaborators />
          </ProtectedRoute>
        } />

        {/* Public pages */}
        <Route path="/page/:pageId" element={<PageViewer />} />
        <Route path="/" element={<PageViewer />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;