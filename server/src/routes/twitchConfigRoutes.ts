import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  validateCreateConfig,
  validateUpdateConfig,
  validateDeleteConfig,
  validateGetConfig,
} from '../middleware/twitchConfigValidators';
import {
  getAllConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  validateConfig,
} from '../controllers/twitchConfigController';

const router = Router();

/**
 * All routes require authentication
 */

// GET /api/twitch-configs - Get all configs for authenticated user
router.get('/', authMiddleware, getAllConfigs);

// GET /api/twitch-configs/:id - Get a specific config
router.get('/:id', authMiddleware, validateGetConfig, getConfig);

// POST /api/twitch-configs - Create a new config
router.post('/', authMiddleware, validateCreateConfig, createConfig);

// POST /api/twitch-configs/validate - Validate Client ID and Secret
router.post('/validate', authMiddleware, validateCreateConfig, validateConfig);

// PUT /api/twitch-configs/:id - Update a config
router.put('/:id', authMiddleware, validateUpdateConfig, updateConfig);

// DELETE /api/twitch-configs/:id - Delete a config
router.delete('/:id', authMiddleware, validateDeleteConfig, deleteConfig);

export default router;
