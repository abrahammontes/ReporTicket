import React, { useState } from 'react';
import Logo from './Logo';

const Layout = ({ children, currentView, setView, onCreateTicket, language, setLanguage, theme, setTheme, userRole, setUserRole, user, onLogout, t, dbHealth }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="layout-root" data-theme={theme}>
      {/* Mobile Hamburger Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ 
          position: 'fixed', 
          top: '1rem', 
          left: '1rem', 
          zIndex: 1000, 
          background: 'var(--primary)', 
          border: 'none', 
          color: 'white', 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          display: 'none', // Overwritten by media query or inline check
          alignItems: 'center', 
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}
        className="mobile-toggle"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" onClick={() => { setView('landing'); setIsSidebarOpen(false); }} style={{ 
          cursor: 'pointer', 
          textAlign: 'left', 
          marginBottom: '2.5rem',
          padding: '0 0.5rem'
        }}>
          <Logo theme={theme} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          <button 
            onClick={() => { setLanguage(language === 'en' ? 'es' : 'en'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              borderRadius: '0.5rem', 
              background: 'var(--bg-hover)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            {language === 'en' ? 'English' : 'Español'}
          </button>
          
          <button 
            onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              borderRadius: '0.5rem', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
            {theme === 'dark' ? t('lightMode') : t('darkMode')}
          </button>
        </div>

        <nav style={{ padding: '0 0.5rem' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>
              <button 
                onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} 
                className={`nav-link-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                {t('dashboard')}
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setView('tickets'); setIsSidebarOpen(false); }} 
                className={`nav-link-btn ${currentView === 'tickets' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                {t('tickets')}
              </button>
            </li>
            
            {(userRole?.toLowerCase().includes('admin') || userRole?.toLowerCase().includes('super') || 
              user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('super') || 
              user?.permissions?.manageUsers) && (
              <li>
                <button 
                  onClick={() => { setView('usersAndCompanies'); setIsSidebarOpen(false); }} 
                  className={`nav-link-btn ${currentView === 'usersAndCompanies' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  {t('usersAndCompanies') || 'Usuarios y Empresas'}
                </button>
              </li>
            )}

            {(user?.id) && ( // MODO DEBUG: Acceso habilitado temporalmente
              <li>
                <button 
                  onClick={() => { console.log('Navigating to settings. Roles:', userRole, user?.role); setView('settings'); setIsSidebarOpen(false); }} 
                  className={`nav-link-btn ${currentView === 'settings' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  {t('settings')}
                </button>
              </li>
            )}
            <li>
              <button 
                onClick={() => { setView('profile'); setIsSidebarOpen(false); }} 
                className={`nav-link-btn ${currentView === 'profile' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                {t('profile')}
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setView('user-guide'); setIsSidebarOpen(false); }} 
                className={`nav-link-btn ${currentView === 'user-guide' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                {t('userGuide')}
              </button>
            </li>
          </ul>
        </nav>
        
        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Database status indicator removed as per user request */}
          <div className="glass-panel" style={{ 
            padding: '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              minWidth: '36px', 
              borderRadius: '50%', 
              background: user?.photo ? `url(${user.photo}) center/cover` : 'linear-gradient(45deg, var(--primary), var(--secondary))',
              border: '2px solid var(--border-color)'
            }}></div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0, wordBreak: 'break-word' }}>
                  {user?.name || t('adminAgent')}
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.7rem', 
                  color: 'var(--text-muted)',
                  lineHeight: '1.2'
                }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{t(`roles.${user?.role || 'customer'}`)} ({userRole || user?.role || 'N/A'})</span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span style={{ opacity: 0.7, fontSize: '0.65rem', wordBreak: 'break-all' }}>{user?.email || 'No Email'}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onLogout}
              className="logout-btn"
              style={{ 
                width: '100%',
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#ef4444', 
                cursor: 'pointer', 
                fontSize: '0.8rem', 
                padding: '0.6rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>
      
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>
              {t(currentView)}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(currentView + 'Desc')}</p>
          </div>
          <button className="btn-primary" onClick={onCreateTicket}>+ {t('createTicket')}</button>
        </header>
        {children}
      </main>

      <style>{`
        .nav-link-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 0.75rem;
          transition: all 0.2s ease;
        }
        .nav-link-btn:hover {
          color: var(--text-main);
          background: rgba(120, 120, 120, 0.05);
        }
        .nav-link-btn.active {
          color: white;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .layout-root {
          display: flex;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
};

export default Layout;
