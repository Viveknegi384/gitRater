import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import * as xlsx from 'xlsx';
import { getOrCalculateRating } from '../services/ratingService';

export const uploadBulkRatings = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded.' });
        return;
    }

    try {
        const userId = req.user?.userId;
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        logger.info(`Processing bulk upload file: ${req.file.originalname} with ${data.length} rows.`);

        const results = [];
        const errors = [];
        
        // Find column containing GitHub URL
        // We'll check the first row for any value that looks like a github url or key name 'github'
        if (data.length === 0) {
            res.json({ success: true, message: 'File is empty.', data: [] });
            return;
        }

        // Identify key for GitHub URL
        const firstRow: any = data[0];
        let urlKey = '';
        
        // Strategy 1: Look for key with 'github' (case insensitive)
        const keys = Object.keys(firstRow);
        urlKey = keys.find(k => k.toLowerCase().includes('github')) || '';

        // Strategy 2: If no key, look for value in first row that looks like a URL
        if (!urlKey) {
            for (const key of keys) {
                const val = String(firstRow[key]);
                if (val.includes('github.com/')) {
                    urlKey = key;
                    break;
                }
            }
        }

        if (!urlKey) {
             res.status(400).json({ success: false, error: 'Could not identify GitHub URL column. Please ensure a column named "GitHub" exists or contains valid URLs.' });
             return;
        }

        logger.info(`Identified GitHub URL column: ${urlKey}`);

        // Process sequentially to be safe with rate limits
        for (const row of data as any[]) {
            const url = row[urlKey];
            if (!url) continue;

            // Extract username from URL (https://github.com/username)
            const parts = String(url).split('github.com/');
            if (parts.length < 2) continue;
            
            const username = parts[1].split('/')[0].trim();
            if (!username) continue;

            try {
                logger.info(`Processing bulk user: ${username}`);
                
                // Extract job description if present
                const jobDescription = req.body.jobDescription;
                
                const rating = await getOrCalculateRating(username, userId, jobDescription);
                results.push({
                    ...row,
                    devRate_score: rating.data.tier,
                    devRate_total: rating.data.score_breakdown.quality_score,
                    job_fit_score: (rating.data.ai_analysis as any)?.job_fit_score,
                    match_reason: (rating.data.ai_analysis as any)?.match_reason
                });
            } catch (err: any) {
                logger.error(`Failed to process ${username}`, err);
                errors.push({ username, error: err.message });
                results.push({
                    ...row,
                    devRate_error: 'Failed to process'
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${results.length} profiles.`,
            data: results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        logger.error('Error processing bulk upload:', error);
        res.status(500).json({ success: false, error: 'Failed to process file.' });
    }
};
