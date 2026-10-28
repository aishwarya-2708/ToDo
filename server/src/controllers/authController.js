import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { HttpError, objectBody, rejectUnknown, requiredString, passwordString, asyncRoute } from '../utils/validation.js';
import { issueCsrf, rotateCsrf } from '../middleware/security.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dummyHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.4g9E8jLZ.WzRk3R.2g.DpZR5PCs3G9W';
const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email });

export const csrf = asyncRoute(async (req, res) => {
  const csrfToken = issueCsrf(req);
  await new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
  res.json({ data: { csrfToken } });
});

export const register = asyncRoute(async (req, res) => {
  const body = objectBody(req.body);
  rejectUnknown(body, ['name', 'email', 'password', 'confirmPassword']);
  const name = requiredString(body.name, 'name', 2, 80);
  const email = requiredString(body.email, 'email', 3, 254).toLowerCase();
  if (!emailPattern.test(email)) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field: 'email', message: 'Enter a valid email address' }]);
  const password = passwordString(body.password, 'password');
  const confirmation = passwordString(body.confirmPassword, 'confirmPassword');
  if (password !== confirmation) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field: 'confirmPassword', message: 'Passwords do not match' }]);
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try { user = await User.create({ name, email, passwordHash }); }
  catch (err) { if (err.code === 11000) throw new HttpError(409, 'EMAIL_EXISTS', 'An account with this email already exists'); throw err; }
  await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));
  req.session.userId = user._id.toString();
  const csrfToken = rotateCsrf(req);
  await new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
  res.status(201).json({ data: { user: publicUser(user), csrfToken } });
});

export const login = asyncRoute(async (req, res) => {
  const body = objectBody(req.body);
  rejectUnknown(body, ['email', 'password']);
  const email = requiredString(body.email, 'email', 3, 254).toLowerCase();
  const password = passwordString(body.password, 'password', 1);
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !matches) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));
  req.session.userId = user._id.toString();
  const csrfToken = rotateCsrf(req);
  await new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
  res.json({ data: { user: publicUser(user), csrfToken } });
});

export const me = asyncRoute(async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
  res.json({ data: { user: publicUser(user) } });
});

export const logout = asyncRoute(async (req, res) => {
  await new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve()));
  res.clearCookie(process.env.SESSION_NAME || 'taskmate.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ data: { message: 'Logged out' } });
});
