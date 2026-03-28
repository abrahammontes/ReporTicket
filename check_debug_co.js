const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDebugCo() {
  const masterPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- DB CHECK FOR Debug Co ---');
    
    // 1. Find the company
    const [companies] = await masterPool.query('SELECT * FROM companies WHERE name = "Debug Co" ORDER BY created_at DESC LIMIT 1');
    if (companies.length === 0) {
      console.log('Company "Debug Co" NOT FOUND in master database.');
      return;
    }
    const company = companies[0];
    console.log('Company found:', JSON.stringify(company, null, 2));

    // 2. Check global_directory
    const [globalUsers] = await masterPool.query('SELECT * FROM global_directory WHERE company_id = ?', [company.id]);
    console.log('\nUsers in Global Directory for this company:', globalUsers.length);
    globalUsers.forEach(u => console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`));

    // 3. Check company_users (since DB_MODE=single, it's in the same DB)
    const [companyUsers] = await masterPool.query('SELECT * FROM company_users WHERE company_id = ?', [company.id]);
    console.log('\nUsers in company_users table for this company:', companyUsers.length);
    companyUsers.forEach(u => console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`));

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await masterPool.end();
  }
}

checkDebugCo();
