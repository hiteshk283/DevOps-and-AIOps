import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hospitals_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 10,
  idleTimeoutMillis: 30000,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('[Hospital Service] Connected to PostgreSQL (hospitals_db)');
    client.release();
  } catch (error) {
    console.warn('[Hospital Service] Database connection warning:', (error as any).message);
  }
};
