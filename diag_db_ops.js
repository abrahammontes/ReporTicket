import mysql from 'mysql2/promise';

const config = {
    host: '51.77.71.235',
    user: 'capaorg_abrahammontes',
    password: 'A06m09c79!.',
    database: 'capaorg_ReporTicket'
};

const diagnose = async () => {
    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('Connected OK.');

        // Step 1: Create company
        const companyId = 'test-diag-' + Date.now();
        await conn.query(
            'INSERT INTO companies (id, name, db_name) VALUES (?, ?, ?)',
            [companyId, 'Diagnostico Test', 'diag_db']
        );
        console.log('Company created:', companyId);

        // Step 2: Create user with company_id
        const userId = 'user-diag-' + Date.now();
        await conn.query(
            'INSERT INTO company_users (id, company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, companyId, 'Test User', 'diag@test.com', 'test123', 'customer']
        );
        console.log('User created:', userId);

        // Step 3: Create ticket with company_id
        const ticketId = 'TKT-DIAG-' + Date.now();
        await conn.query(
            'INSERT INTO tickets (id, company_id, subject, description, user_id, priority, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ticketId, companyId, 'Test', 'Desc', userId, 'high', 'Support']
        );
        console.log('Ticket created:', ticketId);

        // Step 4: Add note
        await conn.query(
            'INSERT INTO ticket_notes (ticket_id, company_id, user_id, content, is_internal) VALUES (?, ?, ?, ?, ?)',
            [ticketId, companyId, userId, 'Test note', 0]
        );
        console.log('Note added.');

        // Cleanup
        await conn.query('DELETE FROM ticket_notes WHERE ticket_id = ?', [ticketId]);
        await conn.query('DELETE FROM tickets WHERE id = ?', [ticketId]);
        await conn.query('DELETE FROM company_users WHERE id = ?', [userId]);
        await conn.query('DELETE FROM global_directory WHERE email = ?', ['diag@test.com']);
        await conn.query('DELETE FROM companies WHERE id = ?', [companyId]);
        console.log('Cleanup done. All tests passed!');

    } catch (err) {
        console.error('DIAGNOSTICS ERROR:', err.message);
        console.error('SQL:', err.sql);
    } finally {
        if (conn) await conn.end();
    }
};

diagnose();
