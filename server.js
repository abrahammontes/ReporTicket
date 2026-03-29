import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption/Decryption Utility
const CONFIG_KEY_PATH = path.join(__dirname, 'config.key');
let masterKey;
try {
  if (fs.existsSync(CONFIG_KEY_PATH)) {
    masterKey = fs.readFileSync(CONFIG_KEY_PATH);
    if (masterKey.length !== 32) {
      // Re-generate if key is invalid length
      masterKey = crypto.randomBytes(32);
      fs.writeFileSync(CONFIG_KEY_PATH, masterKey);
    }
  } else {
    masterKey = crypto.randomBytes(32);
    fs.writeFileSync(CONFIG_KEY_PATH, masterKey);
    console.log('New master encryption key generated.');
  }
} catch (e) {
  console.error('Crypto error:', e.message);
  masterKey = Buffer.alloc(32, 'repor-ticket-fallback-secure-key');
}

const encrypt = (text) => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (e) {
    console.error('Encryption error:', e.message);
    return text;
  }
};

const decrypt = (text) => {
  if (!text || !text.includes(':')) return text;
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Master Database Initial Configuration
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'reporticket_master',
  mode: process.env.DB_MODE || 'single',
  prefix: process.env.DB_PREFIX || ''
};

// Load local override if exists
const DB_OVERRIDE_PATH = path.join(__dirname, 'db_config.json');
try {
  if (fs.existsSync(DB_OVERRIDE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(DB_OVERRIDE_PATH, 'utf8'));
    // Decrypt password if it looks encrypted
    if (saved.password && saved.password.includes(':')) {
      saved.password = decrypt(saved.password);
    }
    dbConfig = { ...dbConfig, ...saved };
    console.log('Database configuration loaded and decrypted from db_config.json');
  }
} catch (e) {
  console.error('Error loading db_config.json:', e.message);
}

// Ensure the initial pool uses the final decrypted dbConfig
let masterPool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to update Master Pool
const updateMasterPool = (newConfig) => {
  const oldPool = masterPool;
  dbConfig = { ...dbConfig, ...newConfig };
  
  masterPool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port || 3306,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  if (oldPool) {
    oldPool.end().catch(err => console.error('Error closing old pool:', err.message));
  }

  // Clear company pools cache since they might depend on master
  companyPools.clear();
  return masterPool;
};

app.get('/api/system-info', (req, res) => {
  res.json({
    dbMode: dbConfig.mode,
    dbHost: dbConfig.host,
    dbPort: dbConfig.port,
    dbUser: dbConfig.user,
    dbName: dbConfig.database,
    dbPrefix: dbConfig.prefix,
    version: '1.2.0'
  });
});

app.get('/api/health-check', async (req, res) => {
  const start = Date.now();
  let conn;
  try {
    // Attempt to get a real connection from the pool
    conn = await masterPool.getConnection();
    // Perform a low-level ping
    await conn.ping();
    const latency = Date.now() - start;
    res.json({ success: true, latency, status: 'healthy' });
  } catch (error) {
    console.error('Database Health Check Failed:', error.message);
    res.json({ 
      success: false, 
      latency: Date.now() - start, 
      status: 'offline', 
      error: error.message 
    });
  } finally {
    if (conn) conn.release();
  }
});

// Cache for company-specific pools
const companyPools = new Map();

const getCompanyPool = async (companyId) => {
  if (process.env.DB_MODE === 'single') {
    return masterPool;
  }

  if (companyPools.has(companyId)) {
    return companyPools.get(companyId);
  }

  const [companies] = await masterPool.query('SELECT db_name FROM companies WHERE id = ?', [companyId]);
  if (companies.length === 0) return null;

  const dbName = companies[0].db_name;
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  companyPools.set(companyId, pool);
  return pool;
};

// Middleware to resolve company pool
const withCompanyPool = async (req, res, next) => {
  const companyId = req.headers['x-company-id'];
  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Missing X-Company-ID header' });
  }

  try {
    const pool = await getCompanyPool(companyId);
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Company not found or database not initialized' });
    }
    req.db = pool;
    req.companyId = companyId;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Ticket Notification Helpers
