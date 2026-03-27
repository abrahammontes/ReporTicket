import mysql from 'mysql2/promise';

const test = async () => {
    try {
        const conn = await mysql.createConnection({
            host: '51.77.71.235',
            user: 'capaorg_abrahammontes',
            password: '1',
            database: 'reporticket_master'
        });
        console.log('SUCCESS');
        await conn.end();
    } catch (e) {
        console.error('ERROR:', e.message);
    }
};
test();
