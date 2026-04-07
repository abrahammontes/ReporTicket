import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TicketDetail from './components/TicketDetail';
import NewTicket from './components/NewTicket';
import Landing from './components/Landing';
import Register from './components/Register';
import Login from './components/Login';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import UserGuide from './components/UserGuide';
import ResetPassword from './components/ResetPassword';
import { translations } from './translations';
import { dbService } from './services/db';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('landing');
  const [language, setLanguage] = useState('es');
  const [theme, setTheme] = useState('dark');
  const [allTickets, setAllTickets] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userRole, setUserRole] = useState('customer');
  const [isLoaded, setIsLoaded] = useState(false);


  // Initialize session
  useEffect(() => {
    // Check for password reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
      setView('resetPassword');
      setIsLoaded(true);
      return;
    }

    const session = dbService.getSession();
    if (session) {
      setCurrentUser(session);
      setUserRole(session.role);
      setLanguage(session.preferences?.language || 'es');
      setTheme(session.preferences?.theme || 'dark');
      setView('dashboard');
    }
    setIsLoaded(true);
  }, []);

  // Fetch tickets when user changes
  useEffect(() => {
    if (currentUser) {
      dbService.getTickets().then(setAllTickets).catch(console.error);
      dbService.getUsers().then(setAllUsers).catch(console.error);
      

    }
  }, [currentUser]);
  
  const visibleTickets = React.useMemo(() => {
    return allTickets || [];
  }, [allTickets]);
  const [authError, setAuthError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const t = (key) => (translations[language] && translations[language][key]) || key;

   const handleViewChange = (newView) => {
     setAuthError(null);
     // Only clear successMsg if we're NOT navigating to login from register
     // (to preserve registration success message)
     if (!(view === 'register' && newView === 'login')) {
       setSuccessMsg(null);
     }
     setView(newView);
   };

  const [stats, setStats] = useState({
    open: 0,
    overdue: 0,
    unassigned: 0,
    closed: 0
  });

  // Calculate real stats from tickets
  useEffect(() => {
    const currentTickets = visibleTickets || [];
    const s = {
      open: currentTickets.filter(t => t.status !== 'closed').length,
      overdue: currentTickets.filter(t => t.status === 'old').length,
      unassigned: currentTickets.filter(t => !t.agentId).length,
      closed: currentTickets.filter(t => t.status === 'closed').length
    };
    setStats(s);
  }, [visibleTickets]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (currentUser) {
      dbService.updateUserProfile(currentUser.id, { preferences: { theme, language } });
    }
  }, [theme, language, currentUser]);

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const handleLogin = async (email, password) => {
    setAuthError(null);
    try {
      const user = await dbService.login(email, password);
      if (user) {
        setCurrentUser(user);
        setUserRole(user.role);
        setTheme(user.preferences?.theme || 'dark');
        setLanguage(user.preferences?.language || 'es');
        dbService.setSession(user);
        setView('dashboard');
      }
    } catch (err) {
      setAuthError(t(err.message) || t('errorInvalidCredentials'));
    }
  };

  const handleRegister = async (userData) => {
    setAuthError(null);
    try {
      const result = await dbService.publicRegister(userData);
      setSuccessMsg(t('registrationSuccessPending'));
      handleViewChange('login');
    } catch (err) {
      setAuthError(t(err.message) || err.message);
    }
  };


  const renderView = () => {
    // Non-layout views
    const isPublicView = ['landing', 'register', 'login', 'resetPassword'].includes(view);
    
    let publicContent = null;
    if (view === 'landing') publicContent = <Landing onGetStarted={() => handleViewChange('register')} onLogin={() => handleViewChange('login')} theme={theme} setTheme={setTheme} t={t} language={language} setLanguage={setLanguage} />;
    if (view === 'register') publicContent = <Register onRegister={handleRegister} onLogin={() => handleViewChange('login')} onBack={() => handleViewChange('landing')} t={t} error={authError} language={language} setLanguage={setLanguage} />;
    if (view === 'login') publicContent = <Login onLogin={handleLogin} onRegister={() => handleViewChange('register')} onBack={() => handleViewChange('landing')} theme={theme} t={t} error={authError} successMsg={successMsg} language={language} setLanguage={setLanguage} />;
    if (view === 'resetPassword') publicContent = <ResetPassword theme={theme} t={t} onBack={() => handleViewChange('login')} language={language} setLanguage={setLanguage} />;

    if (isPublicView) {
      return (
        <div className="public-wrapper" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
          {/* Global YouTube Background */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            pointerEvents: 'none',
            overflow: 'hidden',
            background: 'black'
          }}>
            <iframe
              src="https://www.youtube.com/embed/TqRjQswjWCs?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&autohide=1&playlist=TqRjQswjWCs&background=1&playsinline=1&rel=0&vq=small"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '177.77vh',
                height: '100vh',
                minWidth: '100vw',
                minHeight: '56.25vw',
                transform: 'translate(-50%, -50%) scale(1.1)',
                opacity: theme === 'light' ? 0.65 : 0.4,
                filter: theme === 'light' ? 'blur(4px) brightness(1.05)' : 'blur(8px) brightness(0.8)',
                pointerEvents: 'none'
              }}
            ></iframe>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'var(--public-overlay)',
              backdropFilter: 'blur(1px)', // subtle bokeh micro-texture
              zIndex: 1
            }}></div>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {publicContent}
          </div>
        </div>
      );
    }

    // Layout views
    let content;
    if (view === 'dashboard') {
      content = <Dashboard stats={stats} t={t} tickets={visibleTickets} onSelectTicket={handleTicketClick} />;
    } else if (view === 'tickets') {
      content = <AdminPanel stats={stats} t={t} tickets={visibleTickets} onSelectTicket={handleTicketClick} user={currentUser} activeTab="tickets" />;
    } else if (view === 'usersAndCompanies') {
      content = <AdminPanel stats={stats} t={t} tickets={visibleTickets} onSelectTicket={handleTicketClick} user={currentUser} activeTab="users" />;
    } else if (view === 'settings') {
      content = <AdminPanel stats={stats} t={t} tickets={visibleTickets} user={currentUser} activeTab="settings" />;
    } else if (view === 'detail') {
      content = <TicketDetail ticket={selectedTicket} onBack={() => handleViewChange('tickets')} t={t} onUpdate={() => dbService.getTickets().then(setAllTickets)} userRole={userRole} user={currentUser} />;
    } else if (view === 'new') {
      const handleNewTicket = async (ticketData) => {
        await dbService.addTicket(ticketData, currentUser?.name || 'User');
        const updated = await dbService.getTickets();
        setAllTickets(updated);
        handleViewChange('dashboard');
      };
      content = <NewTicket onCancel={() => handleViewChange('dashboard')} onSubmit={handleNewTicket} t={t} user={currentUser} />;
    } else if (view === 'profile') {
      content = <Profile user={currentUser} t={t} onUpdate={setCurrentUser} />;
    } else if (view === 'user-guide') {
      content = <UserGuide t={t} language={language} />;
    } else {
      content = <Dashboard stats={stats} t={t} tickets={visibleTickets} onSelectTicket={handleTicketClick} />;
    }

    return (
      <Layout
        currentView={view}
        setView={handleViewChange}
        onCreateTicket={() => {
          if ((currentUser?.status === 'active' || currentUser?.role === 'superadmin') && (currentUser?.companyId || currentUser?.role === 'superadmin')) {
            handleViewChange('new');
          } else {
            alert(t('accountPendingOrNoCompany'));
          }
        }}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        userRole={userRole}
        setUserRole={setUserRole}
        user={currentUser}

        onLogout={() => { dbService.setSession(null); setCurrentUser(null); handleViewChange('landing'); }}
        t={t}
      >
        {content}
      </Layout>
    );
  };

  // Custom cursor element
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });

  // Update cursor position on mouse move
  useEffect(() => {
    const moveHandler = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', moveHandler);
    return () => window.removeEventListener('mousemove', moveHandler);
  }, []);

  // Add hover class for interactive elements
  useEffect(() => {
    const interactiveSelector = 'button, a, .nav-link-btn, .card-hover, .glass-panel, .btn-primary';
    const addHover = () => document.body.classList.add('cursor-hover');
    const removeHover = () => document.body.classList.remove('cursor-hover');
    const elements = document.querySelectorAll(interactiveSelector);
    elements.forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', removeHover);
    });
    return () => {
      elements.forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', removeHover);
      });
    };
  }, []);

  return (
    <div className="app-root">
      {/* Custom cursor */}
      <div className="custom-cursor" style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />
      {renderView()}
    </div>
  );
}

export default App;
