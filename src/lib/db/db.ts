import { createPool } from 'mysql2';
import { Kysely, MysqlDialect } from 'kysely';

const db = new Kysely({
  dialect: new MysqlDialect({
    pool: createPool({
      uri: process.env.DATABASE_URL!,
      ssl: {
        minVersion: 'TLSv1.2',
      }
    })
  }),
});

export default db;