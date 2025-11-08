import { Router } from 'express';
import { register, login, refresh, getCurrentUser } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRegister, validateLogin } from '../middleware/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refresh);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private (requires JWT)
 */
router.get('/me', authMiddleware, getCurrentUser);

export default router;
