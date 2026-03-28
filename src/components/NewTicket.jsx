import React from 'react';

const NewTicket = ({ onCancel, onSubmit, t, user }) => {
  const [formData, setFormData] = React.useState({
    subject: '',
    department: 'support',
    description: '',
    name: user?.name || '',
    email: user?.email || ''
  });
  const [attachments, setAttachments] = React.useState([]);
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedExtensions = ['jpg', 'png', 'pdf', 'doc', 'docx', 'tiff', 'xls', 'xlsx'];
    
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return allowedExtensions.includes(ext);
    });

    setAttachments(prev => [...prev, ...validFiles.map(f => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      type: f.type,
      id: Math.random().toString(36).substr(2, 9)
    }))]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = () => {
    onSubmit({ ...formData, attachments });
  };

  return (
    <div className="new-ticket">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{t('submitNewTicket')}</h2>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('yourName')}</label>
            <input 
              type="text" 
              placeholder={t('yourName')} 
              value={formData.name}
              disabled
              style={{ background: 'var(--bg-hover)', cursor: 'not-allowed', opacity: 0.7 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('emailAddress')}</label>
            <input 
              type="email" 
              placeholder={t('emailAddress')} 
              value={formData.email}
              disabled
              style={{ background: 'var(--bg-hover)', cursor: 'not-allowed', opacity: 0.7 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('department')}</label>
          <select 
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
          >
            <option value="support">{t('support')}</option>
            <option value="sales">{t('sales')}</option>
            <option value="billing">{t('billing')}</option>
            <option value="accounting">{t('accounting')}</option>
            <option value="accountsPayable">{t('accountsPayable')}</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('subject')}</label>
          <input 
            type="text" 
            placeholder="..." 
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('description')}</label>
          <textarea 
            placeholder="..." 
            style={{ minHeight: '120px' }}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>

        {/* Attachment Section */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('attachFiles')}</label>
          <div 
            className="drop-zone"
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              handleFileChange({ target: { files: e.dataTransfer.files } });
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', opacity: 0.7 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('dropFiles')}</p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', opacity: 0.5 }}>{t('allowedFormats')}</p>
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.tiff,.xls,.xlsx"
            />
          </div>

          {attachments.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attachments.map(file => (
                <div key={file.id} className="attachment-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span style={{ fontSize: '0.9rem' }}>{file.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({file.size})</span>
                  </div>
                  <button 
                    onClick={() => removeAttachment(file.id)}
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.25rem' }}
                    title={t('removeFile')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={onCancel} 
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
            {t('goBack')}
          </button>
          <button onClick={handleSubmit} className="btn-primary">{t('initializeTicket')}</button>
        </div>
      </div>
    </div>
  );
};

export default NewTicket;
