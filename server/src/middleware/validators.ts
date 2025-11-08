import { Request, Response, NextFunction } from 'express';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password: string): boolean {
  // At least 6 characters
  return password.length >= 6;
}

/**
 * Middleware to validate registration data
 */
export function validateRegister(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (!isValidPassword(password)) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
    return;
  }

  next();
}

/**
 * Middleware to validate login data
 */
export function validateLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
    return;
  }

  next();
}
