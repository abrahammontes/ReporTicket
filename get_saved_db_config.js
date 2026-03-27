import mysql from 'mysql2/promise';

const getSavedConfig = async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'reporticket_master'
        });
        
        const [rows] = await conn.query("SELECT setting_value FROM global_settings WHERE setting_key = 'dbConfig'");
        if (rows.length > 0) {
            console.log('Saved config found:', rows[0].setting_value);
            const savedConfig = JSON.parse(rows[0].setting_value);
            
            // Now let's try to connect with these saved credentials
            console.log('\nTesting connection with saved credentials to:', savedConfig.host);
            try {
                const testConn = await mysql.createConnection({
                    host: savedConfig.host,
                    user: savedConfig.user,
                    password: savedConfig.password,
                    database: savedConfig.database
                });
                console.log('SUCCESS: Connection successful.');
                await testConn.end();
            } catch (verifyError) {
                console.error('ERROR: Connection failed:', verifyError.message);
            }
            
        } else {
            console.log('No dbConfig found in global_settings');
        }
        await conn.end();
    } catch (e) {
        console.error('ERROR querying local db:', e.message);
    }
};

getSavedConfig();
