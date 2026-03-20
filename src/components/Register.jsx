import React, { useState } from 'react';

const Register = ({ onRegister, onLogin, onBack, t, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [extension, setExtension] = useState('');
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleRegister = () => {
    setLocalError(null);
    if (honeypot) return;
    if (!isRobotChecked) {
      setLocalError(t('captchaRequired'));
      return;
    }
    onRegister({ name, email, password, phone, extension });
  };

  return (
    <div className="register-page animate-in" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem', 
      background: 'radial-gradient(circle at bottom left, var(--grad-start), var(--grad-end))' 
    }}>
      <div className={`glass-panel ${localError ? 'shake' : ''}`} style={{ 
        width: '100%', 
        maxWidth: '500px', 
        padding: '3rem',
        animation: localError ? 'none' : 'fadeIn 0.5s ease-out'
      }}>
        <button 
          onClick={onBack} 
          className="card-hover"
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            marginBottom: '2rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.6rem',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}
        >
          {t('backToHome')}
        </button>
        
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('createAccount')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>{t('joinUs')}</p>

        {(error || localError) && (
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '0.75rem', 
            color: '#f87171', 
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {error || localError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('fullName')}</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('emailAddress')}</label>
              <input 
                type="email" 
                placeholder="john@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('password')}</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('phone')}</label>
              <input 
                type="tel" 
                placeholder="+52 123..." 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('extension')}</label>
              <input 
                type="text" 
                placeholder="101" 
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'none' }}>
            <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex="-1" autoComplete="off" />
          </div>

          <div 
            onClick={() => setIsRobotChecked(!isRobotChecked)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1rem', 
              background: isRobotChecked ? 'rgba(24, 193, 202, 0.05)' : 'rgba(255,255,255,0.02)', 
              border: localError && !isRobotChecked ? '1px solid #ef4444' : '1px solid var(--border-color)', 
              borderRadius: '0.85rem',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'var(--transition)'
            }}
          >
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '6px',
              border: isRobotChecked ? 'none' : '2px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isRobotChecked ? 'var(--primary)' : 'transparent',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              {isRobotChecked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: localError && !isRobotChecked ? '#ef4444' : 'var(--text-main)' }}>
              {t('notARobot')}
            </span>
            <div style={{ marginLeft: 'auto', opacity: 0.5 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
          </div>
          
          <button onClick={handleRegister} className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', height: '3.5rem' }}>
            {t('register')}
          </button>
          
          <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {t('alreadyHaveAccount')} <button onClick={onLogin} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700' }}>{t('login')}</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
