import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { dbService } from '../services/db';

const ResetPassword = ({ theme, t, onBack }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const showMismatch = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError(t('invalidToken') || 'Token inválido o ausente.');
    }
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch') || 'Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError(t('passwordTooShort') || 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      await dbService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
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
      <div className={`glass-panel ${error ? 'shake' : ''}`} style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Logo theme={theme} size={160} />
          <h2 style={{ marginTop: '1.5rem', fontSize: '1.5rem' }}>
            {t('resetPassword')}
          </h2>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{t('passwordResetSuccess')}</h3>
            <button 
              onClick={onBack}
              className="btn-primary" 
              style={{ padding: '1rem', width: '100%' }}
            >
              {t('backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.75rem',
                color: '#f87171',
                fontSize: '0.85rem'
              }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                {t('newPassword')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength="8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-btn"
                  style={{ right: '0.5rem' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                {t('confirmNewPassword') || 'Confirmar Nueva Contraseña'}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); }}
                onBlur={() => setConfirmTouched(true)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  borderColor: showMismatch ? '#f87171' : passwordsMatch ? '#4ade80' : undefined,
                  transition: 'border-color 0.2s'
                }}
              />
              {showMismatch && (
                <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                  {t('passwordsDontMatch') || 'Las contraseñas no coinciden.'}
                </span>
              )}
              {passwordsMatch && (
                <span style={{ color: '#4ade80', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                  ✓
                </span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '1rem', height: '3.5rem' }}
              disabled={isLoading || !token}
            >
              {isLoading ? '...' : t('saveNewPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
