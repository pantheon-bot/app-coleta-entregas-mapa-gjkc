import { createPool } from 'mysql2/promise';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env.local
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

async function diagnose() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  // Parse DATABASE_URL to extract database name
  const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
  const dbName = url.pathname.substring(1);

  console.log('📊 Database Configuration:');
  console.log('  Host:', url.hostname);
  console.log('  Database:', dbName || '(not specified)');
  console.log('  User:', url.username);

  const pool = createPool({
    uri: process.env.DATABASE_URL,
    ssl: {
      minVersion: 'TLSv1.2' as const,
    }
  });

  try {
    // Check current database
    const [dbResult] = await pool.query('SELECT DATABASE() as db');
    console.log('\n📦 Current Database:', (dbResult as any)[0].db);

    // List all tables
    const [tables] = await pool.query('SHOW TABLES');
    console.log('\n📋 Tables in current database:');
    if (Array.isArray(tables) && tables.length > 0) {
      tables.forEach((row: any) => {
        console.log('  -', Object.values(row)[0]);
      });
    } else {
      console.log('  (no tables found)');
    }

    // Try to count users
    try {
      const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('\n👥 User count:', (userCount as any)[0].count);
    } catch (e) {
      console.log('\n❌ Cannot query users table:', (e as Error).message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
