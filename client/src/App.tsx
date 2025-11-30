import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store, RootState, AppDispatch } from './app/store'
import { fetchCurrentUser } from './features/auth/authSlice'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './features/auth/Login'
import Register from './features/auth/Register'
import PageViewer from './features/wiki/PageViewer'
import PageEditor from './features/wiki/PageEditor'
import PageHistory from './features/wiki/PageHistory'
import PageCollaborators from './features/wiki/PageCollaborators'
import AdminPanel from './features/admin/AdminPanel'
import Search from './features/search/Search'
import HomePage from './features/home/HomePage'

const AppRoutes: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { token, user } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, user])

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/page/:pageId"
            element={
              <Layout>
                <PageViewer />
              </Layout>
            }
          />
          <Route
            path="/page/:pageId/edit"
            element={
              <Layout>
                <ProtectedRoute>
                  <PageEditor />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/page/:pageId/history"
            element={
              <Layout>
                <ProtectedRoute>
                  <PageHistory />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/page/:pageId/collaborators"
            element={
              <Layout>
                <ProtectedRoute>
                  <PageCollaborators />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/page/new"
            element={
              <Layout>
                <ProtectedRoute>
                  <PageEditor />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/search"
            element={
              <Layout>
                <Search />
              </Layout>
            }
          />
          <Route
            path="/admin"
            element={
              <Layout>
                <ProtectedRoute requireAdmin>
                  <AdminPanel />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  )
}

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  )
}

export default App