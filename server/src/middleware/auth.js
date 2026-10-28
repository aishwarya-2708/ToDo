import { HttpError } from '../utils/validation.js';

export function requireAuth(req, _res, next) {
  if (!req.session?.userId) return next(new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue'));
  next();
}
