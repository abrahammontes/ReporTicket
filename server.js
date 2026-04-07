import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption/Decryption Utility (for SMTP/Settings)
const CONFIG_KEY_PATH = path.join(__dirname, 'config.key');
const SETTINGS_PATH = path.join(__dirname, 'data', 'settings.json');

let masterKey;
try {
    if (fs.existsSync(CONFIG_KEY_PATH)) {
        masterKey = fs.readFileSync(CONFIG_KEY_PATH);
    } else {
        masterKey = crypto.randomBytes(32);
        fs.writeFileSync(CONFIG_KEY_PATH, masterKey);
    }
} catch (e) {
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
    } catch (e) { return text; }
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
    } catch (e) { return text; }
};

// --- DATA PERSISTENCE HELPERS ---

const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        }
    } catch (e) { console.error('Error loading settings:', e); }
    return {
        smtpConfig: { smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpSecure: false },
        supabaseConfig: { supabaseUrl: '', supabaseKey: '', supabaseStatus: 'unknown' }
    };
};

const saveSettings = (settings) => {
    try {
        if (!fs.existsSync(path.dirname(SETTINGS_PATH))) {
            fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
        }
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch (e) { console.error('Error saving settings:', e); }
};

// --- MAPPING UTILS ---

const toCamel = (obj) => {
    if (Array.isArray(obj)) return obj.map(v => toCamel(v));
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
            result[camelKey] = toCamel(obj[key]);
            return result;
        }, {});
    }
    return obj;
};

const toSnake = (obj) => {
    if (Array.isArray(obj)) return obj.map(v => toSnake(v));
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = toSnake(obj[key]);
            return result;
        }, {});
    }
    return obj;
};

// --- EMAIL UTILITIES ---

