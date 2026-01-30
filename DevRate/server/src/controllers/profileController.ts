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
            `SELECT sh.id, sh.searched_profile, sh.searched_at, gp.name, gp.avatar_url
             FROM search_history sh
             LEFT JOIN github_profiles gp ON sh.searched_profile = gp.username
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

        const result = await pool.query(
            'DELETE FROM search_history WHERE user_id = $1 AND searched_profile = $2 RETURNING *',
            [userId, username]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Profile not found in search history" });
            return;
        }

        res.json({ message: "Profile deleted successfully" });
    } catch (error) {
        logger.error("Error deleting profile:", error);
        res.status(500).json({ error: "Failed to delete profile" });
    }
};
