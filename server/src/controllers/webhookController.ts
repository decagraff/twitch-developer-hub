import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import axios from 'axios';

const TWITCH_EVENTSUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';

/**
 * Get all EventSub subscriptions for the authenticated user
 */
export async function getAllWebhooks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ webhooks });
  } catch (error: any) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve webhooks',
    });
  }
}

/**
 * Create a new EventSub subscription
 */
export async function createWebhook(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { tokenId, type, condition, callbackUrl } = req.body;

    // Get the token to use for authentication
    const token = await prisma.savedToken.findUnique({
      where: { id: tokenId },
      include: { twitchConfig: true },
    });

    if (!token) {
      res.status(404).json({
        error: 'Not found',
        message: 'Token not found',
      });
      return;
    }

    if (token.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to use this token',
      });
      return;
    }

    // Decrypt token
    const { decrypt } = await import('../utils/encryption');
    const accessToken = decrypt(token.accessToken);

    // Create EventSub subscription with Twitch
    const subscriptionData = {
      type,
      version: '1',
      condition,
      transport: {
        method: 'webhook',
        callback: callbackUrl,
        secret: generateSecret(), // Generate a random secret
      },
    };

    const response = await axios.post(TWITCH_EVENTSUB_URL, subscriptionData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
        'Content-Type': 'application/json',
      },
    });

    const subscription = response.data.data[0];

    // Save to database
    const webhook = await prisma.webhook.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        type: subscription.type,
        condition: subscription.condition,
        callbackUrl,
        status: subscription.status,
        cost: subscription.cost || 0,
      },
    });

    res.status(201).json({
      message: 'EventSub subscription created successfully',
      webhook,
    });
  } catch (error: any) {
    console.error('Create webhook error:', error);

    if (error.response?.data) {
      res.status(error.response.status || 500).json({
        error: 'Twitch API error',
        message: error.response.data.message || 'Failed to create EventSub subscription',
        details: error.response.data,
      });
      return;
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create webhook',
    });
  }
}

/**
 * Delete an EventSub subscription
 */
