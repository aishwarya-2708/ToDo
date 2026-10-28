import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: String, default: null, validate: { validator: (value) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value), message: 'Due date must be a real YYYY-MM-DD date' } },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

taskSchema.pre('validate', function () {
  if (this.completed && !this.completedAt) this.completedAt = new Date();
  if (!this.completed) this.completedAt = null;
});

taskSchema.index({ owner: 1, createdAt: -1 });
taskSchema.index({ owner: 1, completed: 1, dueDate: 1 });
taskSchema.index({ owner: 1, priority: 1 });

export function serializeTask(task) {
  return {
    id: task._id.toString(), title: task.title, description: task.description,
    priority: task.priority, dueDate: task.dueDate, completed: task.completed,
    completedAt: task.completedAt, createdAt: task.createdAt, updatedAt: task.updatedAt
  };
}

export default mongoose.model('Task', taskSchema);
