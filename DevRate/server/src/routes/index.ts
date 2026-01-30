import { Router } from 'express';
import { getRating } from '../controllers/ratingController';
import { signup, login } from '../controllers/authController';
import { getUserProfiles, deleteProfile } from '../controllers/profileController';
import { authenticateToken } from '../middleware/auth';
const router = Router();

// Public routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);

// Rating route (requires authentication) - includes 24h caching
router.get('/rating/:username', authenticateToken, getRating);

// Protected routes
router.get('/profiles', authenticateToken, getUserProfiles);
router.delete('/profiles/:username', authenticateToken, deleteProfile);

export default router;
