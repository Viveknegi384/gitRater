import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';


export const getUserProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const result = await pool.query(
            `SELECT sh.id, sh.searched_profile, sh.searched_at, 
                    gp.name, gp.avatar_url, gp.bio, gp.location, gp.company, gp.blog, gp.twitter_username, gp.email, gp.metrics,
                    r.total_score, r.health_score, r.quality_score, r.ai_analysis
             FROM search_history sh
             LEFT JOIN github_profiles gp ON sh.searched_profile = gp.username
             LEFT JOIN LATERAL (
                SELECT total_score, health_score, quality_score, ai_analysis
                FROM ratings 
                WHERE ratings.username = gp.username 
                ORDER BY created_at DESC 
                LIMIT 1
             ) r ON true
             WHERE sh.user_id = $1 
             ORDER BY sh.searched_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error("Error fetching user profiles:", error);
        res.status(500).json({ error: "Failed to fetch profiles" });
    }
};

export const deleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // DELETE from github_profiles will CASCADE to:
        // 1. ratings (ON DELETE CASCADE)
        // 2. search_history (ON DELETE CASCADE)
        // This effectively wipes the user from the entire system.
        const result = await pool.query(
            'DELETE FROM github_profiles WHERE username = $1 RETURNING *',
            [username]
        );

        if (result.rowCount === 0) {
            // It's possible the user wasn't in github_profiles but was in search_history (unlikely due to FK constraints)
            // or simply doesn't exist.
            res.status(404).json({ error: "Profile not found" });
            return;
        }

        res.json({ message: "Profile deleted successfully" });
    } catch (error) {
        logger.error("Error deleting profile:", error);
        res.status(500).json({ error: "Failed to delete profile" });
    }
};
