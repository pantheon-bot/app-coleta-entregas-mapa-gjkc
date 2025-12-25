import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createPool } from 'mysql2/promise';
import { config } from 'dotenv';

// Load .env.local
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
  console.log('✓ Loaded .env.local');
} else {
  console.warn('⚠ .env.local not found, using environment variables');
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('📦 Connecting to database...');
  const pool = createPool({
    uri: process.env.DATABASE_URL,
    ssl: {
      minVersion: 'TLSv1.2' as const,
    }
  });

  try {
    console.log('🔄 Running migrations...');

    // Read and execute migration file
    const migrationPath = join(process.cwd(), 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        await pool.query(statement);
      }
    }

    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
