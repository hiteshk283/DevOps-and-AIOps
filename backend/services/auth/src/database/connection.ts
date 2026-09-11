import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'auth_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('[Auth DB] Connected to auth_db successfully');
      client.release();
      return;
    } catch (err: any) {
      console.warn(`[Auth DB] Connection failed (${err.message}). Retries left: ${retries - 1}`);
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
};
