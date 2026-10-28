import { HttpError } from '../utils/validation.js';

export function notFound(_req, _res, next) { next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found')); }
export function errorHandler(err, _req, res, _next) {
  const status = err instanceof HttpError ? err.status : (err.status === 400 || err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
  const code = err instanceof HttpError ? err.code : (status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  const message = err instanceof HttpError ? err.message : (status === 400 ? 'Please check the submitted fields' : 'Something went wrong. Please try again.');
  const details = err instanceof HttpError ? err.details : [];
  if (status >= 500) console.error('TaskMate request failed:', err.message);
  res.status(status).json({ error: { code, message, ...(details.length ? { details } : {}) } });
}
