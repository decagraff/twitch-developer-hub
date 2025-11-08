import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * Get all Twitch configs for the authenticated user
 */
export async function getAllConfigs(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const configs = await prisma.twitchConfig.findMany({
      where: { userId },
      include: {
        _count: {
          select: { savedTokens: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt client secrets before sending
    const decryptedConfigs = configs.map((config) => ({
      id: config.id,
      clientId: config.clientId,
      clientSecret: decrypt(config.clientSecret),
      name: config.name,
      tokensCount: config._count.savedTokens,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    }));

    res.json({ configs: decryptedConfigs });
  } catch (error) {
    console.error('Get all configs error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve Twitch configurations',
    });
  }
}

/**
 * Get a single Twitch config by ID
 */
export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    const config = await prisma.twitchConfig.findUnique({
      where: { id },
    });

    if (!config) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    // Ensure the config belongs to the authenticated user
    if (config.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this configuration',
      });
      return;
    }

    // Decrypt client secret before sending
    const decryptedConfig = {
      id: config.id,
      clientId: config.clientId,
      clientSecret: decrypt(config.clientSecret),
      name: config.name,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };

    res.json({ config: decryptedConfig });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve Twitch configuration',
    });
  }
}

/**
 * Create a new Twitch config
 */
export async function createConfig(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { clientId, clientSecret, name } = req.body;

    // Check if a config with this clientId already exists for this user
    const existingConfig = await prisma.twitchConfig.findUnique({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
    });

    if (existingConfig) {
      res.status(409).json({
        error: 'Conflict',
        message: 'A configuration with this Client ID already exists',
      });
      return;
    }

    // Encrypt the client secret before storing
    const encryptedSecret = encrypt(clientSecret);

    const config = await prisma.twitchConfig.create({
      data: {
        userId,
        clientId,
        clientSecret: encryptedSecret,
        name: name || null,
      },
    });

    // Return the config with decrypted secret
    const responseConfig = {
      id: config.id,
      clientId: config.clientId,
      clientSecret: decrypt(config.clientSecret),
      name: config.name,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };

    res.status(201).json({
      message: 'Twitch configuration created successfully',
      config: responseConfig,
    });
  } catch (error) {
    console.error('Create config error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create Twitch configuration',
    });
  }
}

/**
 * Update a Twitch config
 */
export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;
    const { clientId, clientSecret, name } = req.body;

    // Check if config exists and belongs to user
    const existingConfig = await prisma.twitchConfig.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    if (existingConfig.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this configuration',
      });
      return;
    }

    // If updating clientId, check for conflicts
    if (clientId && clientId !== existingConfig.clientId) {
      const conflictConfig = await prisma.twitchConfig.findUnique({
        where: {
          userId_clientId: {
            userId,
            clientId,
          },
        },
      });

      if (conflictConfig) {
        res.status(409).json({
          error: 'Conflict',
          message: 'A configuration with this Client ID already exists',
        });
        return;
      }
    }

    // Build update data
    const updateData: {
      clientId?: string;
      clientSecret?: string;
      name?: string | null;
    } = {};

    if (clientId !== undefined) {
      updateData.clientId = clientId;
    }

    if (clientSecret !== undefined) {
      updateData.clientSecret = encrypt(clientSecret);
    }

    if (name !== undefined) {
      updateData.name = name || null;
    }

    // Update the config
    const updatedConfig = await prisma.twitchConfig.update({
      where: { id },
      data: updateData,
    });

    // Return with decrypted secret
    const responseConfig = {
      id: updatedConfig.id,
      clientId: updatedConfig.clientId,
      clientSecret: decrypt(updatedConfig.clientSecret),
      name: updatedConfig.name,
      createdAt: updatedConfig.createdAt.toISOString(),
      updatedAt: updatedConfig.updatedAt.toISOString(),
    };

    res.json({
      message: 'Twitch configuration updated successfully',
      config: responseConfig,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update Twitch configuration',
    });
  }
}

/**
 * Delete a Twitch config
 */
export async function deleteConfig(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if config exists and belongs to user
    const existingConfig = await prisma.twitchConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { savedTokens: true },
        },
      },
    });

    if (!existingConfig) {
      res.status(404).json({
        error: 'Not found',
        message: 'Twitch configuration not found',
      });
      return;
    }

    if (existingConfig.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this configuration',
      });
      return;
    }

    // Check if there are tokens using this config
    if (existingConfig._count.savedTokens > 0) {
      res.status(400).json({
        error: 'Bad request',
        message: `Cannot delete configuration. There are ${existingConfig._count.savedTokens} token(s) using this configuration. Please delete the tokens first.`,
        tokensCount: existingConfig._count.savedTokens,
      });
      return;
    }

    // Delete the config
    await prisma.twitchConfig.delete({
      where: { id },
    });

    res.json({
      message: 'Twitch configuration deleted successfully',
    });
  } catch (error) {
    console.error('Delete config error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete Twitch configuration',
    });
  }
}

/**
 * Validate a Twitch config with Twitch API
 */
export async function validateConfig(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { clientId, clientSecret } = req.body;

    // Try to generate an app access token to validate the credentials
    const { generateAppAccessToken } = await import('../services/twitchApiService');

    try {
      const result = await generateAppAccessToken(clientId, clientSecret);

      res.json({
        valid: true,
        message: 'Client ID and Secret are valid',
        expiresIn: result.expiresIn,
      });
    } catch (error: any) {
      res.status(200).json({
        valid: false,
        message: 'Invalid Client ID or Client Secret',
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error('Validate config error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to validate configuration',
    });
  }
}
