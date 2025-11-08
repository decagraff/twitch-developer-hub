import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { body, param } from 'express-validator';
import {
  createApiLog,
  getAllApiLogs,
  getApiLog,
  deleteApiLog,
  deleteAllApiLogs,
} from '../controllers/apiLogController';

const router = Router();

/**
 * All routes require authentication
 */

// GET /api/logs - Get all API logs for authenticated user
router.get('/', authMiddleware, getAllApiLogs);

// GET /api/logs/:id - Get a specific API log
router.get(
  '/:id',
  authMiddleware,
  param('id').isUUID(),
  getApiLog
);

// POST /api/logs - Create a new API log
router.post(
  '/',
  authMiddleware,
  [
    body('method').isString().notEmpty(),
    body('endpoint').isString().notEmpty(),
    body('tokenId').optional().isUUID(),
    body('status').optional().isInt(),
    body('requestBody').optional(),
    body('responseBody').optional(),
    body('error').optional().isString(),
  ],
  createApiLog
);

// DELETE /api/logs/:id - Delete a specific API log
router.delete(
  '/:id',
  authMiddleware,
  param('id').isUUID(),
  deleteApiLog
);

// DELETE /api/logs - Delete all API logs for authenticated user
router.delete('/', authMiddleware, deleteAllApiLogs);

export default router;
