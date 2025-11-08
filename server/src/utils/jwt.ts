import jwt, { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE: string = process.env.JWT_EXPIRE || '7d';
const REFRESH_TOKEN_EXPIRE: string = process.env.REFRESH_TOKEN_EXPIRE || '30d';

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRE,
  } as SignOptions);
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(payload: JwtPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