const getTicketInvolvedParties = async (ticketId, companyId, db) => {
  try {
    console.log(`Searching involved parties for ticket ${ticketId} in company ${companyId}`);
let ticketQuery = 'SELECT t.subject, t.user_id, t.agent_id, t.company_id, t.created_at, t.updated_at, u.email as customer_email, u.name as customer_name ' +
                       'FROM tickets t ' +
                       'LEFT JOIN company_users u ON t.user_id = u.id AND (u.company_id = t.company_id OR ? = "master") ' +
                       'WHERE t.id = ?';
    let ticketParams = [companyId, ticketId];
    
    const [tickets] = await db.query(ticketQuery, ticketParams);
    if (tickets.length === 0) {
      console.warn(`[NOTIF] Ticket ${ticketId} not found in database search.`);
      return null;
    }
    const ticket = tickets[0];
    const actualCompanyId = ticket.company_id || companyId;
    console.log(`[NOTIF] Found ticket: ${ticket.subject}, customer: ${ticket.customer_email}, actualCompanyId: ${actualCompanyId}`);

    const involved = [];
    if (ticket.customer_email) {
      involved.push({ email: ticket.customer_email, name: ticket.customer_name, role: 'customer' });
    }

    // 2. Get Agent info if assigned
    if (ticket.agent_id) {
        let agentQuery = 'SELECT email, name FROM company_users WHERE id = ?';
        let agentParams = [ticket.agent_id];
        if (process.env.DB_MODE === 'single') {
            agentQuery += ' AND company_id = ?';
            agentParams.push(actualCompanyId);
        }
        const [agents] = await db.query(agentQuery, agentParams);
        if (agents.length > 0 && agents[0].email) {
            console.log(`[NOTIF] Adding agent: ${agents[0].email}`);
            involved.push({ email: agents[0].email, name: agents[0].name, role: 'agent' });
        }
    }

    // 3. Get Supervisors info
    let supervisorQuery = "SELECT email, name FROM company_users WHERE role = 'supervisor'";
    let supervisorParams = [];
    if (process.env.DB_MODE === 'single') {
        supervisorQuery += ' AND company_id = ?';
        supervisorParams.push(actualCompanyId);
    }
    const [supervisors] = await db.query(supervisorQuery, supervisorParams);
    supervisors.forEach(s => {
        if (s.email && !involved.some(p => p.email === s.email)) {
            console.log(`[NOTIF] Adding supervisor: ${s.email}`);
            involved.push({ email: s.email, name: s.name, role: 'supervisor' });
        }
    });

    return {
        subject: ticket.subject,
        parties: involved
    };
  } catch (err) {
    console.error('Error getting involved parties:', err);
    return null;
  }
};

