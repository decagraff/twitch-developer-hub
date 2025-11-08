import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  validateGenerateAppToken,
  validateStartUserToken,
  validatePollUserToken,
  validateDeleteToken,
  validateGetToken,
  validateStartAuthorizationFlow,
  validateAuthorizationCallback,
  validateRefreshToken,
} from '../middleware/tokenValidators';
import {
  getAllTokens,
  getToken,
  generateAppToken,
  startUserToken,
  pollUserToken,
  deleteToken,
  startAuthorizationFlow,
  handleAuthorizationCallback,
  refreshToken,
  validateSavedToken,
} from '../controllers/tokenController';

const router = Router();

/**
 * All routes require authentication
 */

// GET /api/tokens - Get all saved tokens for authenticated user
router.get('/', authMiddleware, getAllTokens);

// GET /api/tokens/:id - Get a specific token (with decrypted access token)
router.get('/:id', authMiddleware, validateGetToken, getToken);

// POST /api/tokens/app - Generate an app access token
router.post('/app', authMiddleware, validateGenerateAppToken, generateAppToken);

// POST /api/tokens/user/start - Start user access token device flow
router.post('/user/start', authMiddleware, validateStartUserToken, startUserToken);

// POST /api/tokens/user/poll - Poll for user access token completion
router.post('/user/poll', authMiddleware, validatePollUserToken, pollUserToken);

// POST /api/tokens/user/authorize - Start Authorization Code Flow (returns auth URL)
router.post('/user/authorize', authMiddleware, validateStartAuthorizationFlow, startAuthorizationFlow);

// POST /api/tokens/user/callback - Handle OAuth callback (exchange code for token)
router.post('/user/callback', authMiddleware, validateAuthorizationCallback, handleAuthorizationCallback);

// POST /api/tokens/:id/refresh - Refresh an existing token
router.post('/:id/refresh', authMiddleware, validateRefreshToken, refreshToken);

// GET /api/tokens/:id/validate - Validate a saved token with Twitch API
router.get('/:id/validate', authMiddleware, validateGetToken, validateSavedToken);

// DELETE /api/tokens/:id - Delete a saved token
router.delete('/:id', authMiddleware, validateDeleteToken, deleteToken);

export default router;
