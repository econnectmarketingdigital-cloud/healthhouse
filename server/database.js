import './env.js';
import pg from 'pg';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    }
  : {
      host: process.env.DB_HOST || 'aws-1-us-east-1.pooler.supabase.com',
      port: Number(process.env.DB_PORT || 6543),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    };

const pool = new pg.Pool(poolConfig);

const convertSql = (sql) => {
  let count = 1;
  return sql.replace(/\?/g, () => '$' + (count++));
};

class AsyncDatabaseWrapper {
  async query(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await pool.query(pgSql, params);
    return result.rows;
  }

  async queryOne(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await pool.query(pgSql, params);
    return result.rows[0];
  }

  async execute(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await pool.query(pgSql, params);
    return { changes: result.rowCount };
  }
}

const db = new AsyncDatabaseWrapper();

export async function initDatabase() {
  if (!process.env.DATABASE_URL && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
    console.warn('⚠️ [Database] Credenciais do banco (DATABASE_URL ou DB_USER/DB_PASSWORD) ainda não configuradas no .env!');
    return db;
  }
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err.message);
  }
  return db;
}

export function getDb() {
  return db;
}

export default { initDatabase, getDb };