const sendTicketEmailNotification = async (ticketId, companyId, db, updateType, updateDetails = {}) => {
  try {
    console.log(`[NOTIF] Triggered for Ticket: ${ticketId}, Company: ${companyId}, Type: ${updateType}`);
    const settings = await getSystemSettings();
    const config = settings.smtpConfig || {};
    if (!config || !config.smtpHost) {
      console.warn(`[NOTIF] SMTP not configured in global_settings. Skipping notification for ${ticketId}.`);
      return;
    }
    console.log(`[NOTIF] Using SMTP: ${config.smtpHost}:${config.smtpPort} (${config.smtpUser})`);

    const data = await getTicketInvolvedParties(ticketId, companyId, db);
    if (!data || data.parties.length === 0) {
      console.warn('No involved parties found for ticket:', ticketId);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      tls: { rejectUnauthorized: false }
    });

     const creationTimestamp = new Date(data.created_at).toLocaleString('es-MX', { 
         timeZone: 'America/Mexico_City',
         dateStyle: 'long',
         timeStyle: 'medium'
     });
     
     const modificationTimestamp = new Date(data.updated_at).toLocaleString('es-MX', { 
         timeZone: 'America/Mexico_City',
         dateStyle: 'long',
         timeStyle: 'medium'
     });

    for (const party of data.parties) {
        let title = '';
        let body = '';
        
        switch (updateType) {
            case 'new_ticket':
                title = 'Nuevo Ticket Registrado';
                body = `Se ha creado el ticket <strong>#${ticketId}</strong> con el asunto: <em>${data.subject}</em>.`;
                break;
            case 'status_change':
                title = 'Actualización de Estado';
                body = `El ticket <strong>#${ticketId}</strong> ha cambiado su estado a <strong>${updateDetails.newStatus || 'actualizado'}</strong>.`;
                break;
            case 'new_note':
                if (updateDetails.isInternal && party.role === 'customer') continue; 
                title = 'Nueva Respuesta en Ticket';
                body = `Se ha añadido una nueva respuesta al ticket <strong>#${ticketId}</strong>.`;
                break;
            default:
                title = 'Actualización de Ticket';
                body = `Se ha realizado una modificación en el ticket <strong>#${ticketId}</strong>.`;
        }

        const mailOptions = {
            from: `"ReporTicket Notificaciones" <${config.smtpUser}>`,
            to: party.email,
            subject: `[${ticketId}] ${title}: ${data.subject}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #6366f1; margin: 0;">ReporTicket</h1>
                        <p style="color: #666; font-size: 0.9rem;">Gestión de Servicios Administrados</p>
                    </div>
                    <h2 style="color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">${title}</h2>
                    <p>Hola <strong>${party.name}</strong>,</p>
                    <p style="line-height: 1.5;">${body}</p>
                    
                     <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0;">
                         <p style="margin: 0; font-size: 0.9rem; color: #4b5563;">
                             <strong>Fecha de Creación:</strong> ${creationTimestamp}<br>
                             <strong>Última Modificación:</strong> ${modificationTimestamp}
                         </p>
                     </div>

                    <p style="font-size: 0.85rem; color: #9ca3af; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px;">
                        Este es un correo automático generado por el sistema de trazabilidad de ReporTicket. 
                        No es necesario responder a esta dirección.
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error(`Failed to send email to ${party.email}:`, mailErr.message);
        }
    }
  } catch (err) {
    console.error('Notification system error:', err);
  }
};

app.post('/api/send-test-email', async (req, res) => {

  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, testEmail } = req.body;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !testEmail) {
    return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
  }

  try {
    // Create transporter
    // If password looks encrypted (contains ':'), decrypt it first
    const finalPass = (smtpPass && smtpPass.includes(':')) ? decrypt(smtpPass) : smtpPass;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: finalPass,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: `"ReporTicket" <${smtpUser}>`,
      to: testEmail,
      subject: "Prueba de Configuración SMTP - ReporTicket",
      text: "¡Felicidades! Tu configuración SMTP funciona correctamente.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6366f1;">ReporTicket - Confirmación de SMTP</h2>
          <p>Esta es una prueba generada automáticamente para confirmar que los parámetros de tu servidor de correo son correctos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.85rem; color: #666;">Si has recibido este correo, significa que tu panel de administración ya está listo para enviar notificaciones reales.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Email sent successfully!', messageId: info.messageId });
  } catch (error) {
    console.error('SMTP Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'SMTP Error: ' + error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

app.post('/api/settings/database/test', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const testPool = mysql.createPool({
      host,
      port: parseInt(port) || 3306,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 5000
    });
    const [rows] = await testPool.query('SELECT 1');
    await testPool.end();
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/settings/database/save', async (req, res) => {
  const { host, port, user, password, database, mode } = req.body;
  try {
    const updatedConfig = { host, port: parseInt(port) || 3306, user, database, mode };
    if (password && password.trim() !== '') {
      updatedConfig.password = password;
    }
    
    // 1. Update In-Memory Config and Pool
    updateMasterPool(updatedConfig);
    
    // 2. Persist to Local File (Primary source of truth for bootstrapping)
    const configToSave = { ...dbConfig };
    if (configToSave.password) {
      configToSave.password = encrypt(configToSave.password);
    }
    fs.writeFileSync(DB_OVERRIDE_PATH, JSON.stringify(configToSave, null, 2));
    
    // 3. Persist to DB if possible (Secondary backup)
    try {
      const configStr = JSON.stringify(configToSave);
      await masterPool.execute(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['dbConfig', configStr, configStr]
      );
    } catch (dbErr) {
      console.warn('Non-critical: Failed to save DB config to database:', dbErr.message);
    }

    res.json({ success: true, message: 'Database configuration saved and applied persistently.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to safely parse JSON columns
const parsePermissions = (data) => {
  if (!data) return { viewAllTickets: false, assignTickets: false, manageUsers: false, manageCompanies: false };
  if (typeof data === 'object') return data;
  try {
    const parsed = JSON.parse(data);
    return typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
};

// Helper to get system settings
const getSystemSettings = async () => {
  try {
    const [rows] = await masterPool.query('SELECT * FROM global_settings');
    const settings = {};
    rows.forEach(row => {
      try {
        let val = JSON.parse(row.setting_value);
        // Decrypt SMTP password if present
        if (row.setting_key === 'smtpConfig' && val && val.smtpPass) {
          val.smtpPass = decrypt(val.smtpPass);
        }
        // Decrypt DB config password if present (for UI)
        if (row.setting_key === 'dbConfig' && val && val.password) {
          val.password = decrypt(val.password);
        }
        settings[row.setting_key] = val;
      } catch (e) {
        settings[row.setting_key] = row.setting_value;
      }
    });
    return settings;
  } catch (err) {
    console.error('Error fetching settings:', err);
    return {};
  }
};

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // 1. Check if user exists
    const [users] = await masterPool.query('SELECT * FROM global_directory WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Generate Token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // 3. Save to master DB
    await masterPool.execute(
      'UPDATE global_directory SET reset_token = ?, reset_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    // 4. Send Email
    const settings = await getSystemSettings();
    const smtp = settings.smtpConfig || {};
    
    if (!smtp.smtpHost) {
      return res.status(500).json({ success: false, message: 'SMTP not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.smtpHost,
      port: parseInt(smtp.smtpPort),
      secure: smtp.smtpSecure,
      auth: { user: smtp.smtpUser, pass: smtp.smtpPass },
      tls: { rejectUnauthorized: false }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: `"ReporTicket" <${smtp.smtpUser}>`,
      to: email,
      subject: "Recuperación de Contraseña - ReporTicket",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Recuperación de Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
          <a href="${resetUrl}" style="display:inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Restablecer Contraseña</a>
          <p>Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Reset email sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    // 1. Find user by token
    const [users] = await masterPool.query(
      'SELECT * FROM global_directory WHERE reset_token = ? AND reset_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Token invalid or expired' });
    }

    const user = users[0];

    // 2. Hash and update password in Global Directory
    const hashedPassword = await bcrypt.hash(password, 10);
    await masterPool.execute(
      'UPDATE global_directory SET password = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?',
      [hashedPassword, user.email]
    );

    // 3. Update password in Company Tables
    if (user.company_id) {
      const pool = await getCompanyPool(user.company_id);
      if (pool) {
        if (process.env.DB_MODE === 'single') {
          await pool.execute('UPDATE company_users SET password = ? WHERE id = ? AND company_id = ?', [hashedPassword, user.user_id, user.company_id]);
        } else {
          await pool.execute('UPDATE company_users SET password = ? WHERE id = ?', [hashedPassword, user.user_id]);
        }
      }
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post('/api/send-welcome-email', async (req, res) => {
  const { userData } = req.body;
  const settings = await getSystemSettings();
  const config = settings.smtpConfig || {};

  if (!config.smtpHost) return res.status(500).json({ success: false, message: 'SMTP not configured' });

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: parseInt(config.smtpPort),
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions = {
    from: `"ReporTicket Support" <${config.smtpUser}>`,
    to: userData.email,
    subject: `¡Bienvenido a ReporTicket, ${userData.name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6366f1;">¡Ya eres parte de nuestra plataforma!</h2>
        <p>Hola <strong>${userData.name}</strong>,</p>
        <p>Tu cuenta ha sido creada con éxito. Ahora puedes acceder a nuestro portal de soporte para gestionar tus tickets de manera eficiente.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px;">Instrucciones para comenzar:</h3>
          <ul style="padding-left: 20px; color: #4b5563;">
            <li>Ingresa con tu correo: <strong>${userData.email}</strong></li>
            <li>Usa la contraseña que configuraste en el registro.</li>
            <li>En tu panel principal podrás ver el botón "Crear Ticket" para enviar tus solicitudes.</li>
          </ul>
        </div>
        <p>Si tienes alguna duda, nuestro equipo está a tu disposición.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
          Este es un correo automático, por favor no respondas a este mensaje.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notify-registration', async (req, res) => {
  const { userData, companyName, adminEmails } = req.body;
  const settings = await getSystemSettings();
  const config = settings.smtpConfig || {};

  if (!config.smtpHost) return res.status(500).json({ success: false, message: 'SMTP not configured' });

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: parseInt(config.smtpPort),
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { rejectUnauthorized: false }
  });

  // Unique set of emails to avoid duplicate notifications
  const recipients = [...new Set(adminEmails)];

  const mailOptions = {
    from: `"ReporTicket System" <${config.smtpUser}>`,
    to: recipients.join(', '),
    subject: `Nueva Registro: ${userData.name} - ${companyName || 'Sin Empresa'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #7c3aed; border-radius: 10px;">
        <h2 style="color: #7c3aed;">&#x1F514; Notificación de Nuevo Registro</h2>
        <p>Se ha registrado un nuevo usuario en la plataforma:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Nombre:</strong> ${userData.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
          <p style="margin: 5px 0;"><strong>Empresa:</strong> ${companyName || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${userData.phone || 'N/A'}</p>
        </div>
        <p>Por favor, revisa el panel de administración para gestionar sus permisos si es necesario.</p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 30px;">
          ReporTicket System Auto-Notification
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Admin notifications sent' });
  } catch (error) {
    console.error('Error sending admin notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/register-company', async (req, res) => {
  const { name, adminUser } = req.body;
  console.log('Registering company:', name);
  console.log('Admin user data:', adminUser);
  const companyId = 'comp-' + Date.now();
  const dbName = (process.env.DB_PREFIX || '') + 'reporticket_' + companyId;

  try {
    // 1. Create entry in master
    await masterPool.execute(
      'INSERT INTO companies (id, name, db_name) VALUES (?, ?, ?)',
      [companyId, name, dbName]
    );

    // 2. Create the physical database (Only in multi mode)
    if (process.env.DB_MODE !== 'single') {
      await masterPool.query(`CREATE DATABASE \`${dbName}\``);
    }

    // 3. Initialize tables and create admin
    const isSingle = process.env.DB_MODE === 'single';
    const targetPool = isSingle ? masterPool : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: dbName,
      multipleStatements: true
    });

    try {
      const initSql = isSingle ? "" : `
        CREATE TABLE IF NOT EXISTS company_users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'supervisor', 'customer') DEFAULT 'customer',
            photo LONGTEXT,
            permissions JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id VARCHAR(20) PRIMARY KEY,
            subject VARCHAR(255) NOT NULL,
            description TEXT,
            user_id VARCHAR(50),
            status ENUM('new', 'open', 'inprogress', 'awaiting', 'old', 'closed') DEFAULT 'new',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES company_users(id)
        );
        CREATE TABLE IF NOT EXISTS ticket_notes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id VARCHAR(20) NOT NULL,
            company_id VARCHAR(50),
            user_id VARCHAR(50),
            content TEXT NOT NULL,
            is_internal TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        );
      `;

      if (initSql) await targetPool.query(initSql);

      // 4. Create the initial admin user
      const adminId = 'user-' + Date.now();
      const defaultPermissions = JSON.stringify({ viewAllTickets: true, assignTickets: true, manageUsers: true, manageCompanies: false });
      const hashedAdminPassword = await bcrypt.hash(adminUser.password, 10);
      if (isSingle) {
        await targetPool.execute(
          'INSERT INTO company_users (id, company_id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [adminId, companyId, adminUser.name, adminUser.email, hashedAdminPassword, 'admin', defaultPermissions]
        );
      } else {
        await targetPool.execute(
          'INSERT INTO company_users (id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
          [adminId, adminUser.name, adminUser.email, hashedAdminPassword, 'admin', defaultPermissions]
        );
      }

      // 5. Sync with global directory
      await masterPool.execute(
        'INSERT INTO global_directory (email, user_id, name, company_id, permissions, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminUser.email, adminId, adminUser.name, companyId, defaultPermissions, hashedAdminPassword, 'admin']
      );

      if (!isSingle) await targetPool.end();

      res.json({ success: true, companyId, dbName, message: 'Company and database created successfully.' });
    } catch (innerError) {
      if (!isSingle) await targetPool.end();
      throw innerError;
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
   const { email, password } = req.body;

   try {
      const [users] = await masterPool.query(
        'SELECT g.user_id, g.company_id, g.name, g.email, g.phone, g.extension, g.photo, g.role, g.password, c.name as company_name ' +
        'FROM global_directory g ' +
        'LEFT JOIN companies c ON g.company_id = c.id ' +
        'WHERE g.email = ?',
        [email]
      );

     if (users.length === 0) {
       return res.status(401).json({ success: false, message: 'Invalid credentials' });
     }

     const passwordMatch = await bcrypt.compare(password, users[0].password);
     if (!passwordMatch) {
       return res.status(401).json({ success: false, message: 'Invalid credentials' });
     }

     const user = users[0];
     console.log('[DEBUG LOGIN] User from DB:', user);
     let detailedUser = { 
       id: user.user_id, 
       name: user.name,
       email, 
       role: user.role, 
       companyId: user.company_id,
       companyName: user.company_name,
       phone: user.phone || null,
       extension: user.extension || null,
       photo: user.photo || null
     };
     console.log('[DEBUG OBJ] detailedUser:', JSON.stringify(detailedUser));

     // If company user, fetch more details from company DB
     if (user.company_id) {
       const pool = await getCompanyPool(user.company_id);
       if (pool) {
         const [details] = await pool.query('SELECT name, phone, extension, photo, permissions FROM company_users WHERE id = ?', [user.user_id]);
         if (details.length > 0) {
           detailedUser = { ...detailedUser, ...details[0] };
           detailedUser.permissions = parsePermissions(details[0].permissions);
         }
       }
     } else {
       // Superadmin permissions are implicit or stored in global_directory
       detailedUser.permissions = parsePermissions(user.permissions) || { viewAllTickets: true, assignTickets: true, manageUsers: true, manageCompanies: true };
     }

     res.json({ success: true, user: detailedUser });
   } catch (error) {
     console.error('Login Error:', error);
     res.status(500).json({ success: false, message: error.message });
   }
 });

