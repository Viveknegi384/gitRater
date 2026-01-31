import { Router } from 'express';
import { getRating } from '../controllers/ratingController';
import { getUserProfiles, deleteProfile } from '../controllers/profileController';
import { uploadBulkRatings } from '../controllers/bulkController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as authController from '../controllers/authController';

const router = Router();

// Auth routes
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);

// Github Rating routes
router.get('/rating/:username', authenticateToken, getRating);

// Bulk Rating
router.post('/bulk-rate', authenticateToken, upload.single('file'), uploadBulkRatings);

// Profile routes
router.get('/profiles', authenticateToken, getUserProfiles);
router.delete('/profiles/:username', authenticateToken, deleteProfile);

export default router;
