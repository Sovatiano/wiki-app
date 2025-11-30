import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{
          flex: 1,
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          overflowY: 'auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout