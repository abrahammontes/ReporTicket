import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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

// Map to store active company deletion confirmation codes (key: companyId, value: { code, expiresAt, adminEmail })
const companyDeleteConfirmations = new Map();

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

const sendWhatsAppNotification = async (userId, message) => {
    if (!userId) return;
    let name = 'Usuario';
    let phone = null;

    if (useLocalDb()) {
        try {
            const user = localDb.users.getById(userId);
            if (user) {
                name = user.name || 'Usuario';
                phone = user.phone;
            }
        } catch (e) {
            console.error('[WhatsApp Mock] Error getting local user:', e.message);
        }
    } else {
        try {
            if (supabase) {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name, phone')
                    .eq('id', userId)
                    .single();
                if (!error && userData) {
                    name = userData.name || 'Usuario';
                    phone = userData.phone;
                }
            }
        } catch (e) {
            console.error('[WhatsApp Mock] Error getting Supabase user:', e.message);
        }
    }

    // Output formatted console message to simulate WhatsApp delivery
    console.log(`\n\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[36m[WHATSAPP MOCK SIMULATION] \x1b[32mTo: ${name} (${phone || '\x1b[31mNO CONFIGURADO\x1b[32m'})\x1b[0m`);
    console.log(`\x1b[33mMessage: ${message}\x1b[0m`);
    
    let waUrl = null;
    if (!phone) {
        console.log(`\x1b[31m[ADVERTENCIA] No se pudo enviar el WhatsApp porque el usuario no tiene un número telefónico configurado.\x1b[0m`);
    } else {
        console.log(`\x1b[32m[ESTADO] Se generó el enlace a wa.me correctamente.\x1b[0m`);
        const cleanPhone = phone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }
    console.log(`\x1b[32m==================================================\n\x1b[0m`);
    
    return waUrl;
};

// --- LOCAL JSON DATABASE PERSISTENCE ---

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const COMPANIES_FILE = path.join(__dirname, 'data', 'companies.json');
const TICKETS_FILE = path.join(__dirname, 'data', 'tickets.json');
const NOTES_FILE = path.join(__dirname, 'data', 'ticket_notes.json');

const readJson = (file) => {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error(`Error reading JSON file ${file}:`, e);
    }
    return [];
};

