import pool from '../db';
import { logger } from '../utils/logger';

async function recordSearchHistory(userId: string, username: string): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO search_history (user_id, searched_profile)
             VALUES ($1, $2)
             ON CONFLICT (user_id, searched_profile) 
             DO UPDATE SET searched_at = CURRENT_TIMESTAMP`,
            [userId, username]
        );
    } catch (error) {
        logger.error('Error recording search history:', error);
    }
}

export { recordSearchHistory };
