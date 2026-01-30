import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET must be defined in environment variables');
}

interface JwtPayload {
    userId: string;
    email: string;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        
        // Check if user still exists in database
        const userExists = await import('../db').then(m => m.default.query(
            'SELECT 1 FROM app_users WHERE id = $1',
            [decoded.userId]
        ));

        if (userExists.rows.length === 0) {
             res.status(401).json({ error: 'User no longer exists', code: 'USER_NOT_FOUND' });
             return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
