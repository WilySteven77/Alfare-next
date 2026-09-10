import { existsSync } from 'fs';
import { Pool } from 'pg';

const globalForPg = globalThis;

function resolveHost() {
  const host = process.env.DB_HOST || 'localhost';
  const runningInDocker = existsSync('/.dockerenv');
  if (!runningInDocker && (host === 'alfared-database' || host === 'host.docker.internal')) {
    return 'localhost';
  }
  return host;
}

function createPool() {
  return new Pool({
    host: resolveHost(),
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_DATABASE || process.env.POSTGRES_DB,
    options: '-c search_path=alfared,public',
    max: 10,
  });
}

export const pool = globalForPg.alfaredPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.alfaredPool = pool;
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function pingDb() {
  const result = await query('SELECT current_database() AS database, current_user AS usuario, NOW() AS ahora');
  return result.rows[0];
}

export function dbConfigMissing() {
  const user = process.env.DB_USER || process.env.POSTGRES_USER;
  const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.DB_DATABASE || process.env.POSTGRES_DB;
  const missing = [];
  if (!user) missing.push('DB_USER o POSTGRES_USER');
  if (password == null || password === '') missing.push('DB_PASSWORD o POSTGRES_PASSWORD');
  if (!database) missing.push('DB_DATABASE o POSTGRES_DB');
  return missing;
}
