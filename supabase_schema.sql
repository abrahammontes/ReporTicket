-- Supabase Schema for ReporTicket

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Hashed with bcrypt
    role TEXT NOT NULL DEFAULT 'customer', -- 'admin', 'superadmin', 'customer', 'agent'
    permissions JSONB DEFAULT '{}'::jsonb,
    company_id TEXT REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    department TEXT, -- 'technical', 'billing', 'general'
    user_id TEXT NOT NULL REFERENCES public.users(id), -- Requester
    agent_id TEXT REFERENCES public.users(id), -- Assigned Agent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Ticket Notes Table
CREATE TABLE IF NOT EXISTS public.ticket_notes (
    id BIGSERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --- INITIAL DATA ---

-- Create Demo Company
INSERT INTO public.companies (id, name, status)
VALUES ('comp-1', 'ReporTicket Demo', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create SuperAdmin User
-- User: abraham.montes@gmail.com
-- Password: admin123 (hashed)
INSERT INTO public.users (id, name, email, password, role, permissions, company_id)
VALUES (
    'user-master', 
    'Agente Administrador Super Administrador', 
    'abraham.montes@gmail.com', 
    '$2b$10$rhBuiWFekrbkLd2KMcwBSOF5iN77a1uw9ZtU0F7FcVODNRW3rsH.e', 
    'superadmin', 
    '{"view_all_tickets": true, "assign_tickets": true, "manage_users": true, "manage_companies": true}'::jsonb, 
    NULL
)
ON CONFLICT (email) DO NOTHING;
