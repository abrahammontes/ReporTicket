import mysql from 'mysql2/promise';

const config = {
    host: '51.77.71.235',
    user: 'capaorg_ReporTicket_Grupo_EXNO',
    password: '.GrupoEXNO.'
};

const test = async () => {
    try {
        const conn = await mysql.createConnection(config);
        console.log('CONNECTED TO HOST');
        const [dbs] = await conn.query('SHOW DATABASES');
        console.log('DATABASES:', dbs.map(d => d.Database));
        await conn.end();
    } catch (e) {
        console.error('ERROR:', e.message);
    }
};
test();
