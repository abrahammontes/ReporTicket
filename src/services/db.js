// Simulated Database using LocalStorage

const DB_KEY = 'reporticket_db';

const defaultDB = {
  users: [
    { 
      id: 'admin-1', 
      email: 'admin@reporticket.com', 
      password: 'admin', 
      name: 'Admin User', 
      role: 'superadmin',
      companyId: null,
      preferences: { theme: 'dark', language: 'es' }
    }
  ],
  companies: [],
  tickets: [
    { id: '1025', subject: 'Problemas con el login', user: 'Jane Smith', status: 'new', priority: 'high', date: '2024-03-18' },
    { id: '1024', subject: 'Impresora no funciona', user: 'Bob Wilson', status: 'inprogress', priority: 'medium', date: '2024-03-17' },
    { id: '1023', subject: 'Solicitud de actualización', user: 'Alice Cooper', status: 'closed', priority: 'low', date: '2024-03-15' },
  ]
};

const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
    return defaultDB;
  }
  const parsed = JSON.parse(data);
  let updated = false;

  const adminIndex = parsed.users.findIndex(u => u.id === 'admin-1');
  if (adminIndex !== -1 && parsed.users[adminIndex].role !== 'superadmin') {
    parsed.users[adminIndex].role = 'superadmin';
    updated = true;
  }

  parsed.users = parsed.users.map(u => {
    let changed = false;
    if (!('companyId' in u)) {
      u.companyId = null;
      changed = true;
    }
    if (!u.permissions) {
      if (u.role === 'superadmin') {
        u.permissions = { viewAllTickets: true, assignTickets: true, manageUsers: true, manageCompanies: true };
      } else if (u.role === 'admin' || u.role === 'supervisor') {
        u.permissions = { viewAllTickets: true, assignTickets: true, manageUsers: false, manageCompanies: false };
      } else {
        u.permissions = { viewAllTickets: false, assignTickets: false, manageUsers: false, manageCompanies: false };
      }
      changed = true;
    }
    if (changed) updated = true;
    return u;
  });

  if (updated) {
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
  }
  return parsed;
};

const saveDB = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const dbService = {
  // User Management
  getUsers: () => getDB().users,
  
  findUser: (email, password) => {
    const db = getDB();
    return db.users.find(u => u.email === email && u.password === password);
  },
  
  registerUser: (userData) => {
    const db = getDB();
    if (db.users.some(u => u.email === userData.email)) {
      throw new Error('user_exists');
    }
    const newUser = {
      ...userData,
      id: Date.now().toString(),
      role: 'customer',
      companyId: null,
      permissions: { viewAllTickets: false, assignTickets: false, manageUsers: false, manageCompanies: false },
      preferences: { theme: 'light', language: 'es' }
    };
    db.users.push(newUser);
    saveDB(db);
    return newUser;
  },
  
  updateUserProfile: (userId, updates) => {
    const db = getDB();
    const index = db.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...updates };
      saveDB(db);
      return db.users[index];
    }
    return null;
  },

  // Ticket Management
  getTickets: () => getDB().tickets,
  
  addTicket: (ticket, userName = 'Anonymous') => {
    const db = getDB();
    const newTicket = { 
      status: 'new',
      user: userName,
      ...ticket, 
      id: (Date.now() % 10000).toString(), 
      date: new Date().toISOString().split('T')[0] 
    };
    db.tickets.unshift(newTicket);
    saveDB(db);
    return newTicket;
  },

  updateTicket: (ticketId, updates) => {
    const db = getDB();
    const index = db.tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      db.tickets[index] = { ...db.tickets[index], ...updates };
      saveDB(db);
      return db.tickets[index];
    }
    return null;
  },

  deleteUser: (userId) => {
    const db = getDB();
    db.users = db.users.filter(u => u.id !== userId);
    saveDB(db);
  },

  // Companies Management
  getCompanies: () => {
    const db = getDB();
    return db.companies || [];
  },
  
  addCompany: (companyData) => {
    const db = getDB();
    if (!db.companies) db.companies = [];
    const newCompany = {
      ...companyData,
      id: 'comp-' + Date.now().toString()
    };
    db.companies.push(newCompany);
    saveDB(db);
    return newCompany;
  },

  updateCompany: (companyId, updates) => {
    const db = getDB();
    const index = db.companies.findIndex(c => c.id === companyId);
    if (index !== -1) {
      db.companies[index] = { ...db.companies[index], ...updates };
      saveDB(db);
      return db.companies[index];
    }
    return null;
  },

  deleteCompany: (companyId) => {
    const db = getDB();
    db.companies = db.companies.filter(c => c.id !== companyId);
    db.users = db.users.map(u => u.companyId === companyId ? { ...u, companyId: null } : u);
    saveDB(db);
  },

  // Session Management
  setSession: (user) => {
    if (user) {
      localStorage.setItem('reporticket_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('reporticket_session');
    }
  },

  getSession: () => {
    const session = localStorage.getItem('reporticket_session');
    return session ? JSON.parse(session) : null;
  }
};
