import { Client } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const createDatabase = async () => {
    const targetDb = process.env.DB_NAME || 'devrate';
    
    // Connect to default 'postgres' database to execute admin commands
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: 'postgres', // Maintenance DB
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        logger.info(`🔌 Connected to 'postgres' maintenance database.`);

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
        
        if (res.rowCount === 0) {
            logger.info(`✨ Database '${targetDb}' does not exist. Creating it...`);
            await client.query(`CREATE DATABASE "${targetDb}"`);
            logger.info(`✅ Database '${targetDb}' created successfully!`);
        } else {
            logger.info(`ℹ️ Database '${targetDb}' already exists.`);
        }

    } catch (err) {
        logger.error("❌ Failed to create database:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
};

createDatabase();
