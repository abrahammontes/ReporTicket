import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- SCHEMA CHECK FOR global_directory ---');
    const [columns] = await pool.query('DESCRIBE global_directory');
    columns.forEach(col => {
      console.log(`Column: ${col.Field}, Type: ${col.Type}, Null: ${col.Null}, Key: ${col.Key}`);
    });

    console.log('\n--- DATA CHECK FOR "Debug Co" ---');
    const [companies] = await pool.query('SELECT * FROM companies WHERE name = "Debug Co" ORDER BY created_at DESC LIMIT 1');
    if (companies.length > 0) {
      const company = companies[0];
      console.log('Company:', company.id, company.name);
      
      const [users] = await pool.query('SELECT * FROM global_directory WHERE company_id = ?', [company.id]);
      console.log('Users in global_directory:', users.length);
      users.forEach(u => console.log(`- ${u.name} (${u.email})`));

      const [cUsers] = await pool.query('SELECT * FROM company_users WHERE company_id = ?', [company.id]);
      console.log('Users in company_users:', cUsers.length);
      cUsers.forEach(u => console.log(`- ${u.name} (${u.email})`));
    } else {
      console.log('Company "Debug Co" not found.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
