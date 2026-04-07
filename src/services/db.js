// API-based Database Service replacing LocalStorage
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE}/api`;


const getHeaders = () => {
  const session = JSON.parse(localStorage.getItem('reporticket_session') || '{}');
  return {
    'Content-Type': 'application/json',
    'X-Company-ID': session.companyId || 'master',
    'X-User-ID': session.id || '',
    'X-User-Role': session.role || ''
  };
};

export const dbService = {
  // Authentication
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.user;
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  resetPassword: async (token, password) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Users
  getUsers: async () => {
    const session = JSON.parse(localStorage.getItem('reporticket_session') || '{}');
    const endpoint = (session.role === 'superadmin') ? '/global-users' : '/users';
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getHeaders()
    });
    const data = await response.json();
    return data.users || [];
  },

  registerUser: async (userData) => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        ...userData, 
        id: 'user-' + Date.now(),
        permissions: userData.permissions || { viewAllTickets: false, assignTickets: false, manageUsers: false, manageCompanies: false }
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Companies
  getCompanies: async () => {
    const response = await fetch(`${API_URL}/companies`, {
      headers: getHeaders()
    });
    const data = await response.json();
    return data.companies || [];
  },

  registerCompany: async (name, dbName, adminUser) => {
    const response = await fetch(`${API_URL}/register-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dbName, adminUser })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Tickets
  getTickets: async () => {
    const response = await fetch(`${API_URL}/tickets`, {
      headers: getHeaders()
    });
    const data = await response.json();
    return data.tickets || [];
  },

   addTicket: async (ticket, userName) => {
     const session = JSON.parse(localStorage.getItem('reporticket_session') || '{}');
     const companyPrefix = (session.companyName || 'TKT').replace(/[^a-zA-Z0-9]/g, '').substring(0, 13);
     const randomDigits = Math.floor(100000 + Math.random() * 900000);
     const customId = `${companyPrefix}-${randomDigits}`;

     const response = await fetch(`${API_URL}/tickets`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify({
         ...ticket,
         id: customId,
         userId: session.id || '', // Standardized to camelCase
         userName: userName
       })
     });
     const data = await response.json();
     if (!data.success) throw new Error(data.message);
     return data;
   },

  updateTicket: async (id, updates) => {
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return await response.json();
  },

  deleteTicket: async (id) => {
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await response.json();
  },

  purgeTickets: async () => {
    const response = await fetch(`${API_URL}/tickets/purge`, {
      method: 'POST',
      headers: getHeaders()
    });
    return await response.json();
  },

  // Profile & User Management
  updateUserProfile: async (userId, updates) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }
    return await response.json();
  },

  deleteUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await response.json();
  },

  // Company Management
  updateCompany: async (companyId, updates) => {
    const response = await fetch(`${API_URL}/companies/${companyId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return await response.json();
  },

  deleteCompany: async (companyId) => {
    const response = await fetch(`${API_URL}/companies/${companyId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await response.json();
  },

  updateCompanyStatus: async (companyId, status) => {
    const response = await fetch(`${API_URL}/companies/${companyId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return await response.json();
  },

  // System Settings
  getSystemSettings: async () => {
    const response = await fetch(`${API_URL}/settings`, {
      headers: getHeaders()
    });
    const data = await response.json();
    return data.settings || {};
  },

  testSupabaseConnection: async (url, key) => {
    const response = await fetch(`${API_URL}/test-supabase`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ supabaseUrl: url, supabaseKey: key })
    });
    return await response.json();
  },

  updateSystemSettings: async (settings) => {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return await response.json();
  },

  // Session Management (Stay in LocalStorage for simplicity)
  setSession: (user) => {
    if (user) {
      localStorage.setItem('reporticket_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('reporticket_session');
    }
  },

  getSystemInfo: async () => {
    const response = await fetch(`${API_URL}/system-info`, {
      headers: getHeaders()
    });
    return await response.json();
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Note: No 'Content-Type' header here, browser sets it with boundary for FormData
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${response.status}`);
    }
    
    return await response.json();
  },
  


  getSession: () => {
    const session = localStorage.getItem('reporticket_session');
    return session ? JSON.parse(session) : null;
  }
};
