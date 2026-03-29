import React, { useState, useRef, useEffect } from 'react';

const API_URL = '/api';

const VerifyEmail = ({ email, onVerified, onBack, t }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (idx, value) => {
    // Accept paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((d, i) => { if (idx + i < 6) newCode[idx + i] = d; });
      setCode(newCode);
      const nextIdx = Math.min(idx + digits.length, 5);
      inputs.current[nextIdx]?.focus();
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[idx] = value;
    setCode(newCode);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('¡Cuenta activada! Redirigiendo al inicio de sesión...');
        setTimeout(() => onVerified(), 1800);
      } else {
        setError(data.message || 'Código incorrecto.');
        setCode(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Nuevo código enviado. Revisa tu bandeja de entrada.');
        setResendCooldown(60);
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.message || 'No se pudo reenviar el código.');
      }
    } catch {
      setError('Error de conexión.');
    }
    setResendLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 32,
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
        }}>
          ✉️
        </div>

        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px' }}>
          Verifica tu correo
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.6 }}>
          Enviamos un código de 6 dígitos a
        </p>
        <p style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 32px' }}>
          {email}
        </p>

        {/* OTP Input boxes */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputs.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onFocus={e => e.target.select()}
              style={{
                width: 52, height: 60,
                textAlign: 'center',
                fontSize: '1.6rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                background: digit ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: digit ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                color: '#fff',
                outline: 'none',
                transition: 'all 0.2s',
                caretColor: '#6366f1',
              }}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Feedback messages */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            color: '#f87171', fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            color: '#34d399', fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || code.join('').length < 6}
          style={{
            width: '100%', padding: '14px 0',
            background: loading || code.join('').length < 6
              ? 'rgba(99,102,241,0.4)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: '1rem', fontWeight: 600,
            cursor: loading || code.join('').length < 6 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: 16,
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          {loading ? 'Verificando...' : 'Activar cuenta'}
        </button>

        {/* Resend */}
        <div style={{ marginBottom: 24 }}>
          {resendCooldown > 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Reenviar código en <strong style={{ color: '#94a3b8' }}>{resendCooldown}s</strong>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              style={{
                background: 'none', border: 'none',
                color: resendLoading ? '#64748b' : '#6366f1',
                fontSize: '0.875rem', cursor: resendLoading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline', fontWeight: 500,
              }}
            >
              {resendLoading ? 'Enviando...' : '¿No recibiste el código? Reenviar'}
            </button>
          )}
        </div>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 0', width: '100%',
            color: '#94a3b8', fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
