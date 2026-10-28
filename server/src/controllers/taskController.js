import mongoose from 'mongoose';
import Task, { serializeTask } from '../models/Task.js';
import { HttpError, objectBody, rejectUnknown, requiredString, optionalString, validDueDate, asyncRoute } from '../utils/validation.js';

const createFields = ['title', 'description', 'priority', 'dueDate'];
const patchFields = [...createFields, 'completed'];
const priorities = ['low', 'medium', 'high'];
const validId = (id) => mongoose.isValidObjectId(id);
const ownerId = (req) => req.session.userId;
function priorityValue(value, fallback) {
  if (value === undefined) return fallback;
  if (!priorities.includes(value)) throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field: 'priority', message: 'Choose low, medium, or high' }]);
  return value;
}
function validateId(id) { if (!validId(id)) throw new HttpError(404, 'NOT_FOUND', 'Task was not found'); }

export const listTasks = asyncRoute(async (req, res) => {
  const { search = '', status = 'all', priority, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query;
  if (typeof search !== 'string' || search.length > 100) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid search value');
  if (!['all', 'pending', 'completed'].includes(status)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid status filter');
  if (priority !== undefined && !priorities.includes(priority)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid priority filter');
  if (!['createdAt', 'dueDate', 'priority', 'title'].includes(sort) || !['asc', 'desc'].includes(order)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid sorting option');
  const pageNum = Number(page), limitNum = Number(limit);
  if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) throw new HttpError(400, 'VALIDATION_ERROR', 'Page must be positive and limit must be between 1 and 100');
  const filter = { owner: new mongoose.Types.ObjectId(ownerId(req)) };
  if (status !== 'all') filter.completed = status === 'completed';
  if (priority) filter.priority = priority;
  if (search) { const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }]; }
  const count = await Task.countDocuments(filter);
  let rows;
  if (sort === 'dueDate') {
    const direction = order === 'asc' ? 1 : -1;
    rows = await Task.aggregate([
      { $match: filter }, { $addFields: { dueDateMissing: { $eq: ['$dueDate', null] } } },
      { $sort: { dueDateMissing: 1, dueDate: direction, _id: 1 } }, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }
    ]);
  } else if (sort === 'priority') {
    rows = await Task.aggregate([
      { $match: filter },
      { $addFields: { priorityRank: { $switch: { branches: [{ case: { $eq: ['$priority', 'high'] }, then: 3 }, { case: { $eq: ['$priority', 'medium'] }, then: 2 }], default: 1 } } } },
      { $sort: { priorityRank: order === 'asc' ? 1 : -1, _id: 1 } }, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }
    ]);
  } else {
    rows = await Task.find(filter).sort({ [sort]: order === 'asc' ? 1 : -1, _id: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum);
  }
  res.json({ data: rows.map(serializeTask), meta: { count, page: pageNum, limit: limitNum, pageCount: Math.ceil(count / limitNum) } });
});

export const createTask = asyncRoute(async (req, res) => {
  const body = objectBody(req.body); rejectUnknown(body, createFields);
  const title = requiredString(body.title, 'title', 1, 160);
  const description = optionalString(body, 'description', 2000, '');
  const priority = priorityValue(body.priority, 'medium');
  const dueDate = body.dueDate === undefined ? null : validDueDate(body.dueDate);
  const task = await Task.create({ owner: ownerId(req), title, description, priority, dueDate });
  res.status(201).json({ data: serializeTask(task) });
});

export const getTask = asyncRoute(async (req, res) => {
  validateId(req.params.id);
  const task = await Task.findOne({ _id: req.params.id, owner: ownerId(req) });
  if (!task) throw new HttpError(404, 'NOT_FOUND', 'Task was not found');
  res.json({ data: serializeTask(task) });
});

export const updateTask = asyncRoute(async (req, res) => {
  validateId(req.params.id);
  const body = objectBody(req.body); rejectUnknown(body, patchFields);
  if (!Object.keys(body).length) throw new HttpError(400, 'VALIDATION_ERROR', 'Provide at least one field to update');
  const changes = {};
  if ('title' in body) changes.title = requiredString(body.title, 'title', 1, 160);
  if ('description' in body) changes.description = optionalString(body, 'description', 2000, '');
  if ('priority' in body) changes.priority = priorityValue(body.priority);
  if ('dueDate' in body) changes.dueDate = validDueDate(body.dueDate);
  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the submitted fields', [{ field: 'completed', message: 'Must be true or false' }]);
    changes.completed = body.completed; changes.completedAt = body.completed ? new Date() : null;
  }
  const task = await Task.findOneAndUpdate({ _id: req.params.id, owner: ownerId(req) }, { $set: changes }, { new: true, runValidators: true });
  if (!task) throw new HttpError(404, 'NOT_FOUND', 'Task was not found');
  res.json({ data: serializeTask(task) });
});

export const deleteTask = asyncRoute(async (req, res) => {
  validateId(req.params.id);
  const task = await Task.findOneAndDelete({ _id: req.params.id, owner: ownerId(req) });
  if (!task) throw new HttpError(404, 'NOT_FOUND', 'Task was not found');
  res.json({ data: { id: task._id.toString(), deleted: true } });
});
