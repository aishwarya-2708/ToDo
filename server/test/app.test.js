import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let mongo, app, agent, agentTwo, csrf;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-to-be-safe';
process.env.SESSION_NAME = 'taskmate.test.sid';
process.env.SESSION_DAYS = '7';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

before(async () => {
  process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cache/mongodb-binaries');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  const { connectDB } = await import('../src/config/db.js');
  await connectDB();
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

after(async () => { await app?.locals.sessionStore.close(); await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  const { resetAuthLimits } = await import('../src/routes/authRoutes.js');
  resetAuthLimits();
  agent = request.agent(app); agentTwo = request.agent(app);
  const result = await agent.get('/api/auth/csrf').expect(200);
  csrf = result.body.data.csrfToken;
});

async function register(userAgent = agent, email = 'alex@example.com') {
  const { body } = await userAgent.get('/api/auth/csrf');
  return await userAgent.post('/api/auth/register').set('X-CSRF-Token', body.data.csrfToken).send({ name: 'Alex Morgan', email, password: 'aSecurePassword123', confirmPassword: 'aSecurePassword123' });
}
async function login(userAgent, email = 'alex@example.com') {
  const { body } = await userAgent.get('/api/auth/csrf');
  return await userAgent.post('/api/auth/login').set('X-CSRF-Token', body.data.csrfToken).send({ email, password: 'aSecurePassword123' });
}

test('registration validates inputs, normalizes email, hashes password, and authenticates', async () => {
  await agent.post('/api/auth/register').set('X-CSRF-Token', csrf).send({ name: 'A', email: 'bad', password: 'short', confirmPassword: 'nope' }).expect(400);
  await agent.post('/api/auth/register').set('X-CSRF-Token', csrf).send({ name: 'Alex Morgan', email: 'alex@example.com', password: 'aSecurePassword123', confirmPassword: 'differentPassword' }).expect(400);
  const created = await register(agent, '  Alex@Example.com  ');
  assert.equal(created.status, 201);
  assert.equal(created.body.data.user.email, 'alex@example.com');
  assert.equal('passwordHash' in created.body.data.user, false);
  assert.ok(created.body.data.csrfToken);
  const stored = await mongoose.connection.collection('users').findOne({ email: 'alex@example.com' });
  assert.match(stored.passwordHash, /^\$2[aby]\$12\$/);
  assert.notEqual(stored.passwordHash, 'aSecurePassword123');
  const duplicate = await register(agentTwo, 'ALEX@example.com');
  assert.equal(duplicate.status, 409);
});

test('login returns generic credentials errors, rotates session, and logout invalidates it', async () => {
  const registered = await register();
  const beforeCookie = registered.headers['set-cookie']?.[0]?.split(';')[0];
  const failedToken = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
  const failed = await agent.post('/api/auth/login').set('X-CSRF-Token', failedToken).send({ email: 'missing@example.com', password: 'aSecurePassword123' }).expect(401);
  const badPasswordToken = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
  const badPassword = await agent.post('/api/auth/login').set('X-CSRF-Token', badPasswordToken).send({ email: 'alex@example.com', password: 'wrong-password' }).expect(401);
  assert.equal(failed.body.error.message, badPassword.body.error.message);
  const result = await login(agent);
  assert.equal(result.status, 200);
  assert.ok(result.body.data.user.id);
  assert.ok(result.headers['set-cookie']?.some((value) => value.includes('HttpOnly') && value.includes('SameSite=Lax')));
  assert.notEqual(result.headers['set-cookie']?.[0]?.split(';')[0], beforeCookie);
  const token = result.body.data.csrfToken;
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/auth/logout').set('X-CSRF-Token', token).expect(200);
  await agent.get('/api/auth/me').expect(401);
});

test('production session cookies are Secure, HTTP-only, and SameSite=Lax', async () => {
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const { createApp } = await import('../src/app.js');
  const productionApp = createApp();
  try {
    const response = await request(productionApp).get('/api/auth/csrf').set('X-Forwarded-Proto', 'https').expect(200);
    assert.ok(response.headers['set-cookie']?.some((value) => value.includes('HttpOnly') && value.includes('SameSite=Lax') && value.includes('Secure')));
  } finally {
    await productionApp.locals.sessionStore.close();
    process.env.NODE_ENV = previousMode;
  }
});

test('CSRF and Origin checks block state changes without affecting reads', async () => {
  await agent.post('/api/auth/register').send({ name: 'Alex Morgan', email: 'alex@example.com', password: 'aSecurePassword123', confirmPassword: 'aSecurePassword123' }).expect(403);
  await agent.post('/api/auth/register').set('Origin', 'https://attacker.example').set('X-CSRF-Token', csrf).send({ name: 'Alex Morgan', email: 'alex@example.com', password: 'aSecurePassword123', confirmPassword: 'aSecurePassword123' }).expect(403);
  await agent.get('/api/tasks').expect(401);
  await register();
  await agent.post('/api/tasks').send({ title: 'No token' }).expect(403);
  await agent.post('/api/tasks').set('X-CSRF-Token', 'wrong').send({ title: 'Wrong token' }).expect(403);
});

test('registration and login rate limits return 429 at configured thresholds', async () => {
  const token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
  for (let i = 0; i < 5; i++) await agent.post('/api/auth/register').set('X-CSRF-Token', token).send({}).expect(400);
  const registrationLimited = await agent.post('/api/auth/register').set('X-CSRF-Token', token).send({}).expect(429);
  assert.ok(registrationLimited.headers['ratelimit'] || registrationLimited.headers['ratelimit-limit']);
  for (let i = 0; i < 10; i++) await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({}).expect(400);
  await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({}).expect(429);
});

test('task CRUD validates fields, tracks completion, and enforces ownership', async () => {
  const firstUser = await register(); const secondUser = await register(agentTwo, 'sam@example.com');
  const token = firstUser.body.data.csrfToken;
  const secondToken = secondUser.body.data.csrfToken;
  await agent.post('/api/tasks').set('X-CSRF-Token', token).send({ title: 'bad date', dueDate: '2025-02-30' }).expect(400);
  await agent.post('/api/tasks').set('X-CSRF-Token', token).send({ title: 'Ship the project', description: 'Finish the final review', priority: 'high', dueDate: '2030-05-20' }).expect(201).then(async (created) => {
    const task = created.body.data;
    assert.equal(task.priority, 'high'); assert.equal(task.completed, false); assert.equal(task.description, 'Finish the final review');
    assert.equal((await agentTwo.get('/api/tasks').expect(200)).body.meta.count, 0);
    assert.deepEqual((await agentTwo.get('/api/dashboard/stats').expect(200)).body.data, { total: 0, pending: 0, completed: 0, overdue: 0 });
    await agentTwo.get(`/api/tasks/${task.id}`).expect(404);
    await agentTwo.patch(`/api/tasks/${task.id}`).set('X-CSRF-Token', secondToken).send({ title: 'stolen' }).expect(404);
    await agentTwo.delete(`/api/tasks/${task.id}`).set('X-CSRF-Token', secondToken).expect(404);
    const updated = await agent.patch(`/api/tasks/${task.id}`).set('X-CSRF-Token', token).send({ completed: true }).expect(200);
    assert.equal(updated.body.data.title, 'Ship the project'); assert.ok(updated.body.data.completedAt);
    const reopened = await agent.patch(`/api/tasks/${task.id}`).set('X-CSRF-Token', token).send({ completed: false }).expect(200);
    assert.equal(reopened.body.data.completedAt, null);
    await agent.delete(`/api/tasks/${task.id}`).set('X-CSRF-Token', token).expect(200);
  });
});

test('search, filters, sorting, pagination, and dashboard counts are owner scoped', async () => {
  const registered = await register(); const token = registered.body.data.csrfToken;
  const records = [
    { title: 'Alpha report', description: 'Quarterly planning', priority: 'high', dueDate: '2020-01-01' },
    { title: 'Beta review', priority: 'low', dueDate: '2030-01-01' },
    { title: 'Gamma notes', priority: 'medium', dueDate: '2020-01-01' },
    { title: 'Due today', priority: 'low', dueDate: new Date().toISOString().slice(0, 10) }
  ];
  const ids = [];
  for (const record of records) ids.push((await agent.post('/api/tasks').set('X-CSRF-Token', token).send(record).expect(201)).body.data.id);
  await agent.patch(`/api/tasks/${ids[2]}`).set('X-CSRF-Token', token).send({ completed: true }).expect(200);
  const search = await agent.get('/api/tasks?search=QUARTERLY&status=pending&priority=high').expect(200);
  assert.equal(search.body.meta.count, 1); assert.equal(search.body.data[0].id, ids[0]);
  const sorted = await agent.get('/api/tasks?sort=dueDate&order=asc&limit=2').expect(200);
  assert.equal(sorted.body.data[0].id, ids[0]); assert.equal(sorted.body.meta.count, 4); assert.equal(sorted.body.meta.pageCount, 2);
  const byPriority = await agent.get('/api/tasks?sort=priority&order=desc').expect(200);
  assert.equal(byPriority.body.data[0].priority, 'high');
  await agent.get('/api/tasks?page=0').expect(400);
  const stats = await agent.get('/api/dashboard/stats').expect(200);
  assert.deepEqual(stats.body.data, { total: 4, pending: 3, completed: 1, overdue: 1 });
  await agentTwo.get('/api/dashboard/stats').expect(401);
});
