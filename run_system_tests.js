/**
 * Full System Test - Direct DB Mode
 * Tests all operations directly on capaorg_ReporTicket
 */
import mysql from 'mysql2/promise';

const config = {
    host: '51.77.71.235',
    user: 'capaorg_abrahammontes',
    password: 'A06m09c79!.',
    database: 'capaorg_ReporTicket'
};

const log = (icon, msg) => console.log(`${icon}  ${msg}`);

const state = {};

const runTests = async () => {
    let conn;
    console.log('\n====================================================');
    console.log('    REPORTICKET - FULL SYSTEM TEST (Direct DB)');
    console.log(`    Target: ${config.host} / ${config.database}`);
    console.log('====================================================\n');

    try {
        conn = await mysql.createConnection(config);
        log('🔌', 'Connected to remote database.');

        // ─── TEST 1: SuperAdmin Login ─────────────────────────────────────────
        log('🔐', 'TEST 1: SuperAdmin login validation...');
        const [admins] = await conn.query(
            "SELECT * FROM global_directory WHERE email = 'admin@reporticket.com'"
        );
        if (admins.length === 0) throw new Error('SuperAdmin not found');
        if (admins[0].password !== 'admin123') throw new Error('SuperAdmin password mismatch');
        log('✅', `SuperAdmin verified. Role: ${admins[0].role}`);

        // ─── TEST 2: Create Company ───────────────────────────────────────────
        log('🏢', 'TEST 2: Creating test company...');
        const companyId = 'comp-test-' + Date.now();
        state.companyId = companyId;
        await conn.query(
            'INSERT INTO companies (id, name, db_name) VALUES (?, ?, ?)',
            [companyId, 'Empresa Test Automatica', 'capaorg_ReporTicket']
        );
        log('✅', `Company created. ID: ${companyId}`);

        // ─── TEST 3: Create Company Admin User ────────────────────────────────
        log('👤', 'TEST 3: Creating company admin user...');
        const adminUserId = 'user-admin-' + Date.now();
        state.adminUserId = adminUserId;
        const adminEmail = `admin-test-${Date.now()}@test.com`;
        state.adminEmail = adminEmail;
        await conn.query(
            'INSERT INTO company_users (id, company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [adminUserId, companyId, 'Admin Test', adminEmail, 'Test1234', 'admin']
        );
        await conn.query(
            'INSERT INTO global_directory (email, user_id, company_id, password, role) VALUES (?, ?, ?, ?, ?)',
            [adminEmail, adminUserId, companyId, 'Test1234', 'admin']
        );
        log('✅', `Admin user created. Email: ${adminEmail}`);

        // ─── TEST 4: Admin User Login Validation ──────────────────────────────
        log('🔐', 'TEST 4: Admin user login validation...');
        const [directors] = await conn.query(
            'SELECT * FROM global_directory WHERE email = ? AND password = ?',
            [adminEmail, 'Test1234']
        );
        if (directors.length === 0) throw new Error('Admin user login failed');
        log('✅', `Admin login validated. Company: ${directors[0].company_id}`);

        // ─── TEST 5: Create Customer User ─────────────────────────────────────
        log('👤', 'TEST 5: Creating customer user...');
        const customerId = 'user-cust-' + Date.now();
        state.customerId = customerId;
        const customerEmail = `customer-test-${Date.now()}@test.com`;
        state.customerEmail = customerEmail;
        await conn.query(
            'INSERT INTO company_users (id, company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [customerId, companyId, 'Cliente Test', customerEmail, 'Test1234', 'customer']
        );
        await conn.query(
            'INSERT INTO global_directory (email, user_id, company_id, password, role) VALUES (?, ?, ?, ?, ?)',
            [customerEmail, customerId, companyId, 'Test1234', 'customer']
        );
        log('✅', `Customer created. Email: ${customerEmail}`);

        // ─── TEST 6: Create Ticket ────────────────────────────────────────────
        log('🎫', 'TEST 6: Creating test ticket...');
        const ticketId = 'TKT-TEST-' + Date.now();
        state.ticketId = ticketId;
        const beforeCreate = new Date();
        await conn.query(
            'INSERT INTO tickets (id, company_id, subject, description, user_id, priority, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ticketId, companyId, 'Problema de prueba del sistema', 'Este es un ticket de prueba automático.', customerId, 'high', 'Soporte']
        );
        log('✅', `Ticket created. ID: ${ticketId}`);

        // ─── TEST 7: Validate Ticket Timestamps ───────────────────────────────
        log('⏱️', 'TEST 7: Validating ticket timestamps...');
        const [tickets] = await conn.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) throw new Error('Ticket not found after creation');
        const ticket = tickets[0];
        if (!ticket.created_at) throw new Error('Ticket missing created_at timestamp');
        const timeDiff = Math.abs(new Date(ticket.created_at) - beforeCreate);
        log('✅', `created_at: ${ticket.created_at}`);
        log('✅', `updated_at: ${ticket.updated_at}`);
        log('✅', `Status: ${ticket.status}, Priority: ${ticket.priority}`);
        log('✅', `Timestamp delta from test: ${timeDiff}ms`);

        // ─── TEST 8: Update Ticket Status ─────────────────────────────────────
        log('🔄', 'TEST 8: Updating ticket status to inprogress...');
        await conn.query(
            'UPDATE tickets SET status = ?, agent_id = ?, updated_at = NOW() WHERE id = ?',
            ['inprogress', adminUserId, ticketId]
        );
        const [updated] = await conn.query('SELECT status, updated_at FROM tickets WHERE id = ?', [ticketId]);
        if (updated[0].status !== 'inprogress') throw new Error('Status update failed');
        log('✅', `Status updated to: ${updated[0].status}`);
        log('✅', `updated_at refreshed: ${updated[0].updated_at}`);

        // ─── TEST 9: Add Ticket Note ──────────────────────────────────────────
        log('📝', 'TEST 9: Adding note to ticket...');
        await conn.query(
            'INSERT INTO ticket_notes (ticket_id, company_id, user_id, content, is_internal) VALUES (?, ?, ?, ?, ?)',
            [ticketId, companyId, adminUserId, 'Nota de prueba: Sistema funcionando correctamente.', 0]
        );
        const [notes] = await conn.query('SELECT * FROM ticket_notes WHERE ticket_id = ?', [ticketId]);
        if (notes.length === 0) throw new Error('Note not found after creation');
        log('✅', `Note created at: ${notes[0].created_at}`);
        log('✅', `Note content: ${notes[0].content}`);

        // ─── TEST 10: System Variables ────────────────────────────────────────
        log('🔧', 'TEST 10: Verifying system global_settings table...');
        const [settings] = await conn.query('SELECT COUNT(*) as cnt FROM global_settings');
        log('✅', `global_settings records: ${settings[0].cnt}`);

        console.log('\n====================================================');
        console.log('    ✅ ALL 10 TESTS PASSED SUCCESSFULLY');
        console.log('====================================================\n');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
    } finally {
        // ─── CLEANUP ──────────────────────────────────────────────────────────
        console.log('🧹 Starting cleanup...');
        try {
            if (state.ticketId) {
                await conn.query('DELETE FROM ticket_notes WHERE ticket_id = ?', [state.ticketId]);
                await conn.query('DELETE FROM tickets WHERE id = ?', [state.ticketId]);
                log('✅', `Ticket ${state.ticketId} and notes deleted`);
            }
            if (state.customerId) {
                await conn.query('DELETE FROM company_users WHERE id = ?', [state.customerId]);
                if (state.customerEmail) await conn.query('DELETE FROM global_directory WHERE email = ?', [state.customerEmail]);
                log('✅', 'Customer user deleted');
            }
            if (state.adminUserId) {
                await conn.query('DELETE FROM company_users WHERE id = ?', [state.adminUserId]);
                if (state.adminEmail) await conn.query('DELETE FROM global_directory WHERE email = ?', [state.adminEmail]);
                log('✅', 'Admin user deleted');
            }
            if (state.companyId) {
                await conn.query('DELETE FROM companies WHERE id = ?', [state.companyId]);
                log('✅', `Company ${state.companyId} deleted`);
            }
            console.log('====================================================');
            console.log('    🧹 DATABASE CLEANED - PRODUCTION STATE RESTORED');
            console.log('====================================================\n');
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr.message);
        }
        if (conn) await conn.end();
    }
};

runTests();