const sendSystemEmail = async (to, subject, text, html) => {
    const settings = loadSettings();
    const config = settings.smtpConfig;

    if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
        console.warn('[SMTP] Email not sent: Configuration missing');
        return false;
    }

    try {
        const password = decrypt(config.smtpPass);
        const isSecure = String(config.smtpPort) === '465' || config.smtpSecure === true;

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: parseInt(config.smtpPort),
            secure: isSecure,
            auth: {
                user: config.smtpUser,
                pass: password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"ReporTicket" <${config.smtpUser}>`,
            to,
            subject,
            text,
            html
        });
        console.log('[SMTP] Email sent:', info.messageId);
        return true;
    } catch (e) {
        console.error('[SMTP] Critical Error sending email:', e.message);
        return false;
    }
};

// --- INITIALIZE SUPABASE CLIENT ---

let currentSettings = loadSettings();
let supabase = null;

const initSupabase = () => {
    // Prioritize Environment Variables for Production stability
    const url = process.env.SUPABASE_URL || currentSettings.supabaseConfig.supabaseUrl;
    const key = process.env.SUPABASE_KEY || decrypt(currentSettings.supabaseConfig.supabaseKey);

    if (url && key) {
        try {
            supabase = createClient(url, key);
            console.log('Supabase client initialized successfully');
            if (process.env.NODE_ENV === 'production') console.log('Production DB connected');
        } catch (e) {
            console.error('CRITICAL: Supabase client initialization failed:', e.message);
        }
    } else {
        console.warn('Supabase credentials missing (URL or KEY). Server in standalone-lite mode');
        if (!url) console.warn('- Missing SUPABASE_URL');
        if (!key) console.warn('- Missing SUPABASE_KEY');
    }
};

initSupabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));



// --- AUTH ENDPOINTS ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*, companies(name)')
            .eq('email', email)
            .single();

        if (error || !user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const detailedUser = {
            ...user,
            companyName: user.companies ? user.companies.name : 'System'
        };
        delete detailedUser.password;
        delete detailedUser.companies;

        res.json({ success: true, user: toCamel(detailedUser) });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// --- TICKETS ENDPOINTS ---

app.get('/api/tickets', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const companyId = req.headers['x-company-id'];
    
    if (!supabase) return res.json({ success: true, tickets: [] });

    try {
        let query = supabase.from('tickets').select('*, users!user_id(name), agents:users!agent_id(name), ticket_notes(*)');

        // Access Control Logic
        if (userRole === 'customer') {
            // Customers only see their own tickets
            query = query.eq('user_id', userId);
        } else if (userRole === 'admin' || userRole === 'agent') {
            // Company admins/agents see tickets for their specific company
            if (companyId && companyId !== 'master') {
                query = query.eq('company_id', companyId);
            }
        }
        // Superadmins see all tickets (no filter)

        const { data: tickets, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let enrichedTickets = tickets.map(t => ({
            ...t,
            agentName: t.agents ? t.agents.name : 'Unassigned',
            user: t.users ? t.users.name : 'Unknown',
            notes: (t.ticket_notes || []).map(n => ({
                id: n.id,
                text: n.content,
                type: n.is_internal ? 'internal' : 'public',
                date: new Date(n.created_at).toLocaleString(),
                attachments: n.attachments || []
            })).sort((a, b) => new Date(a.date) - new Date(b.date))
        }));

        // Securely map attachments to Signed URLs
        let pathsToSign = [];
        enrichedTickets.forEach(t => {
            t.notes.forEach(n => {
                n.attachments.forEach(att => {
                    let path = att.internalPath || '';
                    if (!path && att.url) {
                        // Support legacy public URLs
                        const match = att.url.match(/ticket-attachments\/(.+)$/);
                        if (match) path = match[1];
                    }
                    if (path) {
                        pathsToSign.push(path);
                        att._extractedPath = path; // Temporary holding referencing
                    }
                });
            });
        });

        if (pathsToSign.length > 0) {
            // Deduplicate paths just in case to reduce DB load
            const uniquePaths = [...new Set(pathsToSign)];
            const { data: signedUrls, error: signError } = await supabase.storage.from('ticket-attachments').createSignedUrls(uniquePaths, 3600); // 1 hour

            if (signError) {
                console.error('[StorageAuth] createSignedUrls failed:', signError);
            }

            if (!signError && signedUrls) {
                const urlMap = {};
                signedUrls.forEach(item => {
                    if (item.error) {
                        console.error('[StorageAuth] Item sign failed:', item.path, item.error);
                        return; // Skip failed signs
                    }
                    urlMap[item.path] = item.signedUrl;
                });

                enrichedTickets.forEach(t => {
                    t.notes.forEach(n => {
                        n.attachments.forEach(att => {
                            if (att._extractedPath && urlMap[att._extractedPath]) {
                                let downloadName = att.name || 'descarga';
                                if (!downloadName.includes('(ReporTicket)')) {
                                    const suffix = ` (ReporTicket)`;
                                    const lastDot = downloadName.lastIndexOf('.');
                                    if (lastDot !== -1) {
                                        downloadName = downloadName.substring(0, lastDot) + suffix + downloadName.substring(lastDot);
                                    } else {
                                        downloadName += suffix;
                                    }
                                }
                                att.url = urlMap[att._extractedPath] + '&download=' + encodeURIComponent(downloadName);
                                att.displayName = downloadName;
                                // Store a hint that this is an encrypted attachment
                                att.isEncrypted = true;
                            }
                            delete att._extractedPath;
                        });
                    });
                });
            }
        }

        res.json({ success: true, tickets: toCamel(enrichedTickets) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { attachments, ...otherData } = req.body;
        const companyId = req.headers['x-company-id'];

        const ticketData = toSnake({
            ...otherData,
            status: 'open',
            companyId: companyId && companyId !== 'master' ? companyId : (otherData.companyId || null)
        });

        const { data: insertedTicket, error } = await supabase.from('tickets').insert([ticketData]).select();
        if (error) throw error;

        // If attachments were sent during creation, add them as an initial note
        if (attachments && attachments.length > 0 && insertedTicket && insertedTicket[0]) {
            const { error: noteError } = await supabase.from('ticket_notes').insert([{
                ticket_id: insertedTicket[0].id,
                content: '',
                is_internal: false,
                attachments: attachments
            }]);
            if (noteError) console.error('Failed to add initial attachments', noteError);
        }

        res.json({ success: true, message: 'Ticket created successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.patch('/api/tickets/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { status, priority, department, agentId, notes } = req.body;

        // Prepare main ticket update
        const updateData = toSnake({
            status,
            priority,
            department,
            agentId,
            updatedAt: new Date().toISOString()
        });

        // Update Ticket
        const { error: updateError } = await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', req.params.id);

        if (updateError) throw updateError;

        // If there's a new note (the frontend typically sends the full array, we find the new ones)
        if (notes && notes.length > 0) {
            // First, get currently stored notes to avoid duplicates
            const { data: existingNotes } = await supabase.from('ticket_notes').select('id').eq('ticket_id', req.params.id);
            const existingIds = (existingNotes || []).map(n => n.id.toString());

            const newNotes = notes.filter(n => !n.id || !existingIds.includes(n.id.toString()));

            for (const note of newNotes) {
                const { error: noteError } = await supabase.from('ticket_notes').insert([{
                    ticket_id: req.params.id,
                    content: note.text,
                    is_internal: note.type === 'internal' || note.isInternal === true,
                    attachments: note.attachments || []
                }]);
                if (noteError) throw noteError;
            }
        }

        res.json({ success: true, message: 'Ticket updated successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/tickets/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { error } = await supabase.from('tickets').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'Ticket deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- USERS & COMPANIES ---

app.get('/api/users', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const companyId = req.headers['x-company-id'];

    if (!supabase) return res.json({ success: true, users: [] });
    try {
        let query = supabase.from('users').select('*').neq('role', 'superadmin');
        
        // Admins only see users from their company
        if (userRole === 'admin' && companyId && companyId !== 'master') {
            query = query.eq('company_id', companyId);
        }

        const { data: users, error } = await query;
        if (error) throw error;
        res.json({ success: true, users: toCamel(users) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/global-users', async (req, res) => {
    if (!supabase) return res.json({ success: true, users: [] });
    try {
        const { data: users, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ success: true, users: toCamel(users) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/companies', async (req, res) => {
    if (!supabase) return res.json({ success: true, companies: [] });
    try {
        const { data: companies, error } = await supabase.from('companies').select('*');
        if (error) throw error;
        res.json({ success: true, companies: toCamel(companies) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.patch('/api/users/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const updateData = toSnake(req.body);
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json({ success: true, user: toCamel(data[0]) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/users', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const userData = toSnake(req.body);
        if (!userData.status) userData.status = 'active'; // Admin-created users are active by default
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }
        const { data, error } = await supabase.from('users').insert([userData]).select();
        if (error) throw error;
        res.json({ success: true, user: toCamel(data[0]) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const { error } = await supabase.from('users').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'User deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.patch('/api/companies/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        // Protection for Demo
        const { data: comp } = await supabase.from('companies').select('name').eq('id', req.params.id).single();
        if (comp && comp.name === 'ReporTicket Demo') {
            return res.status(403).json({ success: false, message: 'La empresa Demo no se puede modificar.' });
        }

        const updateData = toSnake(req.body);
        const { error } = await supabase.from('companies').update(updateData).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'Company updated' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/companies/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    const userRole = req.headers['x-user-role'];
    try {
        const { data: comp } = await supabase.from('companies').select('name').eq('id', req.params.id).single();
        if (comp && comp.name === 'ReporTicket Demo' && userRole !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Solo el Super Administrador puede eliminar la empresa Demo.' });
        }

        const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'Company deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/register-company', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { name, adminUser } = req.body;
        const companyId = 'comp-' + Date.now();
        const adminId = 'user-' + Date.now();

        // Transactional behavior isn't simple in JS client, but we can do sequential inserts
        const { error: compError } = await supabase.from('companies').insert([{ id: companyId, name, status: 'active' }]);
        if (compError) throw compError;

        const hashedPassword = await bcrypt.hash(adminUser.password, 10);
        const { error: userError } = await supabase.from('users').insert([{
            id: adminId,
            name: adminUser.name,
            email: adminUser.email,
            password: hashedPassword,
            role: 'admin',
            company_id: companyId,
            status: 'active',
            permissions: { view_all_tickets: true, assign_tickets: true, manage_users: true, manage_companies: false }
        }]);
        if (userError) throw userError;

        res.json({ success: true, companyId, message: 'Company and Admin created' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/register', async (req, res) => {
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const { name, email, password, phone, extension } = req.body;
        const userId = 'user-' + Date.now();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { error } = await supabase.from('users').insert([{
            id: userId,
            name,
            email,
            password: hashedPassword,
            phone,
            extension,
            role: 'customer',
            status: 'pending'
        }]);
        
        if (error) throw error;

        // Try to notify the user via SMTP if configured
        sendSystemEmail(
            email, 
            'ReporTicket: Registro recibido (Pendiente de activación)', 
            `Hola ${name}, tu registro en ReporTicket ha sido exitoso. Actualmente tu cuenta está en estado 'Pendiente' y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.`,
            `<h2>Hola ${name}</h2><p>Tu registro en <b>ReporTicket</b> ha sido exitoso.</p><p>Actualmente tu cuenta está en estado <b>'Pendiente'</b> y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.</p>`
        );

        res.json({ success: true, message: 'Registration successful. Waiting for admin activation.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- SYSTEM ---

app.get('/api/system-info', (req, res) => {
    res.json({
        dbHost: supabase ? 'Supabase (PostgreSQL)' : 'Disconnected',
        activeDatabaseHost: supabase ? 'Cloud DB' : 'None',
        version: '1.6.0-connected'
    });
});

app.get('/api/health-check', (req, res) => {
    res.json({
        success: true,
        status: supabase ? 'healthy' : 'degraded',
        mode: supabase ? 'supabase' : 'lite'
    });
});

app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings: currentSettings });
});

app.post('/api/settings', (req, res) => {
    const newSettings = req.body;
    if (newSettings.smtpConfig && newSettings.smtpConfig.smtpPass && !newSettings.smtpConfig.smtpPass.includes(':')) {
        newSettings.smtpConfig.smtpPass = encrypt(newSettings.smtpConfig.smtpPass);
    }
    if (newSettings.supabaseConfig && newSettings.supabaseConfig.supabaseKey && !newSettings.supabaseConfig.supabaseKey.includes(':')) {
        newSettings.supabaseConfig.supabaseKey = encrypt(newSettings.supabaseConfig.supabaseKey);
    }

    currentSettings = { ...currentSettings, ...newSettings };
    saveSettings(currentSettings);

    // Re-initialize supabase if config changed
    initSupabase();

    res.json({ success: true, message: 'Settings saved and server re-initialized' });
});

app.post('/api/send-test-email', async (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, testRecipient, testEmail } = req.body;
    const destination = testEmail || testRecipient || smtpUser;
    
    if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(400).json({ success: false, message: 'Faltan datos de configuración SMTP' });
    }

    try {
        const password = smtpPass.includes(':') ? decrypt(smtpPass) : smtpPass;
        const isSecure = String(smtpPort) === '465' || smtpSecure === true;

        console.log(`[SMTP Test] Attempting to send to ${destination} via ${smtpHost}:${smtpPort} (Secure: ${isSecure})`);

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: isSecure,
            auth: {
                user: smtpUser,
                pass: password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection first
        await transporter.verify();

        await transporter.sendMail({
            from: `"ReporTicket Test" <${smtpUser}>`,
            to: destination,
            subject: "ReporTicket: Prueba de Configuración",
            text: "✅ Tu configuración SMTP funciona correctamente.",
            html: "<b>✅ Tu configuración SMTP funciona correctamente.</b>"
        });

        res.json({ success: true, message: 'Correo de prueba enviado con éxito' });
    } catch (e) {
        console.error('SMTP test failed:', e);
        res.status(500).json({ success: false, message: 'Error SMTP: ' + e.message });
    }
});

app.post('/api/test-supabase', async (req, res) => {
    const { supabaseUrl, supabaseKey } = req.body;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(400).json({ success: false, message: 'URL and Key are required' });
    }

    console.log('Testing Supabase connection to:', supabaseUrl);
    try {
        // Use the key provided (which might be decrypted already from the UI or new)
        const testClient = createClient(supabaseUrl, supabaseKey);

        // Simple test query to the users table
        const { data, error } = await testClient.from('users').select('id').limit(1);

        if (error) {
            console.error('Supabase test query error:', error);
            throw error;
        }

        console.log('Supabase connection test SUCCESS');
        currentSettings.supabaseConfig.supabaseStatus = 'connected';
        saveSettings(currentSettings);

        res.json({ success: true, message: 'Connection to Supabase established successfully' });
    } catch (e) {
        console.error('Supabase connection test FAILED:', e.message);
        currentSettings.supabaseConfig.supabaseStatus = 'disconnected';
        saveSettings(currentSettings);
        res.status(400).json({ success: false, message: 'Connection failed: ' + e.message });
    }
});

// --- STORAGE ENDPOINTS ---

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { supabaseUrl, supabaseKey } = currentSettings.supabaseConfig;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(400).json({ success: false, message: 'Supabase not configured' });
    }

    try {
        const client = createClient(supabaseUrl, decrypt(supabaseKey));
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `notes/${fileName}`;

        const { data, error } = await client.storage
            .from('ticket-attachments')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // Generate signed URL dynamically instead of public URL
        const { data: signedData, error: signError } = await client.storage
            .from('ticket-attachments')
            .createSignedUrl(filePath, 3600); // 1 hour expiration

        if (signError) throw signError;

        let downloadName = file.originalname;
        const suffix = ` (ReporTicket)`;
        const lastDot = downloadName.lastIndexOf('.');
        if (lastDot !== -1) {
            downloadName = downloadName.substring(0, lastDot) + suffix + downloadName.substring(lastDot);
        } else {
            downloadName += suffix;
        }

        res.json({
            success: true,
            url: signedData.signedUrl + '&download=' + encodeURIComponent(downloadName),
            internalPath: filePath, // Storing internal path is not strictly needed on frontend, we will parse it backend later
            name: file.originalname,
            displayName: downloadName,
            size: (file.size / 1024).toFixed(1) + ' KB'
        });
    } catch (e) {
        console.error('Upload error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Supabase Connected Server running on http://localhost:${PORT}`));

export default app;
