import React, { useState } from 'react';
import { dbService } from '../services/db';

const Profile = ({ user, t, onUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photo, setPhoto] = useState(user?.photo || null);
  const [success, setSuccess] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const result = await dbService.updateUserProfile(user.id, { name, email, photo });
      if (result.success) {
        // Since result.success is true, we update the local user state with new values
        const updatedUser = { ...user, name, email, photo };
        onUpdate(updatedUser);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  return (
    <div className="profile-page">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{t('profile')}</h2>
      
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              background: photo ? `url(${photo}) center/cover` : 'linear-gradient(45deg, var(--primary), var(--secondary))', 
              border: '4px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: 'white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              {!photo && (user?.name?.[0] || 'U')}
            </div>
            <label style={{ 
              position: 'absolute', 
              bottom: '0', 
              right: '0', 
              background: 'var(--primary)', 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              border: '2px solid var(--bg-main)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </label>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{t('profilePhoto')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('joinUs')}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('fullName')}</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder={t('enterNamePlaceholder')}
              disabled={user.role !== 'superadmin'}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('emailAddress')}</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('enterEmailPlaceholder')}
              disabled={user.role !== 'superadmin'}
            />
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('role')}</p>
            <p style={{ fontWeight: '600', textTransform: 'uppercase', color: 'var(--primary)' }}>{t(`roles.${user?.role || 'customer'}`)}</p>
          </div>

          {user.role !== 'superadmin' && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
              * Solo el Super Administrador puede editar nombres y correos.
            </p>
          )}

          {success && (
            <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
              {t('nameUpdated')}
            </div>
          )}

          <button className="btn-primary" onClick={handleSave} style={{ padding: '0.75rem' }}>
            {t('saveChanges')}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{t('settings')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('securitySettingsMsg')}</p>
      </div>
    </div>
  );
};

export default Profile;
