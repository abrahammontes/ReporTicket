import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';

const Register = ({ onRegister, onLogin, onBack, t, error, language, setLanguage }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryPrefix, setCountryPrefix] = useState('+52');
  const [extension, setExtension] = useState('');
  const [isRobotChecked, setIsRobotChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [localError, setLocalError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

   const handleRegister = async () => {
     setLocalError(null);
     if (honeypot) return;
     if (!isRobotChecked) {
       setLocalError(t('captchaRequired'));
       return;
     }
     
     const isValidPassword = password.length >= 8;
     if (!isValidPassword) {
       setLocalError(t('passwordRequirementsError') || 'La contraseña debe tener al menos 8 caracteres.');
       return;
     }
 
     setIsLoading(true);
     try {
       // Create a timeout promise (10 seconds)
       const timeoutPromise = new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Request timeout')), 10000)
       );
       
       // Race between the actual request and timeout
       await Promise.race([
         onRegister({ 
           name, 
           email, 
           password, 
           phone: `${countryPrefix} ${phone}`, 
           extension
         }),
         timeoutPromise
       ]);
     } catch (err) {
       // Handle timeout specifically
       if (err.message === 'Request timeout') {
         setLocalError(t('registrationTimeout') || 'La solicitud ha tardado demasiado. Por favor, verifique su conexión e intente nuevamente.');
       } else {
         setLocalError(err.message);
       }
     } finally {
       setIsLoading(false);
     }
   };

  return (
    <div className="register-page animate-in" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem', 
      background: 'transparent' 
    }}>
      <div className={`glass-panel ${localError ? 'shake' : ''}`} style={{ 
        width: '100%', 
        maxWidth: '480px', 
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
           <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ flex: 1 }}>
               <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('fullName')}</label>
               <input 
                 type="text" 
                 placeholder={t('enterNamePlaceholder')} 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 required
               />
             </div>
             <div style={{ flex: 1 }}>
               <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('emailAddress')}</label>
               <input 
                 type="email" 
                 placeholder={t('enterEmailPlaceholder')} 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
               />
             </div>
           </div>
           <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ flex: 1 }}>
               <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('password')}</label>
               <div style={{ position: 'relative' }}>
                   <input 
                     type={showPassword ? "text" : "password"} 
                     placeholder="••••••••" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     minLength="8"
                     style={{ width: '100%', paddingRight: '2.5rem' }}
                   />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   style={{
                     position: 'absolute',
                     right: '0.75rem',
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
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                   )}
                 </button>
               </div>
               <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                 {t('passwordMinLength') || 'Mínimo 8 caracteres.'}
               </p>
             </div>
           </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('phone')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={countryPrefix}
                  onChange={(e) => setCountryPrefix(e.target.value)}
                  style={{ 
                    width: '100px', 
                    padding: '0.65rem 0.5rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+506">🇨🇷 +506</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+507">🇵🇦 +507</option>
                  <option value="+51">🇵🇪 +51</option>
                  <option value="+58">🇻🇪 +58</option>
                  <option value="+502">🇬🇹 +502</option>
                  <option value="+503">🇸🇻 +503</option>
                  <option value="+593">🇪🇨 +593</option>
                </select>
                <input 
                  type="tel" 
                  placeholder={t('enterPhonePlaceholder')} 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('extension')}</label>
              <input 
                type="text" 
                placeholder={t('enterExtensionPlaceholder')} 
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
          
          <button 
            onClick={handleRegister} 
            className="btn-primary" 
            style={{ marginTop: '0.5rem', padding: '1rem', height: '3.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? (t('registering') || 'Registrando...') : t('register')}
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
