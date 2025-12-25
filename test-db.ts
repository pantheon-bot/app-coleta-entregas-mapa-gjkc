import db from './src/lib/db/index.js';

async function testDB() {
  try {
    console.log('Testing database connection...');

    // Test select
    const existingUser = await db
      .selectFrom('users')
      .selectAll()
      .where('phone', '=', '+5511999999999')
      .executeTakeFirst();

    console.log('Existing user:', existingUser);

    if (!existingUser) {
      console.log('Inserting new user...');
      const result = await db
        .insertInto('users')
        .values({
          phone: '+5511999999999',
          role: 'CLIENTE',
          name: 'Test User',
        })
        .executeTakeFirst();

      console.log('Insert result:', result);
      console.log('insertId type:', typeof result?.insertId);
      console.log('insertId value:', result?.insertId);

      if (result?.insertId) {
        const newUser = await db
          .selectFrom('users')
          .selectAll()
          .where('id', '=', Number(result.insertId))
          .executeTakeFirst();

        console.log('Retrieved user:', newUser);
      }
    }

    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testDB();
