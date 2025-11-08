import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateTokens, verifyToken } from '../utils/jwt';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Return user and tokens (exclude password)
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Return user and tokens (exclude password)
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Generate new access token
    const tokens = generateTokens({
      userId: decoded.userId,
      email: decoded.email,
    });

    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token',
    });
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // User is attached by authMiddleware
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user',
    });
  }
}
