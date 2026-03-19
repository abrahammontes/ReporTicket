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
import { translations } from './translations';
import { dbService } from './services/db';

function App() {
  const initialUser = dbService.getSession();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [view, setView] = useState(initialUser ? 'dashboard' : 'landing');
  const [language, setLanguage] = useState(initialUser?.preferences?.language || 'es');
  const [theme, setTheme] = useState(initialUser?.preferences?.theme || 'dark');
  const [tickets, setTickets] = useState(dbService.getTickets() || []);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userRole, setUserRole] = useState(initialUser?.role || 'customer');
  const [authError, setAuthError] = useState(null);

  const t = (key) => (translations[language] && translations[language][key]) || key;

  const handleViewChange = (newView) => {
    setAuthError(null);
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
    const currentTickets = tickets || [];
    const s = {
      open: currentTickets.filter(t => t.status !== 'closed').length,
      overdue: currentTickets.filter(t => t.status === 'old').length,
      unassigned: currentTickets.filter(t => !t.agent).length,
      closed: currentTickets.filter(t => t.status === 'closed').length
    };
    setStats(s);
  }, [tickets]);

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

  const handleLogin = (email, password) => {
    setAuthError(null);
    const user = dbService.findUser(email, password);
    if (user) {
      setCurrentUser(user);
      setUserRole(user.role);
      setTheme(user.preferences.theme);
      setLanguage(user.preferences.language);
      dbService.setSession(user);
      setView('dashboard');
    } else {
      setAuthError(t('errorInvalidCredentials'));
    }
  };

  const handleRegister = (userData) => {
    setAuthError(null);
    try {
      const user = dbService.registerUser(userData);
      setCurrentUser(user);
      setUserRole(user.role);
      dbService.setSession(user);
      setView('dashboard');
    } catch (err) {
      if (err.message === 'user_exists') {
        setAuthError(t('errorUserExists'));
      } else {
        setAuthError('Error during registration');
      }
    }
  };


  const renderView = () => {
    // Non-layout views
    if (view === 'landing') return <Landing onGetStarted={() => handleViewChange('register')} onLogin={() => handleViewChange('login')} theme={theme} t={t} />;
    if (view === 'register') return <Register onLogin={handleRegister} onBack={() => handleViewChange('landing')} t={t} error={authError} />;
    if (view === 'login') return <Login onLogin={handleLogin} onRegister={() => handleViewChange('register')} onBack={() => handleViewChange('landing')} theme={theme} t={t} error={authError} />;

    // Layout views
    let content;
    if (view === 'dashboard') {
      content = <Dashboard stats={stats} t={t} tickets={tickets} onSelectTicket={handleTicketClick} />;
    } else if (view === 'tickets') {
      content = <AdminPanel stats={stats} t={t} tickets={tickets} onSelectTicket={handleTicketClick} />;
    } else if (view === 'detail') {
      content = <TicketDetail ticket={selectedTicket} onBack={() => handleViewChange('tickets')} t={t} onUpdate={() => setTickets(dbService.getTickets())} userRole={userRole} user={currentUser} />;
    } else if (view === 'new') {
      content = <NewTicket onCancel={() => handleViewChange('dashboard')} onSubmit={() => handleViewChange('dashboard')} t={t} />;
    } else if (view === 'profile') {
      content = <Profile user={currentUser} t={t} onUpdate={setCurrentUser} />;
    } else if (view === 'user-guide') {
      content = <UserGuide t={t} language={language} />;
    } else {
      content = <Dashboard stats={stats} t={t} tickets={tickets} onSelectTicket={handleTicketClick} />;
    }

    return (
      <Layout
        currentView={view}
        setView={handleViewChange}
        onCreateTicket={() => handleViewChange('new')}
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
