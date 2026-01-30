import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET must be defined in environment variables');
}

export const signup = async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, name, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }

    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters long" });
        return;
    }

    try {
        const existingUser = await pool.query(
            'SELECT * FROM app_users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            res.status(409).json({ error: "User with this email already exists" });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO app_users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
            [email, name || email.split('@')[0], hashedPassword]
        );

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        logger.error('Signup error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }

    try {
        const result = await pool.query('SELECT * FROM app_users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};
