import React from 'react';

const UserGuide = ({ t, language }) => {
  const steps = [
    { title: t('guideStep1'), icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>) },
    { title: t('guideStep2'), icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M12 4v16"/><path d="M5 12h14"/></svg>) },
    { title: t('guideStep3'), icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/></svg>) },
    { title: t('guideStep4'), icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l4 4-4 4-4-4 4-4z"/><path d="M2 22h20"/></svg>) }
  ];

  return (
    <div className="user-guide">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{t('guideTitle')}</h2>
      
      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        {steps.map((step, index) => (
          <div key={index} className="glass-panel" style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            gap: '1.5rem', 
            alignItems: 'center',
            animation: `fadeInUp 0.3s ease forwards ${index * 0.1}s`,
            opacity: 0
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              minWidth: '50px', 
              borderRadius: '12px', 
              background: 'rgba(99, 102, 241, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.5rem',
              color: 'var(--primary)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              {step.icon}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'Step' : 'Paso'} {index + 1}
              </p>
              <p style={{ fontSize: '1rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default UserGuide;
