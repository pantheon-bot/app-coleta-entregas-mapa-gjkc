import { createPool } from 'mysql2/promise';

async function checkTables() {
  const pool = createPool({
    uri: process.env.DATABASE_URL!,
    ssl: {
      minVersion: 'TLSv1.2' as const,
    }
  });

  try {
    console.log('Checking database tables...');

    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();
