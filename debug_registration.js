const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRegisterCompany() {
  const masterPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const testCompanyName = 'Test Company ' + Date.now();
  const testAdminUser = {
    name: 'Test Admin',
    email: 'testadmin_' + Date.now() + '@example.com',
    password: 'password123'
  };

  console.log('--- TESTING COMPANY REGISTRATION ---');
  console.log('Company:', testCompanyName);
  console.log('Admin Email:', testAdminUser.email);

  try {
    const response = await fetch('http://localhost:3000/api/register-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testCompanyName, adminUser: testAdminUser })
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n--- VERIFYING IN DATABASE ---');
      const companyId = data.companyId;
      
      // Check companies table
      const [companies] = await masterPool.query('SELECT * FROM companies WHERE id = ?', [companyId]);
      console.log('Company in Master:', companies.length > 0 ? 'FOUND' : 'NOT FOUND');

      // Check global_directory
      const [globalUsers] = await masterPool.query('SELECT * FROM global_directory WHERE email = ?', [testAdminUser.email]);
      console.log('Admin in Global Directory:', globalUsers.length > 0 ? 'FOUND' : 'NOT FOUND');

      // Check company_users table (in master if single mode)
      const [companyUsers] = await masterPool.query('SELECT * FROM company_users WHERE email = ? AND company_id = ?', [testAdminUser.email, companyId]);
      console.log('Admin in Company Users:', companyUsers.length > 0 ? 'FOUND' : 'NOT FOUND');
    }
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await masterPool.end();
  }
}

testRegisterCompany();
