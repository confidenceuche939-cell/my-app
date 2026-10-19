import { Router } from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Toutes les routes de tâches exigent un JWT valide.
router.use(protect);

// GET    /api/tasks        → list the tasks of the current user
router.get('/', getTasks);

// POST   /api/tasks        → create a new task for the current user
router.post('/', createTask);

// PATCH  /api/tasks/:id    → update title and/or completed
router.patch('/:id', updateTask);

// DELETE /api/tasks/:id    → delete a task
router.delete('/:id', deleteTask);

export default router;
