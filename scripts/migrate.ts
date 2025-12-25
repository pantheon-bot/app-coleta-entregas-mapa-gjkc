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

    // Remove comment lines first, then split by semicolon
    const sqlWithoutComments = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`\n[${i + 1}/${statements.length}] Executing:`);
        console.log(statement.substring(0, 200) + '...\n');
        try {
          const [result] = await pool.query(statement);
          console.log('✓ Success:', result);
        } catch (err) {
          console.error('✗ Error:', err);
          throw err;
        }
      }
    }

    console.log('✅ Migrations completed successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables found:', tables);

    if (Array.isArray(tables) && tables.length > 0) {
      console.log('✓ Tables created:');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tables.forEach((row: any) => {
        console.log('  -', Object.values(row)[0]);
      });
    } else {
      console.warn('⚠️  Warning: No tables found after migration!');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
