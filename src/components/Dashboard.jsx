import React from 'react';

const Dashboard = ({ stats, t, tickets = [], onSelectTicket }) => {
  return (
    <div className="dashboard animate-in">
      <div className="stat-grid">
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('openTickets')}</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.open}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"></path><path d="M8 6h9"></path><path d="M8 10h9"></path></svg>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('overdue')}</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.overdue}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('unassigned')}</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.unassigned}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
            </div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('totalClosed')}</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.closed}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{t('recentActivity')}</h2>
          <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>{t('viewAll') || 'Ver Todo'}</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tickets.slice(0, 5).map(ticket => (
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
                  <span className={`badge badge-${ticket.status.replace(/\s+/g, '')}`}>
                    {t(ticket.status)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    {ticket.user}
                  </span>
                  <span>•</span>
                  <span>ID: #{ticket.id}</span>
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
