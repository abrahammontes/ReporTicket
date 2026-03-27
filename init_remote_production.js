import mysql from 'mysql2/promise';
import fs from 'fs';

const config = {
    host: '51.77.71.235',
    user: 'capaorg_abrahammontes',
    password: 'A06m09c79!.',
    database: 'capaorg_ReporTicket'
};

const init = async () => {
    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to remote DB: capaorg_ReporTicket');

        const schema = fs.readFileSync('db_init.sql', 'utf8');
        const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

        console.log('Executing schema...');
        for (const statement of statements) {
            await connection.query(statement);
        }
        console.log('Schema initialized.');

        // Clean and re-create SuperAdmin
        await connection.query('DELETE FROM global_directory WHERE email = ?', ['admin@reporticket.com']);
        await connection.query('DELETE FROM system_users WHERE email = ?', ['admin@reporticket.com']);

        const adminId = 'admin-' + Math.random().toString(36).substr(2, 9);
        await connection.query(
            'INSERT INTO system_users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [adminId, 'Super Admin', 'admin@reporticket.com', 'admin123', 'superadmin']
        );
        await connection.query(
            'INSERT INTO global_directory (email, user_id, password, role) VALUES (?, ?, ?, ?)',
            ['admin@reporticket.com', adminId, 'admin123', 'superadmin']
        );

        console.log('SuperAdmin ready: admin@reporticket.com / admin123');
        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('ERROR:', error.message);
    }
};

init();
