import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import {
  generateAppAccessToken,
  validateToken,
  startDeviceFlow,
  pollDeviceToken,
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
} from '../services/twitchApiService';

/**
 * Get all saved tokens for the authenticated user
 */
export async function getAllTokens(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const tokens = await prisma.savedToken.findMany({
      where: { userId },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't send the actual access tokens to the frontend
    const sanitizedTokens = tokens.map((token) => ({
      id: token.id,
      tokenType: token.tokenType,
      scopes: token.scopes,
      channelLogin: token.channelLogin,
      channelId: token.channelId,
      name: token.name,
      expiresAt: token.expiresAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
      updatedAt: token.updatedAt.toISOString(),
      twitchConfig: token.twitchConfig,
    }));

    res.json({ tokens: sanitizedTokens });
  } catch (error) {
    console.error('Get all tokens error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve saved tokens',
    });
  }
}

/**
 * Get a single saved token by ID
 */
export async function getToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    const token = await prisma.savedToken.findUnique({
      where: { id },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
    });

    if (!token) {
      res.status(404).json({
        error: 'Not found',
        message: 'Token not found',
      });
      return;
    }

    // Ensure the token belongs to the authenticated user
    if (token.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this token',
      });
      return;
    }

    // Return the token WITH the decrypted access token (for copying)
    const responseToken = {
      id: token.id,
      tokenType: token.tokenType,
      accessToken: decrypt(token.accessToken),
      refreshToken: token.refreshToken ? decrypt(token.refreshToken) : undefined,
      scopes: token.scopes,
      channelLogin: token.channelLogin,
      channelId: token.channelId,
      name: token.name,
      expiresAt: token.expiresAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
      updatedAt: token.updatedAt.toISOString(),
      twitchConfig: token.twitchConfig,
    };

    res.json({ token: responseToken });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve token',
    });
  }
}

/**
 * Generate an App Access Token
 */
export async function generateAppToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { twitchConfigId, name } = req.body;

    // Get the Twitch config
    const twitchConfig = await prisma.twitchConfig.findUnique({
      where: { id: twitchConfigId },
    });

    if (!twitchConfig) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Ensure the config belongs to the authenticated user
    if (twitchConfig.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to use this configuration',
      });
      return;
    }

    // Decrypt the client secret
    const clientSecret = decrypt(twitchConfig.clientSecret);

    // Generate the app access token from Twitch
    const { accessToken, expiresIn } = await generateAppAccessToken(
      twitchConfig.clientId,
      clientSecret
    );

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and save the token
    const encryptedToken = encrypt(accessToken);

    const savedToken = await prisma.savedToken.create({
      data: {
        userId,
        twitchConfigId,
        tokenType: 'app',
        accessToken: encryptedToken,
        scopes: [], // App tokens have no scopes
        channelLogin: null,
        channelId: null,
        name: name || null,
        expiresAt,
      },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
    });

    // Return the token with decrypted access token
    const responseToken = {
      id: savedToken.id,
      tokenType: savedToken.tokenType,
      accessToken: accessToken, // Return unencrypted for immediate use
      scopes: savedToken.scopes,
      channelLogin: savedToken.channelLogin,
      channelId: savedToken.channelId,
      name: savedToken.name,
      expiresAt: savedToken.expiresAt?.toISOString() || null,
      createdAt: savedToken.createdAt.toISOString(),
      updatedAt: savedToken.updatedAt.toISOString(),
      twitchConfig: savedToken.twitchConfig,
    };

    res.status(201).json({
      message: 'App access token generated successfully',
      token: responseToken,
    });
  } catch (error: any) {
    console.error('Generate app token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to generate app access token',
    });
  }
}

/**
 * Delete a saved token
 */
export async function deleteToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if token exists and belongs to user
    const existingToken = await prisma.savedToken.findUnique({
      where: { id },
    });

    if (!existingToken) {
      res.status(404).json({
        error: 'Not found',
        message: 'Token not found',
      });
      return;
    }

    if (existingToken.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this token',
      });
      return;
    }

    // Delete the token
    await prisma.savedToken.delete({
      where: { id },
    });

    res.json({
      message: 'Token deleted successfully',
    });
  } catch (error) {
    console.error('Delete token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete token',
    });
  }
}

/**
 * Start User Access Token device flow
 */
