import api from './api';
import type {
  ApiLog,
  CreateApiLogRequest,
  ApiLogsResponse,
  ApiLogResponse,
} from '../types/index';

/**
 * API Log Service
 * Handles all API calls related to API logs
 */
const apiLogService = {
  /**
   * Create a new API log
   */
  async createLog(data: CreateApiLogRequest): Promise<ApiLog> {
    const response = await api.post<ApiLogResponse>('/logs', data);
    return response.data.log;
  },

  /**
   * Get all API logs for the authenticated user
   */
  async getAllLogs(limit: number = 50, offset: number = 0): Promise<ApiLogsResponse> {
    const response = await api.get<ApiLogsResponse>('/logs', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get a single API log by ID
   */
  async getLog(id: string): Promise<ApiLog> {
    const response = await api.get<ApiLogResponse>(`/logs/${id}`);
    return response.data.log;
  },

  /**
   * Delete a single API log
   */
  async deleteLog(id: string): Promise<void> {
    await api.delete(`/logs/${id}`);
  },

  /**
   * Delete all API logs for the authenticated user
   */
  async deleteAllLogs(): Promise<{ count: number }> {
    const response = await api.delete<{ count: number }>('/logs');
    return response.data;
  },
};

export default apiLogService;
