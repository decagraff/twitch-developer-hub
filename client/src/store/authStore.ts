import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest } from '../types/index';
import authService from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  /**
   * Login user
   */
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);

      // Save tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to login';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  /**
   * Register user
   */
  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);

      // Save tokens to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to register';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Initialize auth from localStorage
   */
  initializeAuth: async () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          isAuthenticated: true,
        });

        // Verify token is still valid by fetching current user
        const currentUser = await authService.getCurrentUser();
        set({ user: currentUser, isInitialized: true });
      } catch (error) {
        // Token is invalid, clear everything
        authService.logout();
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    } else {
      // No token found, mark as initialized
      set({ isInitialized: true });
    }
  },
}));
