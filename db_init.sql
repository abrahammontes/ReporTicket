-- REPOR TICKET - MASTER DATABASE SCHEMA
-- This database manages the multi-tenant landscape

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    db_name VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('active', 'suspended', 'pending') DEFAULT 'active',
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'support_engineer') DEFAULT 'superadmin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_directory (
    email VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    company_id VARCHAR(50),
    permissions JSON,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    reset_token VARCHAR(255),
    reset_expires DATETIME,
    INDEX (company_id),
    INDEX (reset_token)
);

CREATE TABLE IF NOT EXISTS global_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- REPOR TICKET - SHARED TABLES (For Single-Database Mode)
-- These tables include company_id to allow multi-tenancy in one DB

CREATE TABLE IF NOT EXISTS company_users (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'supervisor', 'agent', 'customer') DEFAULT 'customer',
    phone VARCHAR(20),
    extension VARCHAR(10),
    photo LONGTEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (company_id, email),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(50),
    status ENUM('new', 'open', 'inprogress', 'awaiting', 'old', 'closed') DEFAULT 'new',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    agent_id VARCHAR(50),
    department VARCHAR(100),
    notes MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES company_users(id) ON DELETE SET NULL,
    INDEX (company_id, status)
);

-- Ensure notes column exists for tickets table (for UI compatibility)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS ticket_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    ticket_id VARCHAR(50),
    user_id VARCHAR(50),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES company_users(id) ON DELETE SET NULL
);
