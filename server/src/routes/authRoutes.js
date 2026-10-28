import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { csrf, register, login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
export const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } } });
export const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many registration attempts. Try again later.' } } });
export function resetAuthLimits() {
  for (const key of ['127.0.0.1', '::ffff:127.0.0.1']) { loginLimit.resetKey(key); registerLimit.resetKey(key); }
}

router.get('/csrf', csrf);
router.post('/register', registerLimit, register);
router.post('/login', loginLimit, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
export default router;
