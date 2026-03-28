import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';

const AdminPanel = ({ stats, t, tickets, onSelectTicket, user, activeTab = 'tickets' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [companySuccessMessage, setCompanySuccessMessage] = useState('');
  const [systemInfo, setSystemInfo] = useState({ dbMode: 'single', dbHost: 'localhost', dbPrefix: '', version: '1.2.0' });

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editCompanyName, setEditCompanyName] = useState('');

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: '' });
  const [permissionsModalUser, setPermissionsModalUser] = useState(null);

  const [settingsForm, setSettingsForm] = useState({
    smtpHost: '',
    smtpPort: '465',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: true
  });
  const [testConnectionStatus, setTestConnectionStatus] = useState(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  const [dbConfigForm, setDbConfigForm] = useState({
    host: '',
    user: '',
    password: '',
    database: '',
    mode: 'single'
  });
  const [dbTestStatus, setDbTestStatus] = useState(null);
  const [showDbPass, setShowDbPass] = useState(false);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      dbService.getUsers().then(data => {
        // Map company_id to companyId for frontend consistency
        setUsers(data.map(u => ({ ...u, companyId: u.company_id })));
      });
      dbService.getCompanies().then(setCompanies);
      dbService.getSystemInfo().then(info => {
        setSystemInfo(info);
        setDbConfigForm(prev => ({
          ...prev,
          host: info.dbHost || 'localhost',
          mode: info.dbMode || 'single',
          database: info.dbPrefix ? info.dbPrefix + 'reporticket_master' : 'reporticket_master',
          user: info.dbUser || 'root'
        }));
      });
      // Load SMTP Settings
      dbService.getSystemSettings().then(settings => {
        if (settings.smtpConfig) {
          setSettingsForm(settings.smtpConfig);
        }
      });
    }
  }, [user]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      alert(t('fillAllFields') || 'Por favor completa todos los campos');
      return;
    }
    try {
      await dbService.registerCompany(newCompanyName.trim(), {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword.trim()
      });
      const updated = await dbService.getCompanies();
      setCompanies(updated);
      await fetchUsers();
      setNewCompanyName('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setCompanySuccessMessage(t('companyCreatedMsg'));
      setTimeout(() => setCompanySuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error creating company:', err);
      alert(err.message);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminPassword(password);
    setShowNewAdminPass(true);
  };

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    setTestConnectionStatus('testing');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settingsForm,
          testEmail
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestConnectionStatus('success');
        setTimeout(() => setTestConnectionStatus(null), 4000);
      } else {
        setTestConnectionStatus('error');
        console.error('SMTP Test Error:', data.message);
        setTimeout(() => setTestConnectionStatus(null), 5000);
      }
    } catch (error) {
      setTestConnectionStatus('error');
      console.error('Fetch Error:', error);
      setTimeout(() => setTestConnectionStatus(null), 5000);
    }
  };

  const handlePersistSmtp = async () => {
    try {
      const result = await dbService.updateSystemSettings(settingsForm);
      if (result.success) {
        alert(t('changesSaved'));
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Error saving SMTP settings');
    }
  };

  const handleDBTest = async (e) => {
    e.preventDefault();
    setDbTestStatus('testing');
    try {
      const data = await dbService.testDatabaseConnection(dbConfigForm);
      if (data.success) {
        setDbTestStatus('success');
      } else {
        setDbTestStatus('error');
      }
    } catch (err) {
      setDbTestStatus('error');
    }
    setTimeout(() => setDbTestStatus(null), 5000);
  };

  const handleDBSave = async (e) => {
    e.preventDefault();
    if (!window.confirm('¿Cambiar la base de datos maestra? El servidor se reiniciará.')) return;
    try {
      const data = await dbService.updateDatabaseSettings(dbConfigForm);
      if (data.success) {
        alert(t('changesSaved'));
        window.location.reload();
      }
    } catch (err) {
      alert('Error saving DB configuration');
    }
  };

  // Removed handleUpdateUserCompany as it's now part of the edit save flow

  const handleEditCompanyStart = (company) => {
    setEditingCompanyId(company.id);
    setEditCompanyName(company.name);
  };

  const handleEditCompanySave = async (companyId) => {
    if (editCompanyName.trim()) {
      await dbService.updateCompany(companyId, { name: editCompanyName.trim() });
      const updated = await dbService.getCompanies();
      setCompanies(updated);
    }
    setEditingCompanyId(null);
  };

  const handleDeleteCompany = async (companyId) => {
    if (window.confirm(t('confirmDeleteCompany'))) {
      await dbService.deleteCompany(companyId);
      const updatedCompanies = await dbService.getCompanies();
      const updatedUsers = await dbService.getUsers();
      setCompanies(updatedCompanies);
      setUsers(updatedUsers);
    }
  };

  const handleEditUserStart = (u) => {
    setEditingUserId(u.id);
    setEditUserForm({ name: u.name, role: u.role, companyId: u.companyId || '' });
  };

  const handleEditUserSave = async (userId) => {
    if (editUserForm.name.trim()) {
      await dbService.updateUserProfile(userId, { 
        name: editUserForm.name.trim(), 
        role: editUserForm.role,
        companyId: editUserForm.companyId
      });
      const data = await dbService.getUsers();
      setUsers(data.map(u => ({ ...u, companyId: u.company_id })));
    }
    setEditingUserId(null);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm(t('confirmDeleteUser'))) {
      await dbService.deleteUser(userId);
      const updated = await dbService.getUsers();
      setUsers(updated);
    }
  };

  const handleOpenPermissions = (userToEdit) => {
    setPermissionsModalUser({
      ...userToEdit,
      permissions: userToEdit.permissions || {
        viewAllTickets: false,
        assignTickets: false,
        manageUsers: false,
        manageCompanies: false
      }
    });
  };

  const handleSavePermissions = async () => {
    await dbService.updateUserProfile(permissionsModalUser.id, { permissions: permissionsModalUser.permissions });
    const updated = await dbService.getUsers();
    setUsers(updated);
    setPermissionsModalUser(null);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ticket.id.includes(searchTerm) || 
                         ticket.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesArea = filterArea === 'all' || ticket.department === filterArea;
    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="admin-panel">
      {activeTab === 'tickets' ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('activeTickets')}</h2>
            <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: '600px' }}>
              <input 
                type="text" 
                placeholder={t('search')} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="all">{t('allStatus')}</option>
                <option value="new">{t('new')}</option>
                <option value="open">{t('open')}</option>
                <option value="inprogress">{t('inprogress')}</option>
                <option value="awaiting">{t('awaiting')}</option>
                <option value="old">{t('old')}</option>
                <option value="closed">{t('closed')}</option>
              </select>
              <select 
                value={filterArea} 
                onChange={(e) => setFilterArea(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="all">{t('area')} ({t('viewAll')})</option>
                <option value="support">{t('support')}</option>
                <option value="sales">{t('sales')}</option>
                <option value="billing">{t('billing')}</option>
                <option value="accounting">{t('accounting')}</option>
                <option value="accountsPayable">{t('accountsPayable')}</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('id')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('subject')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('user')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('priority')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => onSelectTicket(ticket)}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>#{ticket.id}</td>
                    <td style={{ padding: '1rem' }}>{ticket.subject}</td>
                     <td style={{ padding: '1rem' }}>{ticket.user}</td>
                     <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${ticket.priority || 'medium'}`} style={{ fontSize: '0.7rem' }}>{t(ticket.priority || 'medium')}</span>
                     </td>
                     <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${ticket.status}`}>{t(ticket.status)}</span>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            {t('emailServerSettings')}
          </h2>
          <form onSubmit={handleTestSmtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(testConnectionStatus === 'testing' || testConnectionStatus === 'sending') && (
              <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                <svg style={{ animation: 'spin 1.5s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                {testConnectionStatus === 'testing' ? t('connectionTesting') : t('sendingConfirmationEmail')}
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {testConnectionStatus === 'success' && (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {t('connectionSuccess')}
              </div>
            )}
            {testConnectionStatus === 'error' && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {t('connectionFailed')}
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('smtpHost')}</label>
              <input type="text" value={settingsForm.smtpHost} onChange={e => setSettingsForm({...settingsForm, smtpHost: e.target.value})} placeholder="smtp.ejemplo.com" required />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('smtpPort')}</label>
                <input type="text" value={settingsForm.smtpPort} onChange={e => setSettingsForm({...settingsForm, smtpPort: e.target.value})} placeholder="587" required />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('smtpSecure') || 'TLS / SSL'}</label>
                <select value={settingsForm.smtpSecure ? 'yes' : 'no'} onChange={e => setSettingsForm({...settingsForm, smtpSecure: e.target.value === 'yes'})}>
                  <option value="yes">Sí (TLS/SSL)</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('smtpUser') || 'Usuario SMTP'}</label>
              <input type="text" value={settingsForm.smtpUser} onChange={e => setSettingsForm({...settingsForm, smtpUser: e.target.value})} placeholder="usuario@ejemplo.com" required autoComplete="off" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('smtpPass') || 'Contraseña SMTP'}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showSmtpPass ? "text" : "password"} 
                  value={settingsForm.smtpPass} 
                  onChange={e => setSettingsForm({...settingsForm, smtpPass: e.target.value})} 
                  placeholder="••••••••" 
                  required 
                  autoComplete="off" 
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPass(!showSmtpPass)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showSmtpPass ? t('hidePassword') : t('showPassword')}
                >
                  {showSmtpPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>{t('testEmailDestination')}</label>
              <input 
                type="email" 
                value={testEmail} 
                onChange={e => setTestEmail(e.target.value)} 
                placeholder="ejemplo@destino.com" 
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleTestSmtp}
                style={{ flex: 1, padding: '1rem' }} 
                disabled={testConnectionStatus === 'testing' || !testEmail}
              >
                {testConnectionStatus === 'testing' ? t('connectionTesting') : t('testConnection')}
              </button>
              <button 
                type="button" 
                onClick={handlePersistSmtp} 
                className="btn-primary" 
                style={{ flex: 1, padding: '1rem' }}
              >
                {t('save')}
              </button>
            </div>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            {t('dbConfig')}
          </h2>

          <form onSubmit={handleDBTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             {dbTestStatus === 'testing' && (
              <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                <svg style={{ animation: 'spin 1.5s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                {t('connectionTesting')}
              </div>
            )}
            {dbTestStatus === 'success' && (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {t('connectionSuccess')}
              </div>
            )}
            {dbTestStatus === 'error' && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {t('connectionFailed')}
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dbHost')}</label>
              <input type="text" value={dbConfigForm.host} onChange={e => setDbConfigForm({...dbConfigForm, host: e.target.value})} placeholder="localhost" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dbUser')}</label>
                <input type="text" value={dbConfigForm.user} onChange={e => setDbConfigForm({...dbConfigForm, user: e.target.value})} placeholder="root" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dbPass')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showDbPass ? "text" : "password"} 
                    value={dbConfigForm.password} 
                    onChange={e => setDbConfigForm({...dbConfigForm, password: e.target.value})} 
                    placeholder="••••••••" 
                    autoComplete="off"
                    style={{ paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbPass(!showDbPass)}
                    style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {showDbPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dbName')}</label>
              <input type="text" value={dbConfigForm.database} onChange={e => setDbConfigForm({...dbConfigForm, database: e.target.value})} placeholder="reporticket_master" required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dbMode')}</label>
              <select value={dbConfigForm.mode} onChange={e => setDbConfigForm({...dbConfigForm, mode: e.target.value})}>
                <option value="single">{t('dbModeSingle')}</option>
                <option value="multi">{t('dbModeMulti')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-secondary" style={{ flex: 1, padding: '1rem' }} disabled={dbTestStatus === 'testing'}>
                {dbTestStatus === 'testing' ? t('connectionTesting') : t('testDBConnection')}
              </button>
              <button type="button" onClick={handleDBSave} className="btn-primary" style={{ flex: 1, padding: '1rem' }}>
                {t('saveDBConfig')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t('createCompany')}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('manageInfrastructure') || 'Gestión de infraestructura y bases de datos'}</p>
              </div>
              <div style={{ textAlign: 'right', background: 'var(--bg-hover)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('dbMode') || 'Modo de Base de Datos'}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: systemInfo.dbMode === 'multi' ? '#10b981' : 'var(--primary)' }}>
                  {systemInfo.dbMode.toUpperCase()} {systemInfo.dbMode === 'multi' ? '(Aislado)' : '(Compartido)'}
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('companyName')}</label>
                  <input 
                    type="text" 
                    placeholder={t('enterCompanyPlaceholder')} 
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('administrator')}</label>
                  <input 
                    type="text" 
                    placeholder={t('enterNamePlaceholder')} 
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('emailAddress')}</label>
                  <input 
                    type="email" 
                    placeholder={t('enterEmailPlaceholder')} 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('password')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        type={showNewAdminPass ? "text" : "password"} 
                        placeholder="********" 
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        style={{ width: '100%', paddingRight: '2.5rem' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewAdminPass(!showNewAdminPass)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                      >
                        {showNewAdminPass ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                    <button 
                      type="button" 
                      className="btn-outline" 
                      onClick={generateRandomPassword}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      {t('generate')}
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '1rem', marginTop: '0.5rem' }}>
                {t('create')}
              </button>
            </form>
            {companySuccessMessage && (
              <div style={{ marginTop: '1rem', color: '#10b981', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {companySuccessMessage}
              </div>
            )}
            
            {companies.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('registeredCompanies')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {companies.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-hover)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                      {editingCompanyId === c.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <input 
                            autoFocus
                            type="text" 
                            value={editCompanyName} 
                            onChange={e => setEditCompanyName(e.target.value)} 
                            style={{ padding: '0.2rem', fontSize: '0.85rem', flex: 1 }} 
                            onKeyDown={e => e.key === 'Enter' && handleEditCompanySave(c.id)}
                            disabled={user.role !== 'superadmin'}
                          />
                          <button onClick={() => handleEditCompanySave(c.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>✓</button>
                          <button onClick={() => setEditingCompanyId(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>{c.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              DB: {c.db_name || 'Compartida'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => handleEditCompanyStart(c)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }} title={t('edit')}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteCompany(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }} title={t('delete')}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t('manageUsers')}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('user')}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('emailAddress')}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('role')}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('company')}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {editingUserId === u.id ? (
                        <>
                          <td style={{ padding: '1rem' }}>
                            <input 
                              type="text" 
                              value={editUserForm.name} 
                              onChange={e => setEditUserForm(f => ({...f, name: e.target.value}))} 
                              style={{ padding: '0.4rem', width: '100%' }} 
                              disabled={user.role !== 'superadmin'}
                            />
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <select value={editUserForm.role} onChange={e => setEditUserForm(f => ({...f, role: e.target.value}))} style={{ padding: '0.4rem' }}>
                              <option value="customer">{t('roles.customer')}</option>
                              <option value="supervisor">{t('roles.supervisor')}</option>
                              <option value="admin">{t('roles.admin')}</option>
                              <option value="superadmin">{t('roles.superadmin')}</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <select 
                              value={editUserForm.companyId || ''} 
                              onChange={(e) => setEditUserForm(f => ({...f, companyId: e.target.value}))}
                              style={{ padding: '0.4rem', width: '100%' }}
                            >
                              <option value="">-- {t('unassigned') || 'Sin Asignar'} --</option>
                              {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '1rem', fontWeight: '600' }}>{u.name}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`badge badge-${u.role === 'superadmin' ? 'closed' : (u.role === 'admin' ? 'old' : (u.role === 'supervisor' ? 'inprogress' : 'open'))}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                              {t(`roles.${u.role}`)}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {u.role === 'superadmin' ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A (Multi-Empresa)</span>
                            ) : (
                              <span style={{ fontSize: '0.9rem' }}>
                                {companies.find(c => String(c.id) === String(u.companyId))?.name || (t('unassigned') || 'Sin Asignar')}
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      <td style={{ padding: '1rem' }}>
                        {editingUserId === u.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditUserSave(u.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>{t('save')}</button>
                            <button onClick={() => setEditingUserId(null)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer' }}>{t('cancel')}</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditUserStart(u)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>{t('edit')}</button>
                            <button onClick={() => handleOpenPermissions(u)} style={{ background: 'none', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }} title={t('permissions')}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            </button>
                            {user.id !== u.id && (
                              <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>{t('delete')}</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {permissionsModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{t('permissions')}: {permissionsModalUser.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{t('role')}: <strong style={{ textTransform: 'uppercase' }}>{t(`roles.${permissionsModalUser.role}`)}</strong></p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.viewAllTickets || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, viewAllTickets: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>{t('viewAllCompanyTickets')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.assignTickets || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, assignTickets: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>{t('assignTicketsToAgents')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.manageUsers || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, manageUsers: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>{t('manageUsersPermissions')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.manageCompanies || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, manageCompanies: e.target.checked}}))} disabled={user.role !== 'superadmin'} />
                <span style={{ fontSize: '0.9rem', opacity: user.role !== 'superadmin' ? 0.5 : 1 }}>{t('manageCompaniesPermissions')}</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setPermissionsModalUser(null)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '0.5rem', cursor: 'pointer' }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={handleSavePermissions} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>{t('savePermissions')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