// Ticket Endpoints
app.get('/api/tickets', withCompanyPool, async (req, res) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  try {
    let query = 'SELECT * FROM tickets';
    let params = [];
    let conditions = [];

    if (process.env.DB_MODE === 'single' && userRole !== 'superadmin') {
      conditions.push('company_id = ?');
      params.push(req.companyId);
    }

    // Role-based filtering
    if (userRole === 'customer') {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    // Supervisors and Admins see all for the company (handled by withCompanyPool/conditions)

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await req.db.query(query, params);
    const tickets = rows.map(t => {
      let parsedNotes = [];
      try {
        parsedNotes = typeof t.notes === 'string' ? JSON.parse(t.notes) : (t.notes || []);
      } catch (e) {
        parsedNotes = [];
      }
      return { ...t, notes: parsedNotes };
    });
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tickets', withCompanyPool, async (req, res) => {
  const { id, subject, description, user_id, priority, department } = req.body;
  try {
    let query = 'INSERT INTO tickets (id, subject, description, user_id, priority, department';
    let values = '(?, ?, ?, ?, ?, ?';
    const params = [id, subject, description, user_id, priority, department];
    
    if (process.env.DB_MODE === 'single') {
      query += ', company_id';
      values += ', ?';
      params.push(req.companyId);
    }
    
    query += ') VALUES ' + values + ')';
    
    await req.db.execute(query, params);
    
    // Notification
    await sendTicketEmailNotification(id, req.companyId, req.db, 'new_ticket').catch(err => console.error('[NOTIF ERR] Create:', err.message));

    res.json({ success: true, message: 'Ticket created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tickets/:id', withCompanyPool, async (req, res) => {
  const { status, agent_id } = req.body;
  try {
    await req.db.execute(
      'UPDATE tickets SET status = ?, agent_id = ?, updated_at = NOW() WHERE id = ?',
      [status, agent_id || null, req.params.id]
    );

    // Notification
    await sendTicketEmailNotification(req.params.id, req.companyId, req.db, 'status_change', { newStatus: status }).catch(err => console.error('[NOTIF ERR] Status Update:', err.message));

    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tickets/:id/notes', withCompanyPool, async (req, res) => {
  const { content, user_id, is_internal } = req.body;
  try {
    await req.db.execute(
      'INSERT INTO ticket_notes (ticket_id, company_id, user_id, content, is_internal) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.companyId, user_id || null, content, is_internal ? 1 : 0]
    );

    // Notification
    await sendTicketEmailNotification(req.params.id, req.companyId, req.db, 'new_note', { isInternal: is_internal }).catch(err => console.error('[NOTIF ERR] New Note:', err.message));

    res.json({ success: true, message: 'Note added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/tickets/:id', withCompanyPool, async (req, res) => {
  try {
    // Delete notes first
    await req.db.execute('DELETE FROM ticket_notes WHERE ticket_id = ?', [req.params.id]);
    // Delete from tickets table
    const [result] = await req.db.execute('DELETE FROM tickets WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tickets/purge', withCompanyPool, async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Superadmins can purge the system.' });
  }

  try {
    if (process.env.DB_MODE === 'single') {
      await req.db.execute('DELETE FROM ticket_notes');
      await req.db.execute('DELETE FROM tickets');
      res.json({ success: true, message: 'System purged successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Purge only supported in single-DB mode' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/users', withCompanyPool, async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const query = (process.env.DB_MODE === 'single' && userRole !== 'superadmin')
      ? 'SELECT id, company_id, name, email, role, phone, extension, photo, permissions FROM company_users WHERE company_id = ?'
      : 'SELECT id, company_id, name, email, role, phone, extension, photo, permissions FROM company_users';
    const params = (process.env.DB_MODE === 'single' && userRole !== 'superadmin') ? [req.companyId] : [];
    
    const [users] = await req.db.query(query, params);
    const parsedUsers = users.map(u => ({
      ...u,
      permissions: parsePermissions(u.permissions)
    }));
    res.json({ success: true, users: parsedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users', withCompanyPool, async (req, res) => {
  const { id, name, email, password, role, permissions } = req.body;
  const companyId = req.companyId;
  const userId = id;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 1. Insert into company DB (or master if single)
    if (process.env.DB_MODE === 'single') {
      await req.db.execute(
        'INSERT INTO company_users (id, company_id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, companyId, name, email, hashedPassword, role, JSON.stringify(permissions)]
      );
    } else {
      await req.db.execute(
        'INSERT INTO company_users (id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, email, hashedPassword, role, JSON.stringify(permissions)]
      );
    }

    // 2. Sync with global directory
    await masterPool.execute(
      'INSERT INTO global_directory (email, user_id, name, company_id, permissions, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, userId, name, req.companyId, JSON.stringify(permissions || {}), hashedPassword, role]
    );

    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Company Management (Master Pool)
app.get('/api/companies', async (req, res) => {
  try {
    const [companies] = await masterPool.query('SELECT * FROM companies');
    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/companies/:id', async (req, res) => {
  const { name } = req.body;
  const userRole = req.headers['x-user-role'];

  if (name && userRole !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only superadmin can change company name' });
  }
  
  try {
    await masterPool.execute('UPDATE companies SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ success: true, message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    await masterPool.execute('DELETE FROM companies WHERE id = ?', [req.params.id]);
    // Also delete from global_directory
    await masterPool.execute('DELETE FROM global_directory WHERE company_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Global Users (Master Pool - for Super Admin)
app.get('/api/global-users', async (req, res) => {
  try {
    const [users] = await masterPool.query('SELECT user_id AS id, name, email, role, company_id, permissions FROM global_directory');
    const parsedUsers = users.map(u => ({
      ...u,
      permissions: parsePermissions(u.permissions)
    }));
    res.json({ success: true, users: parsedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Company User Management
app.patch('/api/users/:id', async (req, res) => {
  const { name, email, role, permissions, phone, extension, photo, companyId: newCompanyId } = req.body;
  const userRole = req.headers['x-user-role'];
  const requesterCompanyId = req.headers['x-company-id'];

  if ((name || email) && userRole !== 'superadmin') {
    // Don't block the whole request, just skip name/email updates
    // This allows photo and other field updates to proceed
  }

  try {
    // Resolve the target user's details
    const [gdRows] = await masterPool.query('SELECT company_id, role FROM global_directory WHERE user_id = ?', [req.params.id]);
    if (gdRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found in global directory' });
    }
    const targetUser = gdRows[0];
    const targetCompanyId = targetUser.company_id;
    const isSuperAdmin = targetUser.role === 'superadmin';

    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (permissions) {
      updates.push('permissions = ?');
      // Pass the object directly to mysql2; it will handle the JSON conversion if the column is JSON
      // or we can stringify it once to be safe, but let's make sure it's an object if it came as a string
      const parsedPerms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
      params.push(JSON.stringify(parsedPerms));
    }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (extension) { updates.push('extension = ?'); params.push(extension); }
    if (photo !== undefined) { updates.push('photo = ?'); params.push(photo); }
    if (newCompanyId !== undefined && !isSuperAdmin) { 
      updates.push('company_id = ?'); 
      params.push(newCompanyId === '' ? null : newCompanyId); 
    }
    
    if (updates.length > 0) {
      if (isSuperAdmin) {
        // Update system_users table for superadmins (only supports name and role changes here)
        const sysUpdates = [];
        const sysParams = [];
        if (name) { sysUpdates.push('name = ?'); sysParams.push(name); }
        if (role) { sysUpdates.push('role = ?'); sysParams.push(role); }
        
        if (sysUpdates.length > 0) {
          sysParams.push(req.params.id);
          await masterPool.execute(`UPDATE system_users SET ${sysUpdates.join(', ')} WHERE id = ?`, sysParams);
        }
      } else {
        // Update company_users table for company users
        const pool = await getCompanyPool(targetCompanyId || requesterCompanyId);
        if (pool) {
          const companyParams = [...params, req.params.id];
          const query = process.env.DB_MODE === 'single'
            ? `UPDATE company_users SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`
            : `UPDATE company_users SET ${updates.join(', ')} WHERE id = ?`;
          if (process.env.DB_MODE === 'single') companyParams.push(targetCompanyId || requesterCompanyId);
          
          await pool.execute(query, companyParams);
        }
      }
      
      // Sync in global_directory (Always)
      const globalUpdates = [];
      const globalParams = [];
      if (name) { globalUpdates.push('name = ?'); globalParams.push(name); }
      if (role) { globalUpdates.push('role = ?'); globalParams.push(role); }
      if (newCompanyId !== undefined && !isSuperAdmin) { 
        globalUpdates.push('company_id = ?'); 
        globalParams.push(newCompanyId === '' ? null : newCompanyId); 
      }
      if (permissions) {
        globalUpdates.push('permissions = ?');
        const parsedPerms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
        globalParams.push(JSON.stringify(parsedPerms));
      }
      if (phone) { globalUpdates.push('phone = ?'); globalParams.push(phone); }
      if (extension) { globalUpdates.push('extension = ?'); globalParams.push(extension); }
      if (photo !== undefined) { globalUpdates.push('photo = ?'); globalParams.push(photo); }
      
      if (globalUpdates.length > 0) {
        globalParams.push(req.params.id);
        await masterPool.execute(`UPDATE global_directory SET ${globalUpdates.join(', ')} WHERE user_id = ?`, globalParams);
      }
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const [gdRows] = await masterPool.query('SELECT company_id FROM global_directory WHERE user_id = ?', [req.params.id]);
    const targetCompanyId = gdRows.length > 0 ? gdRows[0].company_id : null;
    const requesterCompanyId = req.headers['x-company-id'];

    let pool;
    if (req.headers['x-user-role'] === 'superadmin' && targetCompanyId) {
      pool = await getCompanyPool(targetCompanyId);
    } else {
      pool = await getCompanyPool(requesterCompanyId);
    }

    if (pool) {
      const query = process.env.DB_MODE === 'single'
        ? 'DELETE FROM company_users WHERE id = ? AND company_id = ?'
        : 'DELETE FROM company_users WHERE id = ?';
      const params = process.env.DB_MODE === 'single' ? [req.params.id, targetCompanyId || requesterCompanyId] : [req.params.id];
      await pool.execute(query, params);
    }

    await masterPool.execute('DELETE FROM global_directory WHERE user_id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ticket Operations
app.patch('/api/tickets/:id', withCompanyPool, async (req, res) => {
  console.log('[PATCH TICKET] Request body:', req.body);
  const { status, priority, department, notes } = req.body;
  try {
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (department) { updates.push('department = ?'); params.push(department); }
    
    // Handle notes update
    if (notes !== undefined && notes !== null) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      const query = process.env.DB_MODE === 'single'
        ? `UPDATE tickets SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`
        : `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`;
      if (process.env.DB_MODE === 'single') params.push(req.companyId);
      
      await req.db.execute(query, params);
    }
    
    // Notification for updates (status/priority/dept)
    if (status || priority || department) {
        await sendTicketEmailNotification(req.params.id, req.companyId, req.db, 'status_change', { newStatus: status }).catch(err => console.log('[NOTIF ERR] PATCH Update:', err.message));
    }
    
    // Handle notes for notifications and traceability
    if (Array.isArray(notes) && notes.length > 0) {
      const latestNote = notes[notes.length - 1];
      
      // 1. Traceability Table
      await req.db.execute(
        process.env.DB_MODE === 'single'
          ? 'INSERT INTO ticket_notes (company_id, ticket_id, content, is_internal) VALUES (?, ?, ?, ?)'
          : 'INSERT INTO ticket_notes (ticket_id, content, is_internal) VALUES (?, ?, ?)',
        process.env.DB_MODE === 'single'
          ? [req.companyId, req.params.id, latestNote.text, latestNote.type === 'internal' ? 1 : 0]
          : [req.params.id, latestNote.text, latestNote.type === 'internal' ? 1 : 0]
      );
      
      // 3. Notification
      await sendTicketEmailNotification(req.params.id, req.companyId, req.db, 'new_note', { isInternal: latestNote.type === 'internal' }).catch(err => console.log('[NOTIF ERR] PATCH Note:', err.message));
    }
    
    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    console.error('[PATCH TICKET] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// System Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Encrypt SMTP password if provided in the body
    if (settings && settings.smtpPass) {
      settings.smtpPass = encrypt(settings.smtpPass);
    }

    const configJson = JSON.stringify(settings);
    await masterPool.execute(
      'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['smtpConfig', configJson, configJson]
    );
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  // Migration: add photo column to company_users if missing
  try {
    const migratePhoto = async (pool) => {
      const [cols] = await pool.query("SHOW COLUMNS FROM company_users LIKE 'photo'");
      if (cols.length === 0) {
        await pool.query('ALTER TABLE company_users ADD COLUMN photo LONGTEXT AFTER extension');
      }
    };

    const migrateTicketNotes = async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ticket_notes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id VARCHAR(20) NOT NULL,
            company_id VARCHAR(50),
            user_id VARCHAR(50),
            content TEXT NOT NULL,
            is_internal TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (ticket_id)
        );
      `);
    };

     const migrateGlobalDirectory = async () => {
       // Add phone column if missing
       let [cols] = await masterPool.query("SHOW COLUMNS FROM global_directory LIKE 'phone'");
       if (cols.length === 0) {
         await masterPool.query('ALTER TABLE global_directory ADD COLUMN phone VARCHAR(20) AFTER role');
       }
       // Add extension column if missing
       [cols] = await masterPool.query("SHOW COLUMNS FROM global_directory LIKE 'extension'");
       if (cols.length === 0) {
         await masterPool.query('ALTER TABLE global_directory ADD COLUMN extension VARCHAR(10) AFTER phone');
       }
       // Add photo column if missing
       [cols] = await masterPool.query("SHOW COLUMNS FROM global_directory LIKE 'photo'");
       if (cols.length === 0) {
         await masterPool.query('ALTER TABLE global_directory ADD COLUMN photo LONGTEXT AFTER extension');
       }
     };

    if (process.env.DB_MODE === 'single') {
      await migratePhoto(masterPool);
      await migrateTicketNotes(masterPool);
      await migrateGlobalDirectory();
    } else {
      const [companies] = await masterPool.query('SELECT id FROM companies');
      for (const company of companies) {
        const pool = await getCompanyPool(company.id);
        if (pool) {
          await migratePhoto(pool);
          await migrateTicketNotes(pool);
        }
      }
      await migrateGlobalDirectory();
    }
    console.log('Database migrations applied.');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
};

// Serve React frontend in local/cPanel mode (Vercel serves static files via CDN)
if (process.env.SERVE_STATIC === 'true') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start listening only when not imported by Vercel serverless
if (process.env.VERCEL !== '1') {
  startServer().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
