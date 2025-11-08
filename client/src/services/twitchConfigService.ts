import api from './api';
import type {
  TwitchConfig,
  CreateTwitchConfigRequest,
  UpdateTwitchConfigRequest,
  TwitchConfigsResponse,
  TwitchConfigResponse,
} from '../types/index';

/**
 * Twitch Config Service
 * Handles all API calls related to Twitch configurations
 */
const twitchConfigService = {
  /**
   * Get all Twitch configs for the authenticated user
   */
  async getAllConfigs(): Promise<TwitchConfig[]> {
    const response = await api.get<TwitchConfigsResponse>('/twitch-configs');
    return response.data.configs;
  },

  /**
   * Get a single Twitch config by ID
   */
  async getConfig(id: string): Promise<TwitchConfig> {
    const response = await api.get<TwitchConfigResponse>(`/twitch-configs/${id}`);
    return response.data.config;
  },

  /**
   * Create a new Twitch config
   */
  async createConfig(data: CreateTwitchConfigRequest): Promise<TwitchConfig> {
    const response = await api.post<TwitchConfigResponse>('/twitch-configs', data);
    return response.data.config;
  },

  /**
   * Update a Twitch config
   */
  async updateConfig(
    id: string,
    data: UpdateTwitchConfigRequest
  ): Promise<TwitchConfig> {
    const response = await api.put<TwitchConfigResponse>(
      `/twitch-configs/${id}`,
      data
    );
    return response.data.config;
  },

  /**
   * Delete a Twitch config
   */
  async deleteConfig(id: string): Promise<void> {
    await api.delete(`/twitch-configs/${id}`);
  },

  /**
   * Validate a Twitch config with Twitch API
   */
  async validateConfig(clientId: string, clientSecret: string): Promise<{ valid: boolean; message: string; expiresIn?: number }> {
    const response = await api.post<{ valid: boolean; message: string; expiresIn?: number }>('/twitch-configs/validate', {
      clientId,
      clientSecret,
    });
    return response.data;
  },
};

export default twitchConfigService;
