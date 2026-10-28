import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../utils/validation.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
export function issueCsrf(req) {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

export function verifyOrigin(req, _res, next) {
  const origin = req.get('origin');
  const expected = process.env.CLIENT_ORIGIN || process.env.RENDER_EXTERNAL_URL;
  if (origin && expected && origin !== expected) return next(new HttpError(403, 'INVALID_ORIGIN', 'Request origin is not allowed'));
  next();
}

export function csrfProtection(req, _res, next) {
  if (safeMethods.has(req.method)) return next();
  const expected = req.session?.csrfToken;
  const supplied = req.get('x-csrf-token');
  if (!expected || !supplied || expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return next(new HttpError(403, 'CSRF_INVALID', 'A valid CSRF token is required'));
  }
  next();
}

export function rotateCsrf(req) {
  req.session.csrfToken = randomBytes(32).toString('hex');
  return req.session.csrfToken;
}
