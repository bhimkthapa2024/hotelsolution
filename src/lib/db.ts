import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@/drizzle/schema';
import path from 'path';

// Robust path resolution for reliable execution in all environments
const dbPath = path.join(process.cwd(), 'data/sqlite.db');
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
