import React, { useState } from 'react';

const UserGuide = ({ t, language }) => {
  const [openSection, setOpenSection] = useState(null);

  const isEn = language === 'en';

  const sections = [
    {
      title: isEn ? 'Getting Started' : 'Primeros Pasos',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
      items: [
        isEn ? 'Log in with your email and password. Check the "I\'m not a robot" box.' : 'Ingresa con tu email y contraseña. Marca la casilla "No soy un robot".',
        isEn ? 'New companies: click "Register Company" to create your account and company automatically.' : 'Nuevas empresas: haz clic en "Registrar Empresa" para crear tu cuenta y empresa automáticamente.',
        isEn ? 'Forgot your password? Use the "Forgot Password?" link to receive a reset email.' : '¿Olvidaste tu contraseña? Usa el enlace "¿Olvidaste tu contraseña?" para recibir un email de restablecimiento.',
      ]
    },
    {
      title: isEn ? 'Dashboard & Statistics' : 'Dashboard y Estadísticas',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
      items: [
        isEn ? 'Total Tickets: all visible tickets in your company.' : 'Total Tickets: todos los tickets visibles en tu empresa.',
        isEn ? 'Open Tickets: active tickets (not closed).' : 'Tickets Abiertos: tickets activos (no cerrados).',
        isEn ? 'Overdue: tickets with "Old" status.' : 'Vencidos: tickets con estado "Antiguo".',
        isEn ? 'Unassigned: tickets without an assigned agent.' : 'Sin Asignar: tickets sin agente asignado.',
        isEn ? 'Click any stat card to filter the activity list.' : 'Haz clic en cualquier tarjeta para filtrar la lista de actividad.',
      ]
    },
    {
      title: isEn ? 'Create a Ticket' : 'Crear un Ticket',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
      items: [
        isEn ? 'Click "New Ticket" in the sidebar.' : 'Haz clic en "Nuevo Ticket" en la barra lateral.',
        isEn ? 'Your name and email are auto-filled.' : 'Tu nombre y email se completan automáticamente.',
        isEn ? 'Select a department: Support, Sales, Billing, Accounting, or Accounts Payable.' : 'Selecciona un departamento: Soporte, Ventas, Facturación, Contabilidad o Cuentas por Pagar.',
        isEn ? 'Write a subject and description of your issue.' : 'Escribe un asunto y descripción de tu problema.',
        isEn ? 'Optionally attach files (drag & drop or click): jpg, png, pdf, doc, xls.' : 'Opcionalmente adjunta archivos (arrastrar o hacer clic): jpg, png, pdf, doc, xls.',
        isEn ? 'Click "Create Ticket" to submit.' : 'Haz clic en "Crear Ticket" para enviar.',
      ]
    },
    {
      title: isEn ? 'Ticket Detail & Replies' : 'Detalle del Ticket y Respuestas',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
      items: [
        isEn ? 'Public notes: visible to customers and agents.' : 'Notas públicas: visibles para clientes y agentes.',
        isEn ? 'Internal notes (yellow): visible only to agents and admins.' : 'Notas internas (amarillo): solo visibles para agentes y admins.',
        isEn ? 'Quick responses: pre-written messages to speed up replies.' : 'Respuestas rápidas: mensajes predefinidos para agilizar respuestas.',
        isEn ? 'Dynamic variables: [Customer Name], [Ticket ID], [Current Date].' : 'Variables dinámicas: [Nombre del Cliente], [ID del Ticket], [Fecha Actual].',
        isEn ? 'Maximum 100 words per note.' : 'Máximo 100 palabras por nota.',
        isEn ? 'Drag & drop or click to attach files to your reply.' : 'Arrastra o haz clic para adjuntar archivos a tu respuesta.',
      ]
    },
    {
      title: isEn ? 'Ticket Statuses' : 'Estados del Ticket',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
      items: [
        isEn ? 'New: just created, not yet reviewed.' : 'Nuevo: recién creado, sin revisar.',
        isEn ? 'Open: review started.' : 'Abierto: revisión iniciada.',
        isEn ? 'In Progress: agent actively working on it.' : 'En Progreso: agente trabajando activamente.',
        isEn ? 'Awaiting Reply: waiting for customer response.' : 'Esperando Respuesta: esperando respuesta del cliente.',
        isEn ? 'Old: stale/overdue ticket.' : 'Antiguo: ticket estancado o vencido.',
        isEn ? 'Closed: resolved. Only admins can reopen.' : 'Cerrado: resuelto. Solo admins pueden reabrir.',
      ]
    },
    {
      title: isEn ? 'Closing a Ticket (Customers)' : 'Cerrar un Ticket (Clientes)',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
      items: [
        isEn ? 'When you close a ticket, the "Closure Ritual" activates.' : 'Al cerrar un ticket, se activa el "Ritual de Cierre".',
        isEn ? 'You must write closure notes explaining the resolution.' : 'Debes escribir notas de cierre explicando la resolución.',
        isEn ? 'A math captcha must be solved to confirm (e.g., "7 + 3 = ?").' : 'Debes resolver un captcha matemático para confirmar (ej: "7 + 3 = ?").',
        isEn ? 'An audit log is created with your name, date, and reason.' : 'Se crea un registro de auditoría con tu nombre, fecha y razón.',
        isEn ? 'Closed tickets are read-only for customers. Only admins can reopen.' : 'Los tickets cerrados son de solo lectura. Solo admins pueden reabrir.',
      ]
    },
    {
      title: isEn ? 'Admin: User & Company Management' : 'Admin: Gestión de Usuarios y Empresas',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
      items: [
        isEn ? 'Create users: name, email, password, role, company.' : 'Crear usuarios: nombre, email, contraseña, rol, empresa.',
        isEn ? 'Edit users inline: name, role, company assignment.' : 'Editar usuarios inline: nombre, rol, asignación de empresa.',
        isEn ? 'Permissions modal: toggle View All Tickets, Assign Tickets, Manage Users, Manage Companies.' : 'Modal de permisos: activar Ver Todos los Tickets, Asignar Tickets, Gestionar Usuarios, Gestionar Empresas.',
        isEn ? 'Super Admin: create/edit/delete companies with dedicated databases.' : 'Super Admin: crear/editar/eliminar empresas con bases de datos dedicadas.',
        isEn ? 'You cannot delete your own account.' : 'No puedes eliminar tu propia cuenta.',
      ]
    },
    {
      title: isEn ? 'Profile & Settings' : 'Perfil y Configuración',
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
      items: [
        isEn ? 'Profile photo: click the camera icon. Auto-compressed and saved instantly.' : 'Foto de perfil: haz clic en el ícono de cámara. Se comprime y guarda automáticamente.',
        isEn ? 'Toggle Dark/Light theme from the sidebar.' : 'Alterna tema Oscuro/Claro desde la barra lateral.',
        isEn ? 'Switch language: Spanish / English from the sidebar.' : 'Cambia idioma: Español / Inglés desde la barra lateral.',
        isEn ? 'Super Admin: configure SMTP email and database connection in Settings.' : 'Super Admin: configura SMTP y base de datos en Configuración.',
      ]
    },
  ];

  return (
    <div className="user-guide">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('userGuide')}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {isEn ? 'Everything you need to know to use ReporTicket.' : 'Todo lo que necesitas saber para usar ReporTicket.'}
      </p>

      <div style={{ display: 'grid', gap: '1rem', maxWidth: '800px' }}>
        {sections.map((section, i) => (
          <div key={i} className="glass-panel" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setOpenSection(openSection === i ? null : i)}
              style={{
                width: '100%',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '44px', height: '44px', minWidth: '44px', borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                {section.icon}
              </div>
              <span style={{ flex: 1, fontWeight: 600, fontSize: '1rem' }}>{section.title}</span>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2"
                style={{ transform: openSection === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {openSection === i && (
              <div style={{ padding: '0 1.5rem 1.25rem 4.5rem' }}>
                <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {section.items.map((item, j) => (
                    <li key={j} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserGuide;
