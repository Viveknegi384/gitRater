import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import * as xlsx from 'xlsx';
import { getOrCalculateRating } from '../services/ratingService';
import pool from '../db';

export const uploadBulkRatings = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded.' });
        return;
    }

    try {
        const userId = req.user?.userId;
        const sessionName = req.body.sessionName || `Analysis ${new Date().toLocaleDateString()}`;
        
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

        // Save bulk analysis session to database
        let sessionId: number | null = null;
        if (userId && results.length > 0) {
            try {
                const sessionResult = await pool.query(
                    `INSERT INTO bulk_analysis_sessions (user_id, session_name, total_profiles)
                     VALUES ($1, $2, $3) RETURNING id`,
                    [userId, sessionName, results.length]
                );
                sessionId = sessionResult.rows[0].id;

                // Save each profile result
                for (const result of results) {
                    const candidateName = result.Name || result['Candidate Name'] || '';
                    const githubUrl = result['GitHub Link'] || result['GitHub'] || result['github'] || '';
                    const username = githubUrl ? String(githubUrl).split('github.com/')[1]?.split('/')[0] : '';

                    await pool.query(
                        `INSERT INTO bulk_analysis_profiles 
                        (session_id, candidate_name, github_url, github_username, devrate_tier, 
                         quality_score, job_fit_score, match_reason, error_message, profile_data)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [
                            sessionId,
                            candidateName,
                            githubUrl,
                            username,
                            result.devRate_score || null,
                            result.devRate_total || null,
                            result.job_fit_score || null,
                            result.match_reason || null,
                            result.devRate_error || null,
                            JSON.stringify(result)
                        ]
                    );
                }
                logger.info(`Saved bulk analysis session ${sessionId} with ${results.length} profiles`);
            } catch (dbError) {
                logger.error('Failed to save bulk analysis to database:', dbError);
            }
        }

        res.json({
            success: true,
            message: `Processed ${results.length} profiles.`,
            sessionId,
            data: results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        logger.error('Error processing bulk upload:', error);
        res.status(500).json({ success: false, error: 'Failed to process file.' });
    }
};

// Get all bulk analysis sessions for a user
export const getBulkSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const result = await pool.query(
            `SELECT id, session_name, total_profiles, created_at 
             FROM bulk_analysis_sessions 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error fetching bulk sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sessions.' });
    }
};

// Get details of a specific bulk analysis session
export const getBulkSessionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.params.sessionId;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        // Verify session belongs to user
        const sessionResult = await pool.query(
            `SELECT * FROM bulk_analysis_sessions 
             WHERE id = $1 AND user_id = $2`,
            [sessionId, userId]
        );

        if (sessionResult.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Session not found' });
            return;
        }

        // Get all profiles for this session
        const profilesResult = await pool.query(
            `SELECT * FROM bulk_analysis_profiles 
             WHERE session_id = $1 
             ORDER BY created_at ASC`,
            [sessionId]
        );

        res.json({
            success: true,
            session: sessionResult.rows[0],
            profiles: profilesResult.rows
        });
    } catch (error) {
        logger.error('Error fetching bulk session details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch session details.' });
    }
};
