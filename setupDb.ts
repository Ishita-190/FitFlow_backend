/**
 * Run this script to create the database tables.
 * Usage: npx ts-node --esm setupDb.ts
 */
import 'dotenv/config';
import sql from 'mssql';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function setup() {
  console.log('Connecting to Azure SQL...');
  const pool = await sql.connect(config);
  console.log('Connected. Running schema...');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split by GO or run as batch (mssql doesn't use GO - run the whole thing)
  try {
    await pool.request().query(schema);
    console.log('✓ Schema applied successfully');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('✓ Tables already exist');
    } else {
      throw err;
    }
  }

  console.log('Done! Database is ready.');
  await pool.close();
  process.exit(0);
}

setup().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
