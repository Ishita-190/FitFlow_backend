import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000, // 30 seconds
    requestTimeout: 30000,    // 30 seconds
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log('Connected to Azure SQL Database');
  } catch (err) {
    console.error('Database connection failed:', err);
    console.error('Server will continue running but DB operations will fail');
  }
};

export { sql };