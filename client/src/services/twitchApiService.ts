import type { SavedToken } from '../types/index';

/**
 * Twitch API Service
 * Makes direct calls to Twitch API using saved tokens
 */

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface TwitchFollower {
  total: number;
}

const twitchApiService = {
  /**
   * Get user information
   */
  async getUsers(token: SavedToken, logins?: string[]): Promise<TwitchUser[]> {
    const params = new URLSearchParams();
    if (logins && logins.length > 0) {
      logins.forEach(login => params.append('login', login));
    }

    const url = `https://api.twitch.tv/helix/users${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  },

  /**
   * Get channel information
   */
  async getChannelInfo(token: SavedToken, broadcasterId: string): Promise<any> {
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  },

  /**
   * Get stream information (to check if online)
   */
  async getStreams(token: SavedToken, userIds?: string[]): Promise<TwitchStream[]> {
    const params = new URLSearchParams();
    if (userIds && userIds.length > 0) {
      userIds.forEach(id => params.append('user_id', id));
    }

    const url = `https://api.twitch.tv/helix/streams${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  },

  /**
   * Get follower count
   */
  async getFollowerCount(token: SavedToken, broadcasterId: string): Promise<number> {
    const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    if (!response.ok) {
      // If not authorized (missing scope), return 0
      if (response.status === 403 || response.status === 401) {
        return 0;
      }
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = await response.json();
    return data.total || 0;
  },

  /**
   * Get subscriber count
   */
  async getSubscriberCount(token: SavedToken, broadcasterId: string): Promise<number> {
    const url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Client-Id': token.twitchConfig.clientId,
      },
    });

    if (!response.ok) {
      // If not authorized (missing scope), return 0
      if (response.status === 403 || response.status === 401) {
        return 0;
      }
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = await response.json();
    return data.total || 0;
  },
};

export default twitchApiService;
