import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';

const AdminPanel = ({ stats, t, tickets, onSelectTicket, user, activeTab = 'tickets' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySuccessMessage, setCompanySuccessMessage] = useState('');

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editCompanyName, setEditCompanyName] = useState('');

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: '' });
  
  const [permissionsModalUser, setPermissionsModalUser] = useState(null);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      setUsers(dbService.getUsers());
      setCompanies(dbService.getCompanies());
    }
  }, [user]);

  const handleCreateCompany = (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    dbService.addCompany({ name: newCompanyName.trim() });
    setCompanies(dbService.getCompanies());
    setNewCompanyName('');
    setCompanySuccessMessage(t('companyCreatedMsg') || 'Empresa creada con éxito');
    setTimeout(() => setCompanySuccessMessage(''), 3000);
  };

  const handleUpdateUserCompany = (userId, companyId) => {
    dbService.updateUserProfile(userId, { companyId });
    setUsers(dbService.getUsers());
  };

  const handleEditCompanyStart = (company) => {
    setEditingCompanyId(company.id);
    setEditCompanyName(company.name);
  };

  const handleEditCompanySave = (companyId) => {
    if (editCompanyName.trim()) {
      dbService.updateCompany(companyId, { name: editCompanyName.trim() });
      setCompanies(dbService.getCompanies());
    }
    setEditingCompanyId(null);
  };

  const handleDeleteCompany = (companyId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta empresa? Esto quitará la asignación de sus usuarios.")) {
      dbService.deleteCompany(companyId);
      setCompanies(dbService.getCompanies());
      setUsers(dbService.getUsers());
    }
  };

  const handleEditUserStart = (u) => {
    setEditingUserId(u.id);
    setEditUserForm({ name: u.name, role: u.role });
  };

  const handleEditUserSave = (userId) => {
    if (editUserForm.name.trim()) {
      dbService.updateUserProfile(userId, { name: editUserForm.name.trim(), role: editUserForm.role });
      setUsers(dbService.getUsers());
    }
    setEditingUserId(null);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm("¿Estás seguro de eliminar este usuario permanentemente?")) {
      dbService.deleteUser(userId);
      setUsers(dbService.getUsers());
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

  const handleSavePermissions = () => {
    dbService.updateUserProfile(permissionsModalUser.id, { permissions: permissionsModalUser.permissions });
    setUsers(dbService.getUsers());
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
                <option value="all">{t('area')} (All)</option>
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
                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('id')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('subject')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('user')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('priority')}</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => onSelectTicket(ticket)}>
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t('createCompany') || 'Crear Empresa'}</h2>
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', gap: '1rem', maxWidth: '500px' }}>
              <input 
                type="text" 
                placeholder={t('companyName') || 'Nombre de la Empresa'} 
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                {t('create') || 'Crear'}
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
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('registeredCompanies') || 'Empresas Registradas'}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {companies.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', gap: '0.5rem' }}>
                      {editingCompanyId === c.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            autoFocus
                            type="text" 
                            value={editCompanyName} 
                            onChange={e => setEditCompanyName(e.target.value)} 
                            style={{ padding: '0.2rem', fontSize: '0.85rem' }} 
                            onKeyDown={e => e.key === 'Enter' && handleEditCompanySave(c.id)}
                          />
                          <button onClick={() => handleEditCompanySave(c.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>✓</button>
                          <button onClick={() => setEditingCompanyId(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600' }}>{c.name}</span>
                          <button onClick={() => handleEditCompanyStart(c)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }} title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button onClick={() => handleDeleteCompany(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }} title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t('manageUsers') || 'Gestión de Usuarios'}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('user') || 'Usuario'}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('emailAddress') || 'Email'}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('role') || 'Rol'}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('company') || 'Empresa'}</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t('actions') || 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {editingUserId === u.id ? (
                        <>
                          <td style={{ padding: '1rem' }}>
                            <input type="text" value={editUserForm.name} onChange={e => setEditUserForm(f => ({...f, name: e.target.value}))} style={{ padding: '0.4rem', width: '100%' }} />
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <select value={editUserForm.role} onChange={e => setEditUserForm(f => ({...f, role: e.target.value}))} style={{ padding: '0.4rem' }}>
                              <option value="customer">Cliente</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Super Admin</option>
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '1rem', fontWeight: '600' }}>{u.name}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`badge badge-${u.role === 'superadmin' ? 'closed' : (u.role === 'admin' ? 'old' : (u.role === 'supervisor' ? 'inprogress' : 'open'))}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                          {u.role}
                        </span>
                          </td>
                        </>
                      )}
                      
                      <td style={{ padding: '1rem' }}>
                        {u.role === 'superadmin' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A (Multi-Empresa)</span>
                        ) : (
                          <select 
                            value={u.companyId || ''} 
                            onChange={(e) => handleUpdateUserCompany(u.id, e.target.value)}
                            style={{ padding: '0.5rem', minWidth: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-main)' }}
                            disabled={editingUserId === u.id}
                          >
                            <option value="">-- {t('unassigned') || 'Sin Asignar'} --</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {editingUserId === u.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditUserSave(u.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Guardar</button>
                            <button onClick={() => setEditingUserId(null)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditUserStart(u)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>Editar</button>
                            <button onClick={() => handleOpenPermissions(u)} style={{ background: 'none', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }} title="Permisos">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            </button>
                            {user.id !== u.id && (
                              <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>Eliminar</button>
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
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Permisos: {permissionsModalUser.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Rol actual: <strong style={{ textTransform: 'uppercase' }}>{permissionsModalUser.role}</strong></p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.viewAllTickets || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, viewAllTickets: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>Ver todos los tickets de la empresa</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.assignTickets || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, assignTickets: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>Asignar tickets a agentes</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.manageUsers || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, manageUsers: e.target.checked}}))} />
                <span style={{ fontSize: '0.9rem' }}>Gestionar usuarios (Crear/Editar/Eliminar)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={permissionsModalUser.permissions?.manageCompanies || false} onChange={e => setPermissionsModalUser(prev => ({...prev, permissions: {...prev.permissions, manageCompanies: e.target.checked}}))} disabled={user.role !== 'superadmin'} />
                <span style={{ fontSize: '0.9rem', opacity: user.role !== 'superadmin' ? 0.5 : 1 }}>Gestionar empresas (Super Admin)</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setPermissionsModalUser(null)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleSavePermissions} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Guardar Permisos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
