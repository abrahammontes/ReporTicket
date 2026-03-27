import mysql from 'mysql2/promise';

const config = {
    host: '51.77.71.235',
    user: 'capaorg_ReporTicket_Grupo_EXNO',
    password: '.GrupoEXNO.'
};

const testPrivilege = async () => {
    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to remote DB host.');

        try {
            await connection.query('CREATE DATABASE IF NOT EXISTS capaorg_test_privilege');
            console.log('SUCCESS: Can create databases.');
            await connection.query('DROP DATABASE IF EXISTS capaorg_test_privilege');
        } catch (err) {
            console.error('FAILURE to create DB:', err.message);
        }

        await connection.end();
    } catch (error) {
        console.error('ERROR connecting to host:', error.message);
    }
};

testPrivilege();
