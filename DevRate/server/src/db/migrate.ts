import pool from './index';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

async function applySchema() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        await pool.query(schema);
        logger.info('Database schema applied successfully');
    } catch (error) {
        // Explicitly logging error message and stack for debugging
        logger.error('Error applying database schema:', error instanceof Error ? error.message : JSON.stringify(error));
        if (error instanceof Error) {
            console.error(error.stack);
        }
        throw error;
    }
}

applySchema()
    .then(() => {
        logger.info('Database migration completed');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Database migration failed:', error);
        process.exit(1);
    });
