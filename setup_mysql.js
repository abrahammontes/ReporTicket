import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function setup() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  };

  // In single mode or if DB_NAME is provided, connect directly to it
  if (process.env.DB_MODE === 'single' && process.env.DB_NAME) {
    connectionConfig.database = process.env.DB_NAME;
  }

  const connection = await mysql.createConnection(connectionConfig);

  console.log('Connected to MySQL server.');

  const sqlPath = path.resolve('db_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Creating database and tables...');
    await connection.query(sql);
    console.log('Database setup completed successfully.');
  } catch (err) {
    console.error('FULL ERROR:', err);
    if (err.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.log('HINT: Your DB user might not have CREATE DATABASE permissions. Please create it manually in cPanel.');
    }
  } finally {
    await connection.end();
  }
}

setup();
