import React from 'react';
import Logo from './Logo';

const Landing = ({ onGetStarted, onLogin, theme, setTheme, t, language, setLanguage }) => {
  return (
    <div className="landing-page animate-in" style={{ background: 'transparent' }}>
       <nav style={{
         padding: '0.75rem 5%',
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         borderBottom: '1px solid var(--border-color)',
         background: 'rgba(255,255,255,0.02)',
         backdropFilter: 'blur(10px)',
         position: 'sticky',
         top: 0,
         zIndex: 1000
       }}>
         <a href="https://reporticket.montes.digital" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
           <Logo theme={theme} size={160} />
         </a>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            title={language === 'en' ? 'Spanish' : 'English'}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              fontSize: '0.75rem',
              fontWeight: '800',
              minWidth: '40px'
            }}
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
          <button
            onClick={onLogin}
            className="card-hover"
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.85rem',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              transition: 'var(--transition)'
            }}
          >
            {t('login')}
          </button>
          <button
            onClick={onGetStarted}
            className="btn-primary"
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '0.9rem'
            }}
          >
            {t('register')}
          </button>
        </div>
      </nav>

      <div className="hero" style={{
        padding: '5rem 5%',
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -1,
          opacity: 0.5
        }} />

        <h1 style={{
          fontSize: 'clamp(2.5rem, 10vw, 5rem)',
          lineHeight: '1.1',
          marginBottom: '2rem',
          fontWeight: '900',
          letterSpacing: '-0.02em',
          color: theme === 'dark' ? 'transparent' : '#020617',
          background: theme === 'dark' ? 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)' : 'none',
          WebkitBackgroundClip: theme === 'dark' ? 'text' : 'unset',
          WebkitTextFillColor: theme === 'dark' ? 'transparent' : 'unset',
          display: 'block',
          textShadow: 'none'
        }}>
          {t('heroTitle')}
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 3vw, 1.25rem)',
          color: theme === 'dark' ? '#ffffff' : '#0f172a',
          marginBottom: '4rem',
          maxWidth: '800px',
          margin: '0 auto 4rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          fontWeight: '500',
          textShadow: 'none'
        }}>
          {t('heroSub')}
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Hero buttons removed per user request */}
        </div>
      </div>

      <div style={{
        padding: '3rem 5%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto 4rem'
      }}>
        {[
          { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: t('secure'), sub: t('secureDesc') },
          { icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', title: t('fast'), sub: t('fastDesc') },
          { icon: 'X', title: t('reliable'), sub: t('reliableDesc'), svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> }
        ].map((feat, i) => (
          <div key={i} className="glass-panel card-hover animate-in" style={{ padding: '2.5rem', textAlign: 'center', animationDelay: `${0.1 * (i + 1)}s` }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '1.25rem',
              background: 'rgba(24, 193, 202, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem'
            }}>
              {feat.svg ? feat.svg : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={feat.icon}></path></svg>
              )}
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', fontWeight: '800', color: theme === 'dark' ? '#ffffff' : '#020617' }}>{feat.title}</h3>
            <p style={{ color: theme === 'dark' ? '#cbd5e1' : '#1e293b', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: '500' }}>{feat.sub}</p>
          </div>
        ))}
      </div>

      <style>{`
        .landing-page {
          min-height: 100vh;
        }
        .hero {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default Landing;