const writeJson = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error writing JSON file ${file}:`, e);
    }
};

const initLocalDb = () => {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        if (!fs.existsSync(COMPANIES_FILE)) {
            const defaultCompanies = [
                {
                    id: 'comp-1',
                    name: 'ReporTicket Demo',
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ];
            writeJson(COMPANIES_FILE, defaultCompanies);
        }

        if (!fs.existsSync(USERS_FILE)) {
            const defaultUsers = [
                {
                    id: 'user-master',
                    name: 'Agente Administrador Super Administrador',
                    email: 'abraham.montes@gmail.com',
                    password: '$2b$10$rhBuiWFekrbkLd2KMcwBSOF5iN77a1uw9ZtU0F7FcVODNRW3rsH.e', // admin123
                    role: 'superadmin',
                    permissions: {
                        view_all_tickets: true,
                        assign_tickets: true,
                        manage_users: true,
                        manage_companies: true
                    },
                    company_id: null,
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ];
            writeJson(USERS_FILE, defaultUsers);
        }

        if (!fs.existsSync(TICKETS_FILE)) {
            writeJson(TICKETS_FILE, []);
        }

        if (!fs.existsSync(NOTES_FILE)) {
            writeJson(NOTES_FILE, []);
        }
    } catch (e) {
        console.warn('Warning: Local JSON database initialization bypassed (read-only environment):', e.message);
    }
};

initLocalDb();

// Local DB operations helper
const localDb = {
    users: {
        getAll: () => readJson(USERS_FILE),
        getByEmail: (email) => {
            const users = readJson(USERS_FILE);
            const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (user) {
                // Enrich with companies name
                if (user.company_id) {
                    const company = readJson(COMPANIES_FILE).find(c => c.id === user.company_id);
                    user.companies = company ? { name: company.name } : null;
                } else {
                    user.companies = null;
                }
            }
            return user;
        },
        getById: (id) => readJson(USERS_FILE).find(u => u.id === id),
        insert: (userData) => {
            const users = readJson(USERS_FILE);
            const newUser = {
                id: userData.id || 'user-' + Date.now(),
                created_at: new Date().toISOString(),
                ...userData
            };
            users.push(newUser);
            writeJson(USERS_FILE, users);
            return newUser;
        },
        update: (id, updateData) => {
            const users = readJson(USERS_FILE);
            const idx = users.findIndex(u => u.id === id);
            if (idx !== -1) {
                users[idx] = { ...users[idx], ...updateData };
                writeJson(USERS_FILE, users);
                return users[idx];
            }
            return null;
        },
        delete: (id) => {
            const users = readJson(USERS_FILE);
            const filtered = users.filter(u => u.id !== id);
            writeJson(USERS_FILE, filtered);
            return true;
        }
    },
    companies: {
        getAll: () => readJson(COMPANIES_FILE),
        getById: (id) => readJson(COMPANIES_FILE).find(c => c.id === id),
        insert: (companyData) => {
            const companies = readJson(COMPANIES_FILE);
            const newCompany = {
                id: companyData.id || 'comp-' + Date.now(),
                created_at: new Date().toISOString(),
                ...companyData
            };
            companies.push(newCompany);
            writeJson(COMPANIES_FILE, companies);
            return newCompany;
        },
        update: (id, updateData) => {
            const companies = readJson(COMPANIES_FILE);
            const idx = companies.findIndex(c => c.id === id);
            if (idx !== -1) {
                companies[idx] = { ...companies[idx], ...updateData };
                writeJson(COMPANIES_FILE, companies);
                return companies[idx];
            }
            return null;
        },
        delete: (id) => {
            const companies = readJson(COMPANIES_FILE);
            const filtered = companies.filter(c => c.id !== id);
            writeJson(COMPANIES_FILE, filtered);
            return true;
        }
    },
    tickets: {
        getAll: (filters = {}) => {
            const tickets = readJson(TICKETS_FILE);
            const users = readJson(USERS_FILE);
            const notes = readJson(NOTES_FILE);

            let result = tickets.map(t => {
                const requester = users.find(u => u.id === t.user_id);
                const agent = users.find(u => u.id === t.agent_id);
                const ticketNotes = notes.filter(n => n.ticket_id === t.id);

                return {
                    ...t,
                    users: requester ? { name: requester.name } : null,
                    agents: agent ? { name: agent.name } : null,
                    ticket_notes: ticketNotes
                };
            });

            if (filters.user_id) {
                result = result.filter(t => t.user_id === filters.user_id);
            }
            if (filters.company_id) {
                result = result.filter(t => t.company_id === filters.company_id);
            }

            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return result;
        },
        insert: (ticketData) => {
            const tickets = readJson(TICKETS_FILE);
            const newTicket = {
                id: ticketData.id || 'tick-' + Date.now(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...ticketData
            };
            tickets.push(newTicket);
            writeJson(TICKETS_FILE, tickets);
            return newTicket;
        },
        update: (id, updateData) => {
            const tickets = readJson(TICKETS_FILE);
            const idx = tickets.findIndex(t => t.id === id);
            if (idx !== -1) {
                tickets[idx] = { ...tickets[idx], ...updateData, updated_at: new Date().toISOString() };
                writeJson(TICKETS_FILE, tickets);
                return tickets[idx];
            }
            return null;
        },
        delete: (id) => {
            const tickets = readJson(TICKETS_FILE);
            const filtered = tickets.filter(t => t.id !== id);
            writeJson(TICKETS_FILE, filtered);
            return true;
        }
    },
    notes: {
        getByTicketId: (ticketId) => {
            return readJson(NOTES_FILE).filter(n => n.ticket_id === ticketId);
        },
        insert: (noteData) => {
            const notes = readJson(NOTES_FILE);
            const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id || 0)) + 1 : 1;
            const newNote = {
                id: newId,
                created_at: new Date().toISOString(),
                ...noteData
            };
            notes.push(newNote);
            writeJson(NOTES_FILE, notes);
            return newNote;
        }
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

// Safe toggle for dynamic local database fallback
global.supabaseOfflineFallback = false;

const useLocalDb = () => {
    return !supabase || 
           currentSettings.supabaseConfig.supabaseStatus !== 'connected' || 
           global.supabaseOfflineFallback === true;
};


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));



// --- AUTH ENDPOINTS ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (useLocalDb()) {
        try {
            const user = localDb.users.getByEmail(email);
            if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

            const detailedUser = {
                ...user,
                companyName: user.companies ? user.companies.name : 'System'
            };
            delete detailedUser.password;
            delete detailedUser.companies;

            return res.json({ success: true, user: toCamel(detailedUser) });
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Server error during login' });
        }
    }

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
        // Hot fallback to local JSON database on network errors
        if (e.message && (e.message.includes('fetch failed') || e.message.includes('ENOTFOUND') || e.message.includes('timeout') || e.message.includes('network'))) {
            console.warn('⚠️ Login remote check failed. Performing hot fallback to local JSON database.');
            global.supabaseOfflineFallback = true;
            try {
                const user = localDb.users.getByEmail(email);
                if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

                const match = await bcrypt.compare(password, user.password);
                if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

                const detailedUser = {
                    ...user,
                    companyName: user.companies ? user.companies.name : 'System'
                };
                delete detailedUser.password;
                delete detailedUser.companies;

                return res.json({ success: true, user: toCamel(detailedUser) });
            } catch (localErr) {
                return res.status(500).json({ success: false, message: 'Server error during login' });
            }
        }
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// --- TICKETS ENDPOINTS ---

app.get('/api/tickets', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const companyId = req.headers['x-company-id'];
    
    if (useLocalDb()) {
        try {
            const filters = {};
            if (userRole === 'customer') {
                filters.user_id = userId;
            } else if (userRole === 'admin' || userRole === 'agent') {
                if (companyId && companyId !== 'master') {
                    filters.company_id = companyId;
                }
            }
            const tickets = localDb.tickets.getAll(filters);
            
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

            return res.json({ success: true, tickets: toCamel(enrichedTickets) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.json({ success: true, tickets: [] });

    try {
        let selectString = '*, users!user_id(name), agents:users!agent_id(name), ticket_notes(*)';
        if ((userRole === 'admin' || userRole === 'agent') && companyId && companyId !== 'master') {
            selectString = '*, users!user_id!inner(name, company_id), agents:users!agent_id(name), ticket_notes(*)';
        }
        let query = supabase.from('tickets').select(selectString);

        // Access Control Logic
        if (userRole === 'customer') {
            // Customers only see their own tickets
            query = query.eq('user_id', userId);
        } else if (userRole === 'admin' || userRole === 'agent') {
            // Company admins/agents see tickets for their specific company
            if (companyId && companyId !== 'master') {
                query = query.eq('users.company_id', companyId);
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
        // Hot fallback to local database on network error
        if (e.message && (e.message.includes('fetch failed') || e.message.includes('ENOTFOUND') || e.message.includes('timeout') || e.message.includes('network'))) {
            console.warn('⚠️ Tickets check failed. Performing hot fallback.');
            global.supabaseOfflineFallback = true;
            try {
                const filters = {};
                if (userRole === 'customer') {
                    filters.user_id = userId;
                } else if (userRole === 'admin' || userRole === 'agent') {
                    if (companyId && companyId !== 'master') {
                        filters.company_id = companyId;
                    }
                }
                const tickets = localDb.tickets.getAll(filters);
                
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

                return res.json({ success: true, tickets: toCamel(enrichedTickets) });
            } catch (localErr) {
                return res.status(500).json({ success: false, message: localErr.message });
            }
        }
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const companyId = req.headers['x-company-id'];
    
    if (useLocalDb()) {
        try {
            const { attachments, ...otherData } = req.body;

            const ticketId = 'tick-' + Date.now();
            const ticketData = toSnake({
                id: ticketId,
                ...otherData,
                status: 'open',
                companyId: companyId && companyId !== 'master' ? companyId : (otherData.companyId || null)
            });

            localDb.tickets.insert(ticketData);

            if (attachments && attachments.length > 0) {
                localDb.notes.insert({
                    ticket_id: ticketId,
                    content: '',
                    is_internal: false,
                    attachments: attachments
                });
            }

            const finalUserId = ticketData.user_id;
            const ticketIdForNotif = ticketData.id || ticketId;
            sendWhatsAppNotification(finalUserId, `¡Hola! Tu ticket #${ticketIdForNotif} ("${ticketData.title || ''}") ha sido creado correctamente. Estado: Abierto.`);

            return res.json({ success: true, message: 'Ticket created successfully' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { attachments, ...otherData } = req.body;

        const ticketData = toSnake({
            ...otherData,
            title: otherData.subject || 'Sin Asunto',
            status: 'open'
        });
        delete ticketData.subject; // Remove subject because Supabase uses title
        delete ticketData.company_id; // Remove company_id because it doesn't exist in Supabase tickets table
        console.log("ticketData to insert:", ticketData);

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

        const finalUserId = ticketData.user_id;
        const insertedId = insertedTicket && insertedTicket[0] ? insertedTicket[0].id : '';
        const ticketTitle = ticketData.title || '';
        sendWhatsAppNotification(finalUserId, `¡Hola! Tu ticket #${insertedId} ("${ticketTitle}") ha sido creado correctamente. Estado: Abierto.`);

        res.json({ success: true, message: 'Ticket created successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.patch('/api/tickets/:id', async (req, res) => {
    if (useLocalDb()) {
        try {
            const { status, priority, department, agentId, notes } = req.body;

            const originalTicket = readJson(TICKETS_FILE).find(t => t.id === req.params.id);
            const creatorUserId = originalTicket ? originalTicket.user_id : null;

            const updateData = toSnake({
                status,
                priority,
                department,
                agentId,
                updatedAt: new Date().toISOString()
            });

            localDb.tickets.update(req.params.id, updateData);

            let newNotes = [];
            if (notes && notes.length > 0) {
                const existingNotes = localDb.notes.getByTicketId(req.params.id);
                const existingIds = (existingNotes || []).map(n => n.id.toString());

                newNotes = notes.filter(n => !n.id || !existingIds.includes(n.id.toString()));

                for (const note of newNotes) {
                    localDb.notes.insert({
                        ticket_id: req.params.id,
                        content: note.text,
                        is_internal: note.type === 'internal' || note.isInternal === true,
                        attachments: note.attachments || []
                    });
                }
            }

            // WhatsApp update notification logic
            let updatesText = [];
            if (status) updatesText.push(`Estado: ${status}`);
            if (priority) updatesText.push(`Prioridad: ${priority}`);
            if (department) updatesText.push(`Departamento: ${department}`);
            
            let notifMessage = '';
            if (updatesText.length > 0) {
                notifMessage = `¡Hola! Tu ticket #${req.params.id} ha sido actualizado con los siguientes cambios: ${updatesText.join(', ')}.`;
            }

            if (newNotes.length > 0) {
                const newPublicNotes = newNotes.filter(n => !(n.type === 'internal' || n.isInternal === true));
                if (newPublicNotes.length > 0) {
                    const lastNote = newPublicNotes[newPublicNotes.length - 1];
                    const noteSnippet = lastNote.text || lastNote.content || '';
                    const truncatedSnippet = noteSnippet.length > 60 ? noteSnippet.substring(0, 60) + '...' : noteSnippet;
                    
                    if (notifMessage) {
                        notifMessage += ` Además, se ha añadido una nueva respuesta: "${truncatedSnippet}"`;
                    } else {
                        notifMessage = `¡Hola! Se ha añadido una nueva respuesta a tu ticket #${req.params.id}: "${truncatedSnippet}"`;
                    }
                }
            }

            let whatsappUrl = null;
            if (notifMessage && creatorUserId) {
                whatsappUrl = await sendWhatsAppNotification(creatorUserId, notifMessage);
            }

            return res.json({ success: true, message: 'Ticket updated successfully', whatsappUrl });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

    try {
        const { status, priority, department, agentId, notes } = req.body;

        let creatorUserId = null;
        if (supabase) {
            const { data: ticket } = await supabase
                .from('tickets')
                .select('user_id')
                .eq('id', req.params.id)
                .single();
            if (ticket) {
                creatorUserId = ticket.user_id;
            }
        }

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

        let newNotes = [];
        // If there's a new note (the frontend typically sends the full array, we find the new ones)
        if (notes && notes.length > 0) {
            // First, get currently stored notes to avoid duplicates
            const { data: existingNotes } = await supabase.from('ticket_notes').select('id').eq('ticket_id', req.params.id);
            const existingIds = (existingNotes || []).map(n => n.id.toString());

            newNotes = notes.filter(n => !n.id || !existingIds.includes(n.id.toString()));

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

        // WhatsApp update notification logic
        let updatesText = [];
        if (status) updatesText.push(`Estado: ${status}`);
        if (priority) updatesText.push(`Prioridad: ${priority}`);
        if (department) updatesText.push(`Departamento: ${department}`);
        
        let notifMessage = '';
        if (updatesText.length > 0) {
            notifMessage = `¡Hola! Tu ticket #${req.params.id} ha sido actualizado con los siguientes cambios: ${updatesText.join(', ')}.`;
        }

        if (newNotes.length > 0) {
            const newPublicNotes = newNotes.filter(n => !(n.type === 'internal' || n.isInternal === true));
            if (newPublicNotes.length > 0) {
                const lastNote = newPublicNotes[newPublicNotes.length - 1];
                const noteSnippet = lastNote.text || lastNote.content || '';
                const truncatedSnippet = noteSnippet.length > 60 ? noteSnippet.substring(0, 60) + '...' : noteSnippet;
                
                if (notifMessage) {
                    notifMessage += ` Además, se ha añadido una nueva respuesta: "${truncatedSnippet}"`;
                } else {
                    notifMessage = `¡Hola! Se ha añadido una nueva respuesta a tu ticket #${req.params.id}: "${truncatedSnippet}"`;
                }
            }
        }

        let whatsappUrl = null;
        if (notifMessage && creatorUserId) {
            whatsappUrl = await sendWhatsAppNotification(creatorUserId, notifMessage);
        }

        res.json({ success: true, message: 'Ticket updated successfully', whatsappUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/tickets/:id', async (req, res) => {
    if (useLocalDb()) {
        try {
            localDb.tickets.delete(req.params.id);
            return res.json({ success: true, message: 'Ticket deleted' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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

    if (useLocalDb()) {
        try {
            let users = localDb.users.getAll().filter(u => u.role !== 'superadmin');
            if (userRole === 'admin' && companyId && companyId !== 'master') {
                users = users.filter(u => u.company_id === companyId);
            }
            return res.json({ success: true, users: toCamel(users) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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
    if (useLocalDb()) {
        try {
            const users = localDb.users.getAll();
            return res.json({ success: true, users: toCamel(users) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.json({ success: true, users: [] });
    try {
        const { data: users, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ success: true, users: toCamel(users) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/companies', async (req, res) => {
    if (useLocalDb()) {
        try {
            const companies = localDb.companies.getAll();
            return res.json({ success: true, companies: toCamel(companies) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.json({ success: true, companies: [] });
    try {
        const { data: companies, error } = await supabase.from('companies').select('*');
        if (error) throw error;
        res.json({ success: true, companies: toCamel(companies) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.patch('/api/users/:id', async (req, res) => {
    if (useLocalDb()) {
        try {
            const updateData = toSnake(req.body);
            const updated = localDb.users.update(req.params.id, updateData);
            return res.json({ success: true, user: toCamel(updated) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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
    if (useLocalDb()) {
        try {
            const userData = toSnake(req.body);
            if (!userData.status) userData.status = 'active';
            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password, 10);
            }
            const inserted = localDb.users.insert(userData);
            return res.json({ success: true, user: toCamel(inserted) });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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
    if (useLocalDb()) {
        try {
            localDb.users.delete(req.params.id);
            return res.json({ success: true, message: 'User deleted' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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
    if (useLocalDb()) {
        try {
            const comp = localDb.companies.getById(req.params.id);
            if (comp && comp.name === 'ReporTicket Demo') {
                return res.status(403).json({ success: false, message: 'La empresa Demo no se puede modificar.' });
            }
            const updateData = toSnake(req.body);
            localDb.companies.update(req.params.id, updateData);
            return res.json({ success: true, message: 'Company updated' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

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

app.post('/api/companies/:id/request-delete', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (userRole !== 'superadmin' && userRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'unauthorized' });
    }

    try {
        let adminEmail = '';
        if (useLocalDb()) {
            const userObj = localDb.users.getById(userId);
            if (userObj) {
                adminEmail = userObj.email;
            }
        } else {
            if (!supabase) return res.status(503).json({ success: false, message: 'databaseNotConnected' });
            const { data: userObj } = await supabase.from('users').select('email').eq('id', userId).single();
            if (userObj) {
                adminEmail = userObj.email;
            }
        }

        if (!adminEmail) {
            return res.status(400).json({ success: false, message: 'Admin email not found' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        companyDeleteConfirmations.set(req.params.id, {
            code,
            expiresAt,
            adminEmail
        });

        const subject = `[ReporTicket] Código de confirmación para eliminar empresa`;
        const text = `Hola,\n\nHas solicitado eliminar una empresa en ReporTicket. Para confirmar esta acción, utiliza el siguiente código de confirmación:\n\n${code}\n\nEste código expirará en 10 minutos.\n\nSi no has solicitado esta acción, por favor ignora este correo.\n\nSaludos,\nEl equipo de ReporTicket`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444; margin-top: 0;">Confirmación de Eliminación de Empresa</h2>
                <p>Hola,</p>
                <p>Has solicitado eliminar una empresa en <strong>ReporTicket</strong>. Para confirmar esta acción extremadamente importante, ingresa el siguiente código de confirmación en la plataforma:</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 14px;">Este código es de un solo uso y expirará en <strong>10 minutos</strong>.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Si no solicitaste la eliminación de ninguna empresa, por favor ignora este correo de forma segura.</p>
            </div>
        `;

        await sendSystemEmail(adminEmail, subject, text, html);
        return res.json({ success: true, message: 'codeSentSuccess' });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/companies/:id', async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const { code } = req.body;

    const confirmation = companyDeleteConfirmations.get(req.params.id);
    if (!confirmation || confirmation.code !== code || Date.now() > confirmation.expiresAt) {
        return res.status(400).json({ success: false, message: 'invalidCode' });
    }

    companyDeleteConfirmations.delete(req.params.id);

    if (useLocalDb()) {
        try {
            const comp = localDb.companies.getById(req.params.id);
            if (comp && comp.name === 'ReporTicket Demo' && userRole !== 'superadmin') {
                return res.status(403).json({ success: false, message: 'Solo el Super Administrador puede eliminar la empresa Demo.' });
            }
            
            // Clean up users referencing this company
            const users = readJson(USERS_FILE);
            const updatedUsers = users.map(u => {
                if (u.company_id === req.params.id) {
                    return { ...u, company_id: null };
                }
                return u;
            });
            writeJson(USERS_FILE, updatedUsers);

            // Clean up tickets referencing this company
            const tickets = readJson(TICKETS_FILE);
            const updatedTickets = tickets.map(t => {
                if (t.company_id === req.params.id) {
                    return { ...t, company_id: null };
                }
                return t;
            });
            writeJson(TICKETS_FILE, updatedTickets);

            localDb.companies.delete(req.params.id);
            return res.json({ success: true, message: 'Company deleted' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const { data: comp } = await supabase.from('companies').select('name').eq('id', req.params.id).single();
        if (comp && comp.name === 'ReporTicket Demo' && userRole !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Solo el Super Administrador puede eliminar la empresa Demo.' });
        }

        // Clean up users in Supabase
        await supabase.from('users').update({ company_id: null }).eq('company_id', req.params.id);

        // Clean up tickets in Supabase
        // await supabase.from('tickets').update({ company_id: null }).eq('company_id', req.params.id); // tickets table doesn't have company_id in Supabase

        const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'Company deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/register-company', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (useLocalDb()) {
            // Check for duplicates in local DB
            const existingCompanies = readJson(COMPANIES_FILE);
            const exists = existingCompanies.some(c => c.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                return res.status(400).json({ success: false, message: 'La empresa ya existe' });
            }

            let baseName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            if (baseName.length === 0) baseName = 'COMP';
            const randomDigits = Math.floor(100 + Math.random() * 900);
            const companyId = `${baseName}${randomDigits}`;

            localDb.companies.insert({ id: companyId, name, status: 'active' });
            return res.json({ success: true, companyId, message: 'Company created' });
        }

        if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });

        // Check for duplicates in Supabase
        const { data: existingCompany } = await supabase.from('companies').select('id').ilike('name', name).maybeSingle();
        if (existingCompany) {
            return res.status(400).json({ success: false, message: 'La empresa ya existe' });
        }

        let baseName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (baseName.length === 0) baseName = 'COMP';
        const randomDigits = Math.floor(100 + Math.random() * 900);
        const companyId = `${baseName}${randomDigits}`;

        const { error: compError } = await supabase.from('companies').insert([{ id: companyId, name, status: 'active' }]);
        if (compError) throw compError;

        return res.json({ success: true, companyId, message: 'Company created' });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/register', async (req, res) => {
    if (useLocalDb()) {
        try {
            const { name, email, password, phone, extension, companyName } = req.body;
            const userId = 'user-' + Date.now();
            
            // Check if user already exists
            const existing = localDb.users.getByEmail(email);
            if (existing) {
                return res.status(400).json({ success: false, message: 'emailAlreadyExists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            localDb.users.insert({
                id: userId,
                name,
                email,
                password: hashedPassword,
                phone,
                extension: extension || null,
                role: 'customer',
                company_id: null,
                requested_company: companyName || null,
                status: 'pending'
            });

            sendSystemEmail(
                email, 
                'ReporTicket: Registro recibido (Pendiente de activación)', 
                `Hola ${name}, tu registro en ReporTicket ha sido exitoso. Actualmente tu cuenta está en estado 'Pendiente' y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.`,
                `<h2>Hola ${name}</h2><p>Tu registro en <b>ReporTicket</b> ha sido exitoso.</p><p>Actualmente tu cuenta está en estado <b>'Pendiente'</b> y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.</p>`
            );

            return res.json({ success: true, message: 'registrationSuccessPending' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    if (!supabase) return res.status(503).json({ success: false, message: 'Database not connected' });
    try {
        const { name, email, password, phone, extension, companyName } = req.body;
        const userId = 'user-' + Date.now();
        const hashedPassword = await bcrypt.hash(password, 10);

        const { error } = await supabase.from('users').insert([{
            id: userId,
            name,
            email,
            password: hashedPassword,
            phone,
            extension: extension || null,
            role: 'customer',
            company_id: null,
            requested_company: companyName || null,
            status: 'pending'
        }]);
        
        if (error) {
            if (error.code === '23505') return res.status(400).json({ success: false, message: 'emailAlreadyExists' });
            throw error;
        }

        // Try to notify the user via SMTP if configured
        sendSystemEmail(
            email, 
            'ReporTicket: Registro recibido (Pendiente de activación)', 
            `Hola ${name}, tu registro en ReporTicket ha sido exitoso. Actualmente tu cuenta está en estado 'Pendiente' y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.`,
            `<h2>Hola ${name}</h2><p>Tu registro en <b>ReporTicket</b> ha sido exitoso.</p><p>Actualmente tu cuenta está en estado <b>'Pendiente'</b> y deberá ser activada por un administrador para que puedas crear tickets. Recibirás un correo cuando tu cuenta esté lista.</p>`
        );

        res.json({ success: true, message: 'registrationSuccessPending' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- SYSTEM ---

app.get('/api/system-info', (req, res) => {
    const fallback = useLocalDb();
    res.json({
        dbHost: fallback ? 'Offline Local JSON DB' : 'Supabase (PostgreSQL)',
        activeDatabaseHost: fallback ? 'Local DB' : 'Cloud DB',
        version: '1.6.0-connected'
    });
});

app.get('/api/health-check', (req, res) => {
    const fallback = useLocalDb();
    res.json({
        success: true,
        status: 'healthy',
        mode: fallback ? 'lite' : 'supabase'
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
        return res.status(400).json({ success: false, message: 'smtpConfigMissing' });
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

        res.json({ success: true, message: 'testEmailSuccess' });
    } catch (e) {
        console.error('SMTP test failed:', e);
        res.status(500).json({ success: false, message: 'Error SMTP: ' + e.message });
    }
});

app.post('/api/test-supabase', async (req, res) => {
    const { supabaseUrl, supabaseKey } = req.body;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(400).json({ success: false, message: 'urlAndKeyRequired' });
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

        res.json({ success: true, message: 'connectionSuccess' });
    } catch (e) {
        console.error('Supabase connection test FAILED:', e.message);
        currentSettings.supabaseConfig.supabaseStatus = 'disconnected';
        saveSettings(currentSettings);
        res.status(400).json({ success: false, message: 'connectionFailed' });
    }
});

// --- STORAGE ENDPOINTS ---

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'noFileUploaded' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    let downloadName = file.originalname;
    const suffix = ` (ReporTicket)`;
    const lastDot = downloadName.lastIndexOf('.');
    if (lastDot !== -1) {
        downloadName = downloadName.substring(0, lastDot) + suffix + downloadName.substring(lastDot);
    } else {
        downloadName += suffix;
    }

    if (useLocalDb()) {
        try {
            const uploadsDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const localFilePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(localFilePath, file.buffer);

            // Generate host dynamically to avoid port mismatch or hardcoding
            const host = req.get('host') || 'localhost:3001';
            const protocol = req.protocol;
            const url = `${protocol}://${host}/uploads/${fileName}`;

            return res.json({
                success: true,
                url: url + '?download=' + encodeURIComponent(downloadName),
                internalPath: `uploads/${fileName}`,
                name: file.originalname,
                displayName: downloadName,
                size: (file.size / 1024).toFixed(1) + ' KB'
            });
        } catch (e) {
            console.error('Local upload error:', e.message);
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    const { supabaseUrl, supabaseKey } = currentSettings.supabaseConfig;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(400).json({ success: false, message: 'supabaseNotConfigured' });
    }

    try {
        const client = createClient(supabaseUrl, decrypt(supabaseKey));
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

if (process.env.VERCEL) {
    console.log('Vercel serverless environment detected. express listener bypassed.');
} else {
    const PORT = 3001;
    app.listen(PORT, () => console.log(`Supabase Connected Server running on http://localhost:${PORT}`));
}

export default app;
