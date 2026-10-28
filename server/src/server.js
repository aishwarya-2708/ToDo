import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const port = Number(process.env.PORT || 4000);
try {
  await connectDB();
  createApp().listen(port, () => console.log(`TaskMate API listening on port ${port}`));
} catch (error) {
  console.error('Unable to start TaskMate API:', error.message);
  process.exit(1);
}
