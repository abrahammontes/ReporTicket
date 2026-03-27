import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Master Database Initial Configuration
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'reporticket_master',
  mode: process.env.DB_MODE || 'single',
  prefix: process.env.DB_PREFIX || ''
};

// Master Database Pool
let masterPool = mysql.createPool({
  ...dbConfig,
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
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  // Clear company pools cache since they might depend on master
  companyPools.clear();
  return masterPool;
};

app.get('/api/system-info', (req, res) => {
  res.json({
    dbMode: dbConfig.mode,
    dbHost: dbConfig.host,
    dbUser: dbConfig.user,
    dbName: dbConfig.database,
    dbPrefix: dbConfig.prefix,
    version: '1.2.0'
  });
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


app.post('/api/send-test-email', async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, testEmail } = req.body;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !testEmail) {
    return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
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
  const { host, user, password, database } = req.body;
  try {
    const testPool = mysql.createPool({
      host,
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
  const { host, user, password, database, mode } = req.body;
  try {
    // 1. Update In-Memory Config and Pool
    updateMasterPool({ host, user, password, database, mode });
    
    // 2. Persist to DB if possible (for future restarts)
    try {
      const configJson = JSON.stringify({ host, user, password, database, mode });
      await masterPool.execute(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['dbConfig', configJson, configJson]
      );
    } catch (saveErr) {
      console.warn('Could not persist DB config to global_settings table, but applied to current session:', saveErr.message);
    }

    res.json({ success: true, message: 'Database configuration saved and applied to current session.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to get system settings
const getSystemSettings = async () => {
  try {
    const [rows] = await masterPool.query('SELECT * FROM global_settings');
    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
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

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
    
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

    // 2. Update password in Global Directory
    await masterPool.execute(
      'UPDATE global_directory SET password = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?',
      [password, user.email]
    );

    // 3. Update password in Company Tables
    if (user.company_id) {
      const pool = await getCompanyPool(user.company_id);
      if (pool) {
        if (process.env.DB_MODE === 'single') {
          await pool.execute('UPDATE company_users SET password = ? WHERE id = ? AND company_id = ?', [password, user.user_id, user.company_id]);
        } else {
          await pool.execute('UPDATE company_users SET password = ? WHERE id = ?', [password, user.user_id]);
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
        <h2 style="color: #7c3aed;">🔔 Notificación de Nuevo Registro</h2>
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
      `;

      if (initSql) await targetPool.query(initSql);

      // 4. Create the initial admin user
      const adminId = 'user-' + Date.now();
      if (isSingle) {
        await targetPool.execute(
          'INSERT INTO company_users (id, company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
          [adminId, companyId, adminUser.name, adminUser.email, adminUser.password, 'admin']
        );
      } else {
        await targetPool.execute(
          'INSERT INTO company_users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
          [adminId, adminUser.name, adminUser.email, adminUser.password, 'admin']
        );
      }

      // 5. Sync with global directory
      await masterPool.execute(
        'INSERT INTO global_directory (email, user_id, company_id, password, role) VALUES (?, ?, ?, ?, ?)',
        [adminUser.email, adminId, companyId, adminUser.password, 'admin']
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
      'SELECT user_id, company_id, role, password FROM global_directory WHERE email = ?',
      [email]
    );

    if (users.length === 0 || users[0].password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    let detailedUser = { 
      id: user.user_id, 
      email, 
      role: user.role, 
      companyId: user.company_id 
    };

    // If company user, fetch more details from company DB
    if (user.company_id) {
      const pool = await getCompanyPool(user.company_id);
      if (pool) {
        const [details] = await pool.query('SELECT name, phone, extension, permissions FROM company_users WHERE id = ?', [user.user_id]);
        if (details.length > 0) {
          detailedUser = { ...detailedUser, ...details[0] };
        }
      }
    } else {
      // Superadmin details from master
      const [details] = await masterPool.query('SELECT name FROM system_users WHERE id = ?', [user.user_id]);
      if (details.length > 0) {
        detailedUser.name = details[0].name;
      }
    }

    res.json({ success: true, user: detailedUser });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ticket Endpoints
app.get('/api/tickets', withCompanyPool, async (req, res) => {
  try {
    const query = process.env.DB_MODE === 'single' 
      ? 'SELECT * FROM tickets WHERE company_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM tickets ORDER BY created_at DESC';
    const params = process.env.DB_MODE === 'single' ? [req.companyId] : [];
    
    const [tickets] = await req.db.query(query, params);
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tickets', withCompanyPool, async (req, res) => {
  const { id, subject, description, user_id, priority, department } = req.body;
  try {
    await req.db.execute(
      'INSERT INTO tickets (id, subject, description, user_id, priority, department) VALUES (?, ?, ?, ?, ?, ?)',
      [id, subject, description, user_id, priority, department]
    );
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
    res.json({ success: true, message: 'Note added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/users', withCompanyPool, async (req, res) => {
  try {
    const query = process.env.DB_MODE === 'single'
      ? 'SELECT id, name, email, role, phone, extension, permissions FROM company_users WHERE company_id = ?'
      : 'SELECT id, name, email, role, phone, extension, permissions FROM company_users';
    const params = process.env.DB_MODE === 'single' ? [req.companyId] : [];
    
    const [users] = await req.db.query(query, params);
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users', withCompanyPool, async (req, res) => {
  const { id, name, email, password, role, permissions } = req.body;
  const companyId = req.companyId;

  try {
    // 1. Insert into company DB (or master if single)
    if (process.env.DB_MODE === 'single') {
      await req.db.execute(
        'INSERT INTO company_users (id, company_id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, companyId, name, email, password, role, JSON.stringify(permissions)]
      );
    } else {
      await req.db.execute(
        'INSERT INTO company_users (id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, email, password, role, JSON.stringify(permissions)]
      );
    }

    // 2. Sync with global directory
    await masterPool.execute(
      'INSERT INTO global_directory (email, user_id, company_id, password, role) VALUES (?, ?, ?, ?, ?)',
      [email, id, companyId, password, role]
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
    const [users] = await masterPool.query('SELECT * FROM global_directory');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Company User Management
app.patch('/api/users/:id', withCompanyPool, async (req, res) => {
  const { name, role, permissions, phone, extension } = req.body;
  try {
    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (permissions) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (extension) { updates.push('extension = ?'); params.push(extension); }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      const query = process.env.DB_MODE === 'single'
        ? `UPDATE company_users SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`
        : `UPDATE company_users SET ${updates.join(', ')} WHERE id = ?`;
      if (process.env.DB_MODE === 'single') params.push(req.companyId);
      
      await req.db.execute(query, params);
      
      // Sync role/name in global_directory if changed
      if (role) {
        await masterPool.execute('UPDATE global_directory SET role = ? WHERE user_id = ?', [role, req.params.id]);
      }
    }
    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:id', withCompanyPool, async (req, res) => {
  try {
    const query = process.env.DB_MODE === 'single'
      ? 'DELETE FROM company_users WHERE id = ? AND company_id = ?'
      : 'DELETE FROM company_users WHERE id = ?';
    const params = process.env.DB_MODE === 'single' ? [req.params.id, req.companyId] : [req.params.id];
    
    await req.db.execute(query, params);
    await masterPool.execute('DELETE FROM global_directory WHERE user_id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ticket Operations
app.patch('/api/tickets/:id', withCompanyPool, async (req, res) => {
  const { status, priority, department, notes } = req.body;
  try {
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (department) { updates.push('department = ?'); params.push(department); }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      const query = process.env.DB_MODE === 'single'
        ? `UPDATE tickets SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`
        : `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`;
      if (process.env.DB_MODE === 'single') params.push(req.companyId);

      await req.db.execute(query, params);
    }

    // Handlle notes if provided (assuming for simplicity we just store them in a notes table)
    if (notes && notes.length > 0) {
      const latestNote = notes[notes.length - 1];
      // Check if note already exists or use more complex logic. For now, just insert the new one
      await req.db.execute(
        process.env.DB_MODE === 'single'
          ? 'INSERT INTO ticket_notes (company_id, ticket_id, content, is_internal) VALUES (?, ?, ?, ?)'
          : 'INSERT INTO ticket_notes (ticket_id, content, is_internal) VALUES (?, ?, ?)',
        process.env.DB_MODE === 'single'
          ? [req.companyId, req.params.id, latestNote.text, latestNote.type === 'internal']
          : [req.params.id, latestNote.text, latestNote.type === 'internal']
      );
    }

    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
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
    // We store the whole body as 'smtpConfig' if it looks like SMTP settings, 
    // or we can be more generic. For now, let's treat it as smtpConfig for simplicity
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

// Load saved DB config and start server (only when run directly, not as serverless)
const startServer = async () => {
  try {
    const [rows] = await masterPool.query('SELECT setting_value FROM global_settings WHERE setting_key = ?', ['dbConfig']);
    if (rows.length > 0) {
      const savedConfig = JSON.parse(rows[0].setting_value);
      console.log('Applying saved Database Configuration...');
      updateMasterPool(savedConfig);
    }
  } catch (err) {
    console.log('Using environment variables for Database Configuration.');
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
