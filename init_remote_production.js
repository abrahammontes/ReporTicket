import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'reporticket_master'
};

const init = async () => {
    try {
        const connection = await mysql.createConnection(config);
        console.log(`Connected to remote DB: ${config.database}`);

        const schema = fs.readFileSync('db_init.sql', 'utf8');
        const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

        console.log('Executing schema...');
        for (const statement of statements) {
            await connection.query(statement);
        }
        console.log('Schema initialized.');

        // Clean and re-create SuperAdmin
        const adminEmail = 'admin@reporticket.com';
        const adminPass = 'admin123';
        const hashedPass = await bcrypt.hash(adminPass, 10);

        await connection.query('DELETE FROM global_directory WHERE email = ?', [adminEmail]);
        await connection.query('DELETE FROM system_users WHERE email = ?', [adminEmail]);

        const adminId = 'admin-' + Math.random().toString(36).substr(2, 9);
        await connection.query(
            'INSERT INTO system_users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [adminId, 'Super Admin', adminEmail, hashedPass, 'superadmin']
        );
        await connection.query(
            'INSERT INTO global_directory (email, user_id, password, role) VALUES (?, ?, ?, ?)',
            [adminEmail, adminId, hashedPass, 'superadmin']
        );

        console.log(`SuperAdmin ready: ${adminEmail} / ${adminPass}`);
        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('ERROR:', error.message);
    }
};

init();
