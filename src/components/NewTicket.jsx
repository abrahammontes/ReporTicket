import React from 'react';

const NewTicket = ({ onCancel, onSubmit, t }) => {
  return (
    <div className="new-ticket">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{t('submitNewTicket')}</h2>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('yourName')}</label>
            <input type="text" placeholder={t('yourName')} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('emailAddress')}</label>
            <input type="email" placeholder={t('emailAddress')} />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('department')}</label>
          <select>
            <option value="support">{t('support')}</option>
            <option value="sales">{t('sales')}</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('subject')}</label>
          <input type="text" placeholder="..." />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('description')}</label>
          <textarea placeholder="..." style={{ minHeight: '150px' }}></textarea>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={onSubmit} className="btn-primary">{t('initializeTicket')}</button>
        </div>
      </div>
    </div>
  );
};

export default NewTicket;
