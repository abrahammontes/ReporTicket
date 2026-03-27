import React, { useState } from 'react';

const Dashboard = ({ stats, t, tickets = [], onSelectTicket }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredTickets = tickets.filter(ticket => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return ticket.status !== 'closed';
    if (activeFilter === 'overdue') return ticket.status === 'old';
    if (activeFilter === 'unassigned') return !ticket.agent;
    if (activeFilter === 'closed') return ticket.status === 'closed';
    return true;
  });

  const StatCard = ({ id, label, value, icon, color, bgColor }) => (
    <div 
      onClick={() => setActiveFilter(id)}
      className={`glass-panel stat-card ${activeFilter === id ? 'active-filter' : ''}`}
      style={{ 
        position: 'relative',
        cursor: 'pointer',
        padding: '1.5rem',
        border: activeFilter === id ? `2px solid ${color}` : '1px solid var(--border-color)',
        transform: activeFilter === id ? 'translateY(-4px)' : 'none',
        background: activeFilter === id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        minWidth: '180px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{value}</h3>
        </div>
        <div style={{ padding: '0.75rem', borderRadius: '1rem', background: bgColor, color: color }}>
          {icon}
        </div>
      </div>
      {activeFilter === id && (
         <div style={{ position: 'absolute', bottom: '0.5rem', right: '1rem', fontSize: '0.65rem', fontWeight: '800', color: color, textTransform: 'uppercase' }}>
            {t('activeTickets')}
         </div>
      )}
    </div>
  );

  return (
    <div className="dashboard animate-in">
      <style>{`
        .active-filter {
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
        }
      `}</style>
      <div className="stat-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        <StatCard 
          id="all"
          label={t('totalTickets')}
          value={tickets.length}
          color="var(--primary)"
          bgColor="rgba(24, 193, 202, 0.1)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>}
        />
        <StatCard 
          id="open"
          label={t('openTickets')}
          value={stats.open}
          color="#4ade80"
          bgColor="rgba(34, 197, 94, 0.1)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"></path><path d="M8 6h9"></path><path d="M8 10h9"></path></svg>}
        />
        <StatCard 
          id="overdue"
          label={t('overdue')}
          value={stats.overdue}
          color="#f87171"
          bgColor="rgba(239, 68, 68, 0.1)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
        />
        <StatCard 
          id="unassigned"
          label={t('unassigned')}
          value={stats.unassigned}
          color="#facc15"
          bgColor="rgba(234, 179, 8, 0.1)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>}
        />
        <StatCard 
          id="closed"
          label={t('totalClosed')}
          value={stats.closed}
          color="#94a3b8"
          bgColor="rgba(148, 163, 184, 0.1)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
        />
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {t('recentActivity')} {activeFilter !== 'all' && `(${filteredTickets.length})`}
          </h2>
          <button 
            onClick={() => setActiveFilter('all')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', opacity: activeFilter === 'all' ? 0.5 : 1 }}
          >
            {t('viewAll')}
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTickets.length > 0 ? (
            filteredTickets.slice(0, 10).map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => onSelectTicket && onSelectTicket(ticket)}
                className="card-hover"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '1.5rem', 
                  padding: '1.25rem', 
                  borderRadius: '1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: ticket.status === 'closed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(24, 193, 202, 0.1)',
                  color: ticket.status === 'closed' ? '#4ade80' : 'var(--primary)'
                }}>
                  {ticket.status === 'closed' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <p style={{ fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.subject}
                    </p>
                    <span className={`badge badge-${(ticket.status || 'new').replace(/\s+/g, '')}`}>
                      {t(ticket.status || 'new')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      {ticket.user}
                    </span>
                    <span>•</span>
                    <span>{t('id')}: #{ticket.id}</span>
                    <span>•</span>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '4px',
                      background: `rgba(var(--${ticket.priority || 'medium'}-rgb, 120, 120, 120), 0.1)`,
                      color: `var(--${ticket.priority || 'medium'})`,
                      fontWeight: '600',
                      fontSize: '0.75rem'
                    }}>
                      {t(ticket.priority || 'medium').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div style={{ color: 'var(--text-muted)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>{t('noTicketsFound') || 'No tickets found for this filter.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
