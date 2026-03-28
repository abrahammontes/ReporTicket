import React, { useState } from 'react';
import Logo from './Logo';
import { dbService } from '../services/db';

const Login = ({ onLogin, onRegister, onBack, theme, t, error, successMsg, language, setLanguage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [localError, setLocalError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (honeypot) return; // Silent fail for bots
    if (!isRobotChecked) {
      setLocalError(t('captchaRequired'));
      return;
    }

    setIsLoading(true);
    try {
      if (isRecovering) {
        await dbService.forgotPassword(email);
        setRecoverySent(true);
        setLocalError(null);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-view" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'transparent'
    }}>
      <div className={`glass-panel ${localError ? 'shake' : ''}`} style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        animation: localError ? 'none' : 'fadeIn 0.5s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={onBack} 
            className="card-hover"
            style={{ 
              background: 'var(--bg-hover)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.85rem',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            {t('backToHome')}
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: '800',
              transition: 'var(--transition)'
            }}
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
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
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{t('recoveryEmailSent')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{t('recoveryEmailSentDesc')}</p>
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
            {successMsg && (
              <div style={{
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '0.75rem',
                color: '#4ade80',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {successMsg}
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
                placeholder={t('enterEmailPlaceholder')}
                autoFocus
              />
            </div>

            {!isRecovering && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('password')}
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength="8"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingRight: '2.5rem', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      title={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
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
            <div
              onClick={() => setIsRobotChecked(!isRobotChecked)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: isRobotChecked ? 'rgba(24, 193, 202, 0.05)' : 'var(--bg-subtle)',
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
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                flexShrink: 0
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

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ marginTop: '0.5rem', padding: '1rem', height: '3.5rem' }}
              disabled={isLoading}
            >
              {isLoading ? '...' : (isRecovering ? t('sendRecoveryEmail') || 'Enviar Correo' : t('login'))}
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
