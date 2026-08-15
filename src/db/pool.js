import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'harbinger',
    password: process.env.DB_PASSWORD || 'harbinger_dev',
    database: process.env.DB_NAME || 'harbinger',
});

export default pool;