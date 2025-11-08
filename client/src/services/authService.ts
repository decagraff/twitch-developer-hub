import api from './api';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/index';

/**
 * Auth Service
 * Handles all authentication-related API calls
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout user (client-side only)
   */
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

export default authService;
