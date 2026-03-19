import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';

const TicketDetail = ({ ticket, onBack, t, onUpdate, userRole, user }) => {
  const [localTicket, setLocalTicket] = useState({
    ...ticket,
    status: ticket.status === 'pending' ? 'inprogress' : (ticket.status || 'new')
  });
  const [newNote, setNewNote] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Ref for auto-resize
  const textareaRef = useRef(null);

  // Auto-resize effect
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '120px'; // Reset to min
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(120, scrollHeight) + 'px';
    }
  }, [newNote]);

  // Closure Ritual States
  const [isClosingRitual, setIsClosingRitual] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [captchaInput, setCaptchaInput] = useState('');
  const [closingError, setClosingError] = useState('');

  const isTicketClosed = localTicket.status === 'closed';
  const isRestricted = isTicketClosed && userRole !== 'admin';

  if (!localTicket) return null;

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 5) + 1;
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
    setCaptchaInput('');
    setClosingError('');
  };

  const handleFieldChange = (field, value) => {
    if (isRestricted) return; // Full lock
    if (field === 'status' && value === 'closed' && userRole === 'customer') {
      generateCaptcha();
      setIsClosingRitual(true);
      return;
    }
    setPendingUpdates(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmClosure = () => {
    if (!closureNotes.trim()) {
      setClosingError(t('notesRequired'));
      return;
    }
    if (parseInt(captchaInput) !== captcha.a) {
      setClosingError(t('invalidCaptcha'));
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();

    // Process closure with localized rich audit info
    const closureNote = {
      id: Date.now().toString(),
      text: `[${t('closureAuditPrefix')}] - ${t('auditBy')}: ${user?.name || 'User'} | ${t('auditDate')}: ${date} | ${t('auditTime')}: ${time} | ${t('auditCaptcha')}: ${captcha.a} | ${t('auditReason')}: ${closureNotes}`,
      user: user?.name || localTicket.user,
      date: date,
      isInternal: false,
      isClosure: true
    };

    const updated = dbService.updateTicket(localTicket.id, {
      status: 'closed',
      notes: [...(localTicket.notes || []), closureNote]
    });

    if (updated) {
      setLocalTicket(updated);
      setIsClosingRitual(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      if (onUpdate) onUpdate();
    }
  };

  const handleSaveSettings = () => {
    const updated = dbService.updateTicket(localTicket.id, pendingUpdates);
    if (updated) {
      setLocalTicket(updated);
      setPendingUpdates({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      if (onUpdate) onUpdate();
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const notes = localTicket.notes || [];
    const updated = dbService.updateTicket(localTicket.id, {
      notes: [...notes, {
        id: Date.now(),
        text: newNote,
        type: isInternal ? 'internal' : 'public',
        date: new Date().toLocaleString()
      }]
    });
    if (updated) {
      setLocalTicket(updated);
      setNewNote('');
      if (onUpdate) onUpdate();
    }
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    const words = value.trim().split(/\s+/).filter(Boolean).length;

    if (words <= 100) {
      setNewNote(value);
      // Auto-resize
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  };

  const applyCannedResponse = (key) => {
    if (!key) return;
    let response = t(key);
    // Dynamic replacement of placeholders using square brackets
    response = response.replace('[name]', localTicket.user || '');
    response = response.replace('[id]', localTicket.id || '');
    response = response.replace('[date]', new Date().toLocaleDateString());
    response = response.replace('[agent]', user?.name || 'Agent');

    setNewNote(prev => prev + (prev ? '\n\n' : '') + response);
  };

  const insertVariable = (variable) => {
    if (!variable) return;
    setNewNote(prev => prev + variable);
  };

  const hasChanges = Object.keys(pendingUpdates).some(key => pendingUpdates[key] !== localTicket[key]);

  return (
    <div className="ticket-detail animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <button onClick={onBack} className="card-hover" style={{ 
          background: 'rgba(255,255,255,0.05)', 
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
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          {t('backToList')}
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span className={`badge badge-${(pendingUpdates.priority || localTicket.priority) || 'medium'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>{t((pendingUpdates.priority || localTicket.priority) || 'medium').toUpperCase()}</span>
          <span className={`badge badge-${pendingUpdates.status || localTicket.status}`} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>{t(pendingUpdates.status || localTicket.status).toUpperCase()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2.5rem' }}>
        <div className="main-info">
          <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                background: 'rgba(24, 193, 202, 0.1)', 
                color: 'var(--primary)', 
                borderRadius: '0.5rem', 
                fontSize: '0.85rem', 
                fontWeight: '800',
                marginTop: '0.25rem'
              }}>#{localTicket.id}</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', lineHeight: '1.2' }}>{localTicket.subject}</h2>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('originalMessage')}</p>
              <p style={{ color: 'var(--text-main)', lineHeight: '1.7', fontSize: '1rem' }}>
                {localTicket.description || t('noDescription')}
              </p>
            </div>
          </div>

          <div className="activity-section">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{t('recentActivity')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {(localTicket.notes || []).map(note => (
                <div key={note.id} className="glass-panel" style={{
                  padding: '1rem',
                  borderLeft: note.type === 'internal' ? '4px solid #facc15' : '1px solid var(--border-color)',
                  background: note.type === 'internal' ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: note.type === 'internal' ? '#facc15' : 'var(--primary)' }}>
                      {note.type === 'internal' ? t('internalNotes') : t('user')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{note.date}</span>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>{note.text}</p>
                </div>
              ))}
            </div>

            <div className="glass-panel" style={{ padding: '2rem', opacity: isRestricted ? 0.6 : 1, pointerEvents: isRestricted ? 'none' : 'auto' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t('postReply')}</h2>

            {!isRestricted && (
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginBottom: '1.25rem', 
                padding: '0.75rem',
                background: 'var(--glass-bg)',
                borderRadius: '0.85rem',
                border: '1px solid var(--border-color)',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginLeft: '0.25rem', letterSpacing: '0.02em' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    {t('quickResponses').toUpperCase()}
                  </label>
                  <select 
                    onChange={(e) => { applyCannedResponse(e.target.value); e.target.value = ''; }}
                    style={{ 
                      width: '100%', 
                      fontSize: '0.85rem', 
                      padding: '0.5rem 2.25rem 0.5rem 0.75rem', 
                      background: 'rgba(255,255,255,0.05) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-color)',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    <option value="">{t('select')}...</option>
                    <option value="responseGreeting">{t('variableUserName')}</option>
                    <option value="responseClosing">{t('responseClosing')}</option>
                    <option value="responseThankYou">{t('responseThankYou')}</option>
                  </select>
                </div>

                <div style={{ height: '30px', width: '1px', background: 'var(--border-color)', marginTop: '1rem' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginLeft: '0.25rem', letterSpacing: '0.02em' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    {t('variables').toUpperCase()}
                  </label>
                  <select 
                    onChange={(e) => { insertVariable(e.target.value); e.target.value = ''; }}
                    style={{ 
                      width: '100%', 
                      fontSize: '0.85rem', 
                      padding: '0.5rem 2.25rem 0.5rem 0.75rem', 
                      background: 'rgba(255,255,255,0.05) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-color)',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    <option value="">{t('select')}...</option>
                    <option value={`[${localTicket.user}]`}>{t('variableUserName')}</option>
                    <option value={`[#${localTicket.id}]`}>{t('variableTicketId')}</option>
                    <option value={`[${new Date().toLocaleDateString()}]`}>{t('variableCurrentDate')}</option>
                  </select>
                </div>
              </div>
            )}

              <textarea
                ref={textareaRef}
                value={newNote}
                onChange={handleNoteChange}
                placeholder={isRestricted ? t('ticketClosedRestricted') : t('typeMessage')}
                disabled={isRestricted}
                style={{
                  minHeight: '120px',
                  marginBottom: '0.5rem',
                  resize: 'none',
                  width: '100%',
                  overflow: 'hidden',
                  lineHeight: '1.5'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {newNote.trim().split(/\s+/).filter(Boolean).length} / 100 {t('words')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {userRole === 'admin' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                      {t('internalNotes')}
                    </label>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isRestricted}
                >
                  {t('sendMessage')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="management-sidebar">
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>{t('settings')}</h3>
              <button
                className="btn-primary"
                onClick={handleSaveSettings}
                disabled={!hasChanges}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  opacity: hasChanges ? 1 : 0.4,
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
              >
                {t('saveChanges')}
              </button>
            </div>
            {showSuccess && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '0.5rem',
                color: '#4ade80',
                fontSize: '0.8rem',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease'
              }}>
                {t('changesSaved')}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('status')}</label>
                <select
                  value={pendingUpdates.status || localTicket.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  style={{ width: '100%', opacity: isRestricted ? 0.6 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                  disabled={isRestricted}
                >
                  <option value="new">{t('new')}</option>
                  <option value="open">{t('open')}</option>
                  <option value="inprogress">{t('inprogress')}</option>
                  <option value="awaiting">{t('awaiting')}</option>
                  <option value="old">{t('old')}</option>
                  <option value="closed">{t('closed')}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('priority')}</label>
                <select
                  value={pendingUpdates.priority || localTicket.priority || 'medium'}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  style={{ width: '100%', opacity: isRestricted ? 0.6 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                  disabled={isRestricted}
                >
                  <option value="low">{t('low')}</option>
                  <option value="medium">{t('medium')}</option>
                  <option value="high">{t('high')}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('area')}</label>
                <select
                  value={pendingUpdates.department || localTicket.department || 'support'}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  style={{ width: '100%', opacity: isRestricted ? 0.6 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                  disabled={isRestricted}
                >
                  <option value="support">{t('departmentSupport')}</option>
                  <option value="sales">{t('departmentSales')}</option>
                </select>
              </div>

              <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('user')}</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{localTicket.user}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{t('date')}</p>
                <p style={{ fontSize: '0.9rem' }}>{localTicket.date}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isClosingRitual && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', border: '1px solid #f87171' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f87171' }}>⚠️ {t('confirmClosure')}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {t('closeWarning')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>{t('closureNotes')}*</label>
                <textarea
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder={t('typeMessage')}
                  style={{ height: '100px', resize: 'none' }}
                />
              </div>

              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{t('solveMath')}:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{captcha.q} = </span>
                  <input
                    type="number"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    style={{ width: '80px', textAlign: 'center', fontSize: '1.1rem' }}
                    placeholder="?"
                  />
                </div>
              </div>

              {closingError && (
                <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{closingError}</p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setIsClosingRitual(false)}
                  className="nav-link-btn"
                  style={{ width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirmClosure}
                  className="btn-primary"
                  style={{ width: '100%', background: '#ef4444' }}
                >
                  {t('confirmClosure')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
