import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { stats } from '../controllers/dashboardController.js';
const router = Router();
router.get('/stats', requireAuth, stats);
export default router;
