import React, { useState } from 'react';
import Logo from './Logo';

const Login = ({ onLogin, onRegister, onBack, theme, t, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);
    if (honeypot) return; // Silent fail for bots
    if (!isRobotChecked) {
      setLocalError(t('captchaRequired'));
      return;
    }
    
    if (isRecovering) {
      setRecoverySent(true);
      setTimeout(() => {
        setRecoverySent(false);
        setIsRecovering(false);
      }, 3000);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <div className="login-view" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem',
      background: 'radial-gradient(circle at top right, var(--grad-start), var(--grad-end))'
    }}>
      <div className={`glass-panel ${localError ? 'shake' : ''}`} style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '3rem',
        animation: localError ? 'none' : 'fadeIn 0.5s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Logo theme={theme} size={160} />
          <h2 style={{ marginTop: '1.5rem', fontSize: '1.5rem' }}>
            {isRecovering ? t('resetPassword') : t('loginToAccount')}
          </h2>
        </div>

        {recoverySent ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem', 
            background: 'rgba(24, 193, 202, 0.05)', 
            borderRadius: '1.25rem',
            border: '1px solid var(--border-color)',
            animation: 'fadeInUp 0.6s var(--ease-premium)'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(24, 193, 202, 0.1)', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{t('emailSent') || 'Email Enviado'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{t('resetLinkSent')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(error || localError) && (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: '0.75rem', 
                color: '#f87171', 
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {error || localError}
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('emailAddress')}
              </label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                autoFocus
              />
            </div>

            {!isRecovering && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('password')}
                </label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Honeypot Field */}
            <div style={{ display: 'none' }}>
              <input 
                type="text" 
                value={honeypot} 
                onChange={(e) => setHoneypot(e.target.value)} 
                tabIndex="-1" 
                autoComplete="off" 
              />
            </div>

            {/* No soy un robot Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: isRobotChecked ? 'rgba(24, 193, 202, 0.05)' : 'rgba(255,255,255,0.02)', border: localError && !isRobotChecked ? '1px solid #ef4444' : '1px solid var(--border-color)', borderRadius: '0.85rem', cursor: 'pointer', userSelect: 'none', transition: 'var(--transition)' }}>
  <input type="checkbox" checked={isRobotChecked} onChange={() => setIsRobotChecked(!isRobotChecked)} style={{ marginRight: '0.5rem' }} />
  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: localError && !isRobotChecked ? '#ef4444' : 'var(--text-main)' }}>{t('notARobot')}</span>
</div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', height: '3.5rem' }}>
              {isRecovering ? t('resetPassword') : t('login')}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={() => setIsRecovering(!isRecovering)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', padding: '0' }}
              >
                {isRecovering ? t('backToLogin') : t('forgotPassword')}
              </button>
              <button 
                type="button"
                onClick={onBack}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
              >
                {t('backToList')}
              </button>
              <button 
                type="button"
                onClick={onRegister}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
              >
                {t('register')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