export async function startUserToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { twitchConfigId, scopes } = req.body;

    // Get the Twitch config
    const twitchConfig = await prisma.twitchConfig.findUnique({
      where: { id: twitchConfigId },
    });

    if (!twitchConfig) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Ensure the config belongs to the authenticated user
    if (twitchConfig.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to use this configuration',
      });
      return;
    }

    // Start the device flow
    const deviceFlowData = await startDeviceFlow(twitchConfig.clientId, scopes);

    res.json({
      deviceCode: deviceFlowData.deviceCode,
      userCode: deviceFlowData.userCode,
      verificationUri: deviceFlowData.verificationUri,
      expiresIn: deviceFlowData.expiresIn,
      interval: deviceFlowData.interval,
    });
  } catch (error: any) {
    console.error('Start user token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to start user token flow',
    });
  }
}

/**
 * Poll for User Access Token (complete device flow)
 */
export async function pollUserToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { twitchConfigId, deviceCode, name } = req.body;

    // Get the Twitch config
    const twitchConfig = await prisma.twitchConfig.findUnique({
      where: { id: twitchConfigId },
    });

    if (!twitchConfig) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Ensure the config belongs to the authenticated user
    if (twitchConfig.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to use this configuration',
      });
      return;
    }

    // Poll for the token
    const tokenData = await pollDeviceToken(twitchConfig.clientId, deviceCode);

    // If still pending, return pending status
    if (!tokenData) {
      res.json({ status: 'pending' });
      return;
    }

    // Token received! Validate it to get user info
    const validation = await validateToken(tokenData.accessToken);

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    // Encrypt and save the tokens
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = encrypt(tokenData.refreshToken);

    const savedToken = await prisma.savedToken.create({
      data: {
        userId,
        twitchConfigId,
        tokenType: 'user',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        scopes: tokenData.scopes,
        channelLogin: validation.login,
        channelId: validation.userId,
        name: name || null,
        expiresAt,
      },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
    });

    // Return the token with decrypted access token
    const responseToken = {
      id: savedToken.id,
      tokenType: savedToken.tokenType,
      accessToken: tokenData.accessToken, // Return unencrypted for immediate use
      refreshToken: tokenData.refreshToken,
      scopes: savedToken.scopes,
      channelLogin: savedToken.channelLogin,
      channelId: savedToken.channelId,
      name: savedToken.name,
      expiresAt: savedToken.expiresAt?.toISOString() || null,
      createdAt: savedToken.createdAt.toISOString(),
      updatedAt: savedToken.updatedAt.toISOString(),
      twitchConfig: savedToken.twitchConfig,
    };

    res.status(201).json({
      status: 'success',
      message: 'User access token generated successfully',
      token: responseToken,
    });
  } catch (error: any) {
    console.error('Poll user token error:', error);

    // Handle specific device flow errors
    if (error.message === 'access_denied') {
      res.status(403).json({
        status: 'denied',
        error: 'Access denied',
        message: 'User denied the authorization request',
      });
      return;
    }

    if (error.message === 'expired_token') {
      res.status(400).json({
        status: 'expired',
        error: 'Token expired',
        message: 'The device code has expired. Please start over.',
      });
      return;
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to poll for user token',
    });
  }
}

/**
 * Start Authorization Code Flow - Generate authorization URL
 */
export async function startAuthorizationFlow(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { twitchConfigId, scopes, state } = req.body;

    // Verify the Twitch config belongs to the user
    const twitchConfig = await prisma.twitchConfig.findUnique({
      where: { id: twitchConfigId },
    });

    if (!twitchConfig || twitchConfig.userId !== userId) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Get redirect URI from environment
    const redirectUri = process.env.TWITCH_REDIRECT_URI || 'http://localhost:5173/oauth/callback';

    // Generate authorization URL
    const authUrl = generateAuthorizationUrl(
      twitchConfig.clientId,
      redirectUri,
      scopes,
      state
    );

    res.json({
      authorizationUrl: authUrl,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Start authorization flow error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to start authorization flow',
    });
  }
}

/**
 * Handle OAuth callback - Exchange code for token
 */