export async function deleteWebhook(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      res.status(404).json({
        error: 'Not found',
        message: 'Webhook not found',
      });
      return;
    }

    if (webhook.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this webhook',
      });
      return;
    }

    // We need a token to call Twitch API to delete the subscription
    // Get any user token from this user
    const token = await prisma.savedToken.findFirst({
      where: { userId, tokenType: 'user' },
      include: { twitchConfig: true },
    });

    if (token) {
      try {
        const { decrypt } = await import('../utils/encryption');
        const accessToken = decrypt(token.accessToken);

        // Delete from Twitch EventSub
        await axios.delete(`${TWITCH_EVENTSUB_URL}?id=${webhook.subscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': token.twitchConfig.clientId,
          },
        });
      } catch (error: any) {
        console.error('Failed to delete from Twitch:', error.response?.data || error.message);
        // Continue anyway to delete from our database
      }
    }

    // Delete from database
    await prisma.webhook.delete({
      where: { id },
    });

    res.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete webhook',
    });
  }
}

/**
 * Get all available EventSub subscription types
 */
export async function getEventSubTypes(req: Request, res: Response): Promise<void> {
  // Return common EventSub types
  const types = [
    {
      type: 'stream.online',
      version: '1',
      description: 'A broadcaster starts a stream',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'stream.offline',
      version: '1',
      description: 'A broadcaster stops a stream',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.update',
      version: '2',
      description: 'A broadcaster updates their channel properties',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.follow',
      version: '2',
      description: 'A user follows a broadcaster',
      condition: { broadcaster_user_id: 'required', moderator_user_id: 'required' },
    },
    {
      type: 'channel.subscribe',
      version: '1',
      description: 'A user subscribes to a broadcaster',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.subscription.gift',
      version: '1',
      description: 'A user gifts subscriptions',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.cheer',
      version: '1',
      description: 'A user cheers bits',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.raid',
      version: '1',
      description: 'A broadcaster raids another broadcaster',
      condition: { to_broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.ban',
      version: '1',
      description: 'A user is banned from a broadcaster\'s chat',
      condition: { broadcaster_user_id: 'required' },
    },
    {
      type: 'channel.moderator.add',
      version: '1',
      description: 'A user is added as a moderator',
      condition: { broadcaster_user_id: 'required' },
    },
  ];

  res.json({ types });
}

/**
 * Get EventSub subscriptions from Twitch API (remote)
 */
export async function getRemoteWebhooks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Get an app token to call Twitch API (app tokens are required for EventSub list)
    const token = await prisma.savedToken.findFirst({
      where: { userId, tokenType: 'app' },
      include: { twitchConfig: true },
    });

    if (!token) {
      res.status(404).json({
        error: 'Not found',
        message: 'No app token found. Create an app token first to fetch remote subscriptions.',
      });
      return;
    }

    const { decrypt } = await import('../utils/encryption');
    const accessToken = decrypt(token.accessToken);

    // Fetch subscriptions from Twitch
    const response = await axios.get(TWITCH_EVENTSUB_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    res.json({
      subscriptions: response.data.data,
      total: response.data.total,
      max_total_cost: response.data.max_total_cost,
      total_cost: response.data.total_cost,
    });
  } catch (error: any) {
    console.error('Get remote webhooks error:', error);

    if (error.response?.data) {
      res.status(error.response.status || 500).json({
        error: 'Twitch API error',
        message: error.response.data.message || 'Failed to fetch remote subscriptions',
        details: error.response.data,
      });
      return;
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve remote webhooks',
    });
  }
}

/**
 * Sync EventSub subscriptions from Twitch to local database
 */
export async function syncWebhooks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { configId } = req.body; // Optional: specific config to sync

    // Get app tokens to use
    const tokens = await prisma.savedToken.findMany({
      where: {
        userId,
        tokenType: 'app',
        ...(configId && { twitchConfigId: configId }),
      },
      include: { twitchConfig: true },
    });

    if (tokens.length === 0) {
      res.status(404).json({
        error: 'Not found',
        message: configId
          ? 'No app token found for this configuration.'
          : 'No app tokens found. Create an app token first to sync subscriptions.',
      });
      return;
    }

    const { decrypt } = await import('../utils/encryption');

    let totalImported = 0;
    let totalUpdated = 0;
    let totalRemoved = 0;
    let totalSubscriptions = 0;
    const configsSynced: string[] = [];

    // Sync each app token's subscriptions
    for (const token of tokens) {
      try {
        const accessToken = decrypt(token.accessToken);

        // Fetch subscriptions from Twitch for this config
        const response = await axios.get(TWITCH_EVENTSUB_URL, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': token.twitchConfig.clientId,
          },
        });

        const remoteSubscriptions = response.data.data;
        totalSubscriptions += remoteSubscriptions.length;
        configsSynced.push(token.twitchConfig.name || token.twitchConfig.clientId);

        // Get existing local webhooks for this user
        const localWebhooks = await prisma.webhook.findMany({
          where: { userId },
        });

        const localSubscriptionIds = new Set(localWebhooks.map(w => w.subscriptionId));

        // Import subscriptions that don't exist locally
        for (const sub of remoteSubscriptions) {
          if (!localSubscriptionIds.has(sub.id)) {
            // Create new webhook in database
            await prisma.webhook.create({
              data: {
                userId,
                subscriptionId: sub.id,
                type: sub.type,
                condition: sub.condition,
                callbackUrl: sub.transport.callback,
                status: sub.status,
                cost: sub.cost || 0,
              },
            });
            totalImported++;
          } else {
            // Update existing webhook status and condition
            await prisma.webhook.updateMany({
              where: {
                userId,
                subscriptionId: sub.id,
              },
              data: {
                status: sub.status,
                condition: sub.condition,
                cost: sub.cost || 0,
              },
            });
            totalUpdated++;
          }
        }

        // Find and remove webhooks that no longer exist on Twitch
        const remoteSubscriptionIds = new Set(remoteSubscriptions.map((s: any) => s.id));

        for (const localWebhook of localWebhooks) {
          if (!remoteSubscriptionIds.has(localWebhook.subscriptionId)) {
            await prisma.webhook.delete({
              where: { id: localWebhook.id },
            });
            totalRemoved++;
          }
        }
      } catch (error: any) {
        console.error(`Failed to sync config ${token.twitchConfig.name}:`, error);
        // Continue with other configs even if one fails
      }
    }

    res.json({
      message: 'Webhooks synchronized successfully',
      imported: totalImported,
      updated: totalUpdated,
      removed: totalRemoved,
      total: totalSubscriptions,
      configsSynced: configsSynced.join(', '),
    });
  } catch (error: any) {
    console.error('Sync webhooks error:', error);

    if (error.response?.data) {
      res.status(error.response.status || 500).json({
        error: 'Twitch API error',
        message: error.response.data.message || 'Failed to sync subscriptions',
        details: error.response.data,
      });
      return;
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to sync webhooks',
    });
  }
}

/**
 * Generate a random secret for EventSub webhook verification
 */
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
