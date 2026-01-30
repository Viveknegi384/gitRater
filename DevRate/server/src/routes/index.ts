import { Router } from 'express';
import { getRating } from '../controllers/ratingController';

const router = Router();

// @ts-ignore
router.get('/rate/:username', getRating);

export default router;
