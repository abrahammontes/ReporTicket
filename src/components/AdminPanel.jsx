import React, { useState } from 'react';

const AdminPanel = ({ stats, t, tickets, onSelectTicket }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ticket.id.includes(searchTerm) || 
                         ticket.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-panel">
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
    </div>
  );
};

export default AdminPanel;
