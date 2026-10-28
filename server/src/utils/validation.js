export class HttpError extends Error {
  constructor(status, code, message, details = []) { super(message); this.status = status; this.code = code; this.details = details; }
}

export function objectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'INVALID_BODY', 'A JSON object is required');
  return body;
}

export function rejectUnknown(body, allowed) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new HttpError(400, 'UNKNOWN_FIELDS', 'Request contains unsupported fields', unknown.map((field) => ({ field, message: 'Unknown field' })));
}

export function requiredString(value, field, min, max) {
  if (typeof value !== 'string') throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: 'Must be a string' }]);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: `Must be ${min}–${max} characters` }]);
  return clean;
}

export function passwordString(value, field, min = 10) {
  if (typeof value !== 'string' || value.length < min || value.length > 128) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: `Must be ${min}–128 characters` }]);
  return value;
}

export function optionalString(body, field, max, fallback) {
  if (!(field in body)) return fallback;
  if (typeof body[field] !== 'string' || body[field].trim().length > max) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: `Must be a string up to ${max} characters` }]);
  return body[field].trim();
}

export function validDueDate(value, field = 'dueDate') {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: 'Use a valid YYYY-MM-DD date' }]);
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field, message: 'Use a real calendar date' }]);
  return value;
}

export function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
