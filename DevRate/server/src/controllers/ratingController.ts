import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getOrCalculateRating } from '../services/ratingService';

export const getRating = async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.params.username as string;

    if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
    }

    try {
        const result = await getOrCalculateRating(username, req.user?.userId);

        res.json({
            success: true,
            message: result.cached 
                ? 'Profile data retrieved from cache (updated within 24 hours)' 
                : 'Profile rating calculated and saved successfully',
            cached: result.cached,
            lastUpdated: result.cached ? result.lastUpdated : undefined,
            data: result.data
        });

    } catch (error: any) {
        logger.error('Error in getRating:', error);
        
        if (error.status === 403 || error.status === 429) {
            res.status(429).json({ 
                success: false,
                error: "GitHub API Rate Limit Exceeded. Please try again later.",
                retryAfter: error.response?.headers?.['retry-after'] || 3600
            });
            return;
        }

        if (error.status === 404) {
            res.status(404).json({ success: false, error: `GitHub user '${username}' not found` });
            return;
        }

        res.status(500).json({ success: false, error: 'Failed to calculate rating' });
    }
};

// getTier is moved to service but if used elsewhere, might need export. 
// For now, it's irrelevant here as response data comes formatted from service.
