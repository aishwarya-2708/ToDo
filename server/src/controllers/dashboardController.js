import Task from '../models/Task.js';
import mongoose from 'mongoose';
import { asyncRoute } from '../utils/validation.js';

export const stats = asyncRoute(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [counts] = await Task.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.session.userId) } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      completed: { $sum: { $cond: ['$completed', 1, 0] } },
      overdue: { $sum: { $cond: [{ $and: [{ $eq: ['$completed', false] }, { $ne: ['$dueDate', null] }, { $lt: ['$dueDate', today] }] }, 1, 0] } }
    } }
  ]);
  const total = counts?.total ?? 0, completed = counts?.completed ?? 0;
  res.json({ data: { total, pending: total - completed, completed, overdue: counts?.overdue ?? 0 } });
});