export async function handleAuthorizationCallback(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { twitchConfigId, code, name } = req.body;

    // Verify the Twitch config belongs to the user
    const twitchConfig = await prisma.twitchConfig.findUnique({
      where: { id: twitchConfigId },
    });

    if (!twitchConfig || twitchConfig.userId !== userId) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Decrypt client secret
    const clientSecret = decrypt(twitchConfig.clientSecret);
    const redirectUri = process.env.TWITCH_REDIRECT_URI || 'http://localhost:5173/oauth/callback';

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(
      twitchConfig.clientId,
      clientSecret,
      code,
      redirectUri
    );

    // Validate the token to get user info
    const validation = await validateToken(tokenData.accessToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = encrypt(tokenData.refreshToken);

    // Save token to database
    const savedToken = await prisma.savedToken.create({
      data: {
        userId,
        twitchConfigId,
        tokenType: 'user',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        scopes: tokenData.scopes,
        channelLogin: validation.login,
        channelId: validation.userId,
        name: name || null,
        expiresAt,
      },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
    });

    // Return the token
    const responseToken = {
      id: savedToken.id,
      tokenType: savedToken.tokenType,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      scopes: savedToken.scopes,
      channelLogin: savedToken.channelLogin,
      channelId: savedToken.channelId,
      name: savedToken.name,
      expiresAt: savedToken.expiresAt?.toISOString() || null,
      createdAt: savedToken.createdAt.toISOString(),
      updatedAt: savedToken.updatedAt.toISOString(),
      twitchConfig: savedToken.twitchConfig,
    };

    res.status(201).json({
      message: 'User access token generated successfully',
      token: responseToken,
    });
  } catch (error: any) {
    console.error('Handle authorization callback error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to complete authorization',
    });
  }
}

/**
 * Validate a saved token with Twitch API
 */
export async function validateSavedToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    // Get the token
    const token = await prisma.savedToken.findUnique({
      where: { id },
    });

    if (!token) {
      res.status(404).json({
        error: 'Not found',
        message: 'Token not found',
      });
      return;
    }

    // Ensure the token belongs to the authenticated user
    if (token.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this token',
      });
      return;
    }

    // Decrypt the access token
    const accessToken = decrypt(token.accessToken);

    // Validate with Twitch API
    const validation = await validateToken(accessToken);

    res.json({
      valid: true,
      clientId: validation.clientId,
      login: validation.login,
      userId: validation.userId,
      scopes: validation.scopes,
      expiresIn: validation.expiresIn,
    });
  } catch (error: any) {
    console.error('Validate token error:', error);

    // If validation failed, it means the token is invalid
    if (error.message === 'Invalid or expired token') {
      res.status(200).json({
        valid: false,
        message: 'Token is invalid or expired',
      });
      return;
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to validate token',
    });
  }
}

/**
 * Refresh an existing token using its refresh token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    // Get the token
    const token = await prisma.savedToken.findUnique({
      where: { id },
      include: {
        twitchConfig: true,
      },
    });

    if (!token) {
      res.status(404).json({
        error: 'Not found',
        message: 'Token not found',
      });
      return;
    }

    // Ensure the token belongs to the authenticated user
    if (token.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this token',
      });
      return;
    }

    // Only user tokens have refresh tokens
    if (token.tokenType !== 'user' || !token.refreshToken) {
      res.status(400).json({
        error: 'Bad request',
        message: 'This token cannot be refreshed',
      });
      return;
    }

    // Decrypt refresh token and client secret
    const refreshTokenValue = decrypt(token.refreshToken);
    const clientSecret = decrypt(token.twitchConfig.clientSecret);

    // Refresh the token
    const newTokenData = await refreshAccessToken(
      token.twitchConfig.clientId,
      clientSecret,
      refreshTokenValue
    );

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + newTokenData.expiresIn);

    // Encrypt new tokens
    const encryptedAccessToken = encrypt(newTokenData.accessToken);
    const encryptedRefreshToken = encrypt(newTokenData.refreshToken);

    // Update token in database
    const updatedToken = await prisma.savedToken.update({
      where: { id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        scopes: newTokenData.scopes,
        expiresAt,
      },
      include: {
        twitchConfig: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
      },
    });

    // Return updated token
    const responseToken = {
      id: updatedToken.id,
      tokenType: updatedToken.tokenType,
      accessToken: newTokenData.accessToken,
      refreshToken: newTokenData.refreshToken,
      scopes: updatedToken.scopes,
      channelLogin: updatedToken.channelLogin,
      channelId: updatedToken.channelId,
      name: updatedToken.name,
      expiresAt: updatedToken.expiresAt?.toISOString() || null,
      createdAt: updatedToken.createdAt.toISOString(),
      updatedAt: updatedToken.updatedAt.toISOString(),
      twitchConfig: updatedToken.twitchConfig,
    };

    res.json({
      message: 'Token refreshed successfully',
      token: responseToken,
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to refresh token',
    });
  }
}
