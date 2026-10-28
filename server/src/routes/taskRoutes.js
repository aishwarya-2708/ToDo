import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listTasks, createTask, getTask, updateTask, deleteTask } from '../controllers/taskController.js';

const router = Router();
router.use(requireAuth);
router.route('/').get(listTasks).post(createTask);
router.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
export default router;
