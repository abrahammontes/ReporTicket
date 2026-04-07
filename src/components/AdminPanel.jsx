import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';

const AdminPanel = ({ t, tickets, onSelectTicket, user, activeTab = 'tickets' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDbName, setNewCompanyDbName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [companySuccessMessage, setCompanySuccessMessage] = useState('');
  const [systemInfo, setSystemInfo] = useState({ dbHost: 'localhost', version: '1.2.0' });

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
    smtpSecure: true,
    supabaseUrl: '',
    supabaseKey: '',
    supabaseStatus: 'unknown'
  });
  const [testConnectionStatus, setTestConnectionStatus] = useState(null);
  const [dbTestStatus, setDbTestStatus] = useState(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  


  useEffect(() => {
    if (user?.role === 'superadmin') {
      dbService.getUsers().then(setUsers);
      dbService.getCompanies().then(setCompanies);
      dbService.getSystemInfo().then(info => {
        setSystemInfo(info);

      });
      // Load System Settings (SMTP & Supabase)
      dbService.getSystemSettings().then(settings => {
        setSettingsForm({
          ...settingsForm,
          ...(settings.smtpConfig || {}),
          ...(settings.supabaseConfig || {})
        });
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
      await dbService.registerCompany(newCompanyName.trim(), newCompanyDbName.trim(), {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword.trim()
      });
      const updated = await dbService.getCompanies();
      setCompanies(updated);
      await fetchUsers();
      setNewCompanyName('');
      setNewCompanyDbName('');
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
      const result = await dbService.updateSystemSettings({ smtpConfig: settingsForm });
      if (result.success) {
        alert(t('changesSaved'));
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Error saving SMTP settings');
    }
  };

  const handleTestSupabase = async (e) => {
    e.preventDefault();
    setDbTestStatus('testing');
    try {
      const result = await dbService.testSupabaseConnection(settingsForm.supabaseUrl, settingsForm.supabaseKey);
      if (result.success) {
        setDbTestStatus('success');
        setSettingsForm(prev => ({ ...prev, supabaseStatus: 'connected' }));
        setTimeout(() => setDbTestStatus(null), 4000);
      } else {
        setDbTestStatus('error');
        setSettingsForm(prev => ({ ...prev, supabaseStatus: 'disconnected' }));
        setTimeout(() => setDbTestStatus(null), 5000);
      }
    } catch (err) {
      setDbTestStatus('error');
      setTimeout(() => setDbTestStatus(null), 5000);
    }
  };

  const handlePersistSupabase = async () => {
    try {
      const result = await dbService.updateSystemSettings({ supabaseConfig: settingsForm });
      if (result.success) {
        alert(t('changesSaved'));
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Error saving Supabase settings');
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

  const handleToggleCompanyStatus = async (companyId, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await dbService.updateCompanyStatus(companyId, newStatus);
      if (res.success) {
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus } : c));
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error('Error toggling company status:', err);
      alert(t('errorUpdateStatus') || 'Error al actualizar estado');
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

  const handleDeleteTicket = async (e, ticketId) => {
    e.stopPropagation();
    if (window.confirm(t('confirmDeleteTicket') || '¿Estás seguro de que deseas eliminar este ticket permanentemente?')) {
      try {
        const result = await dbService.deleteTicket(ticketId);
        if (result.success) {
          // Refresh list via parent update or local fetch if possible
          // For now, reload to keep it simple and consistent with other deletes
          window.location.reload(); 
        } else {
          alert('Error: ' + result.message);
        }
      } catch (err) {
        alert('Error deleting ticket');
      }
    }
  };

   const handlePurgeSystem = async () => {
    const confirm1 = window.confirm(t('confirmPurge1') || '¡ADVERTENCIA! Esta acción ELIMINARÁ TODOS los tickets y notas del sistema. ¿Estás seguro?');
    if (!confirm1) return;
    
    const confirm2 = window.confirm(t('confirmPurge2') || '¿REALMENTE deseas borrar TODO? Esta acción no se puede deshacer.');
    if (!confirm2) return;

    try {
      const result = await dbService.purgeTickets();
      if (result.success) {
        alert(t('purgeSuccess') || 'Sistema limpiado correctamente.');
        window.location.reload();
      } else {
        alert(t('error') || 'Error: ' + result.message);
      }
    } catch (_) {
      alert(t('error') || 'Error purging system');
    }
  };

  const handleOpenPermissions = (userToEdit) => {
    let perms = userToEdit.permissions;
    if (typeof perms === 'string') {
      try {
        perms = JSON.parse(perms);
      } catch (e) {
        console.error('Error parsing permissions:', e);
        perms = null;
      }
    }
    
    setPermissionsModalUser({
      ...userToEdit,
      permissions: perms || {
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
    const matchesSearch = (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (ticket.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (ticket.user || '').toLowerCase().includes(searchTerm.toLowerCase());
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
                  {user.role === 'superadmin' && (
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('actions')}</th>
                  )}
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
                     {user.role === 'superadmin' && (
                       <td style={{ padding: '1rem' }}>
                         <button 
                           onClick={(e) => handleDeleteTicket(e, ticket.id)}
                           style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                           title={t('delete')}
                         >
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                         </button>
                       </td>
                     )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* SMTP Configuration Card */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontWeight: '700' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                {t('emailServerSettings')}
              </h3>
              
              <form onSubmit={handleTestSmtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                {(testConnectionStatus === 'testing' || testConnectionStatus === 'sending') && (
                  <div className="connection-status-msg testing">
                    <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                    {testConnectionStatus === 'testing' ? t('connectionTesting') : t('sendingConfirmationEmail')}
                  </div>
                )}
                {testConnectionStatus === 'success' && (
                  <div className="connection-status-msg success">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    {t('connectionSuccess')}
                  </div>
                )}
                {testConnectionStatus === 'error' && (
                  <div className="connection-status-msg error">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {t('connectionFailed')}
                  </div>
                )}

                <div>
                  <label className="input-label">{t('smtpHost')}</label>
                  <input type="text" value={settingsForm.smtpHost} onChange={e => setSettingsForm({...settingsForm, smtpHost: e.target.value})} placeholder="smtp.ejemplo.com" required className="modern-input" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">{t('smtpUser')}</label>
                    <input type="text" value={settingsForm.smtpUser} onChange={e => setSettingsForm({...settingsForm, smtpUser: e.target.value})} placeholder="user@domain.com" required className="modern-input" />
                  </div>
                  <div>
                    <label className="input-label">{t('smtpPort')}</label>
                    <input type="text" value={settingsForm.smtpPort} onChange={e => setSettingsForm({...settingsForm, smtpPort: e.target.value})} placeholder="587" className="modern-input" />
                  </div>
                </div>

                <div>
                  <label className="input-label">{t('smtpPass')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showSmtpPass ? "text" : "password"} 
                      value={settingsForm.smtpPass} 
                      onChange={e => setSettingsForm({...settingsForm, smtpPass: e.target.value})} 
                      placeholder="••••••••" 
                      className="modern-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="input-icon-btn">
                      {showSmtpPass ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                  <label className="input-label" style={{ color: 'var(--text-main)', fontWeight: '700' }}>{t('testEmailDestination')}</label>
                  <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="email@test.com" className="modern-input" style={{ marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="btn-secondary" onClick={handleTestSmtp} style={{ flex: 1 }} disabled={testConnectionStatus === 'testing' || !testEmail}>
                      {testConnectionStatus === 'testing' ? <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> : t('testConnection')}
                    </button>
                    <button type="button" className="btn-primary" onClick={handlePersistSmtp} style={{ flex: 1 }}>{t('save')}</button>
                  </div>
                </div>
              </form>
            </div>

            {/* Database configuration (Supabase) */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3ecf8e', fontWeight: '700' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  {t('databaseConfig')}
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '2rem', 
                  background: settingsForm.supabaseStatus === 'connected' ? 'rgba(62, 207, 142, 0.1)' : settingsForm.supabaseStatus === 'disconnected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                  border: `1px solid ${settingsForm.supabaseStatus === 'connected' ? 'rgba(62, 207, 142, 0.2)' : settingsForm.supabaseStatus === 'disconnected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)'}`,
                  color: settingsForm.supabaseStatus === 'connected' ? '#3ecf8e' : settingsForm.supabaseStatus === 'disconnected' ? '#ef4444' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: settingsForm.supabaseStatus === 'connected' ? '#3ecf8e' : settingsForm.supabaseStatus === 'disconnected' ? '#ef4444' : '#9ca3af',
                    boxShadow: settingsForm.supabaseStatus === 'connected' ? '0 0 8px #3ecf8e' : 'none'
                  }}></span>
                  {t(settingsForm.supabaseStatus || 'unknown')}
                </div>
              </div>

              <form onSubmit={handleTestSupabase} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                {dbTestStatus === 'testing' && (
                  <div className="connection-status-msg testing">
                    <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                    {t('connectionTesting')}
                  </div>
                )}
                {dbTestStatus === 'success' && (
                  <div className="connection-status-msg success" style={{ background: 'rgba(62, 207, 142, 0.1)', borderColor: 'rgba(62, 207, 142, 0.2)', color: '#3ecf8e' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    {t('connectionSuccess')}
                  </div>
                )}
                {dbTestStatus === 'error' && (
                  <div className="connection-status-msg error">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {t('connectionFailed')}
                  </div>
                )}

                <div>
                  <label className="input-label">{t('supabaseUrl')}</label>
                  <input 
                    type="url" 
                    value={settingsForm.supabaseUrl} 
                    onChange={e => setSettingsForm({...settingsForm, supabaseUrl: e.target.value})} 
                    placeholder="https://your-project.supabase.co" 
                    required 
                    className="modern-input" 
                  />
                </div>

                <div>
                  <label className="input-label">{t('supabaseKey')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showSupabaseKey ? "text" : "password"} 
                      value={settingsForm.supabaseKey} 
                      onChange={e => setSettingsForm({...settingsForm, supabaseKey: e.target.value})} 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                      className="modern-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button type="button" onClick={() => setShowSupabaseKey(!showSupabaseKey)} className="input-icon-btn">
                      {showSupabaseKey ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                    </button>
                  </div>
                </div>

                <div style={{ paddingBottom: '1rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn-secondary" style={{ flex: 1 }} disabled={dbTestStatus === 'testing'}>
                      {dbTestStatus === 'testing' ? <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> : t('testConnection')}
                    </button>
                    <button type="button" className="btn-primary" onClick={handlePersistSupabase} style={{ flex: 1, background: '#3ecf8e', borderColor: '#3ecf8e' }}>{t('save')}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>


        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2.5fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
                  {t('createCompany')}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('manageInfrastructure') || 'Gestión de infraestructura y bases de datos'}</p>
              </div>
              <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="input-label">{t('companyName') || 'Nombre de la Empresa'}</label>
                  <input 
                    type="text" 
                    className="modern-input"
                    placeholder={t('enterCompanyPlaceholder') || 'Nombre de la empresa'} 
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                   <label className="input-label">{t('databaseName') || 'Nombre de Identificación (BD)'}</label>
                   <input 
                     type="text" 
                     className="modern-input"
                     placeholder="ej: cliente_pro" 
                     value={newCompanyDbName}
                     onChange={(e) => setNewCompanyDbName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                     required
                   />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('administrator')}</label>
                  <input 
                    type="text" 
                    className="modern-input"
                    placeholder={t('enterNamePlaceholder') || 'Nombre del administrador'} 
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('emailAddress')}</label>
                  <input 
                    type="email" 
                    className="modern-input"
                    placeholder={t('enterEmailPlaceholder') || 'correo@ejemplo.com'} 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">{t('password')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        type={showNewAdminPass ? "text" : "password"} 
                        className="modern-input"
                        placeholder="********" 
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        required
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button 
                        type="button"
                        className="input-icon-btn"
                        onClick={() => setShowNewAdminPass(!showNewAdminPass)}
                        style={{ right: '0.5rem' }}
                      >
                        {showNewAdminPass ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                    <button 
                      type="button" 
                      className="btn-outline" 
                      onClick={generateRandomPassword}
                      style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title={t('generate')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-2.5z"></path></svg>
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '1rem', marginTop: '0.5rem', fontWeight: '700', fontSize: '0.95rem' }}>
                  {t('createCompany')}
                </button>
              </form>
            {companies.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>{t('registeredCompanies')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {companies.map(c => (
                    <div key={c.id} className="table-row-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                      {editingCompanyId === c.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <input autoFocus type="text" className="modern-input" value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditCompanySave(c.id)} style={{ padding: '0.5rem' }} />
                          <button className="btn-primary" onClick={() => handleEditCompanySave(c.id)} style={{ padding: '0.5rem' }}>✓</button>
                          <button className="btn-outline" onClick={() => setEditingCompanyId(null)} style={{ padding: '0.5rem', color: '#ef4444' }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700' }}>{c.name}</span>
                              <span style={{ 
                                fontSize: '0.7rem', padding: '0.15rem 0.6rem', borderRadius: '2rem', 
                                background: c.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: c.status === 'suspended' ? '#ef4444' : '#10b981',
                                border: `1px solid ${c.status === 'suspended' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                fontWeight: '700'
                              }}>
                                {t(c.status || 'active')}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}>ID: {c.id}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleToggleCompanyStatus(c.id, c.status)} className="input-icon-btn" style={{ position: 'static', color: c.status === 'suspended' ? 'var(--text-muted)' : '#10b981', padding: '0.5rem' }} title={c.status === 'suspended' ? t('activate') : t('suspend')}>
                              {c.status === 'suspended' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                              )}
                            </button>
                            <button onClick={() => handleEditCompanyStart(c)} className="input-icon-btn" style={{ position: 'static', color: 'var(--primary)', padding: '0.5rem' }} title={t('edit')}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteCompany(c.id)} className="input-icon-btn" style={{ position: 'static', color: '#ef4444', padding: '0.5rem' }} title={t('delete')}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {t('manageUsers')}
            </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border-color)', fontWeight: '600' }}>
                {users.length} {t('users')}
              </div>
            </div>
            <div className="custom-scrollbar" style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', minWidth: '800px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: 'var(--bg-hover)' }}>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('user')}</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('emailAddress')}</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('role')}</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('company')}</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="table-row-hover" style={{ transition: 'background 0.2s', borderTop: '1px solid var(--border-color)' }}>
                      {editingUserId === u.id ? (
                        <>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <input type="text" className="modern-input" value={editUserForm.name} onChange={e => setEditUserForm(f => ({...f, name: e.target.value}))} style={{ padding: '0.5rem' }} />
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="modern-input" value={editUserForm.role} onChange={e => setEditUserForm(f => ({...f, role: e.target.value}))} style={{ padding: '0.5rem' }}>
                              <option value="customer">{t('roles.customer')}</option>
                              <option value="agent">{t('roles.agent')}</option>
                              <option value="supervisor">{t('roles.supervisor')}</option>
                              <option value="admin">{t('roles.admin')}</option>
                              <option value="superadmin">{t('roles.superadmin')}</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="modern-input" value={editUserForm.companyId || ''} onChange={(e) => setEditUserForm(f => ({...f, companyId: e.target.value}))} style={{ padding: '0.5rem' }}>
                              <option value="">-- {t('unassigned')} --</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.email}</td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                              <span className={`badge badge-${u.role === 'superadmin' ? 'closed' : (u.role === 'admin' ? 'old' : (u.role === 'supervisor' ? 'inprogress' : 'open'))}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                {t(`roles.${u.role}`)}
                              </span>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            {u.role === 'superadmin' ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-hover)', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>{t('allCompanies')}</span>
                            ) : (
                              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                {companies.find(c => String(c.id) === String(u.companyId))?.name || <em style={{ opacity: 0.5 }}>{t('unassigned')}</em>}
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {editingUserId === u.id ? (
                            <>
                              <button onClick={() => handleEditUserSave(u.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>{t('save')}</button>
                              <button onClick={() => setEditingUserId(null)} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>{t('cancel')}</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditUserStart(u)} className="table-action-btn" style={{ color: 'var(--primary)' }} title={t('edit')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button onClick={() => handleOpenPermissions(u)} className="table-action-btn" style={{ color: '#8b5cf6' }} title={t('permissions')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                              </button>
                              {user.id !== u.id && (
                                <button onClick={() => handleDeleteUser(u.id)} className="table-action-btn" style={{ color: '#ef4444' }} title={t('delete')}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
