import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../app/store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
}) => {
  const { user, token } = useSelector((state: RootState) => state.auth)

  if (requireAuth && !token) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

