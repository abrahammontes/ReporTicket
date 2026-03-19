import React from 'react';

const Logo = ({ theme, size = 120 }) => {
  const isDark = theme === 'dark';
  
  // Exact colors from the user's image
  const navy = '#0a1d37'; // Deeper navy
  const teal = '#18c1ca';
  const subtextCol = isDark ? '#94a3b8' : '#7f8c8d'; // Slate grey for subtext
  const white = '#ffffff';
  
  const iconColor = isDark ? white : navy;
  const textColor = isDark ? white : '#0a1d37';

  return (
    <div className="logo-container" style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.75rem',
      userSelect: 'none',
      cursor: 'inherit'
    }}>
      {/* Elite Shield Monogram */}
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Shield Shape */}
          <path d="M24 4L4 12V22C4 32.7 12.4 42.6 24 44C35.6 42.6 44 32.7 44 22V12L24 4Z" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Abstract 'RT' Glyph */}
          <path d="M18 16V32M18 16H26C28.2 16 30 17.8 30 20C30 22.2 28.2 24 26 24H18M24 24L30 32" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Accent Dot */}
          <circle cx="24" cy="4" r="2" fill="var(--primary)"/>
        </svg>
      </div>
      
      {/* "ReporTicket" Text - Clean, bold, letter-spaced */}
      <div style={{ 
        fontSize: '24px', 
        fontWeight: '800', 
        textAlign: 'left',
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
        lineHeight: '1',
        letterSpacing: '-0.02em'
      }}>
        <span style={{ color: textColor }}>Repor</span>
        <span style={{ color: teal }}>Ticket</span>
        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px' }}>
          Enterprise Portal
        </div>
      </div>
    </div>
  );
};

export default Logo;
