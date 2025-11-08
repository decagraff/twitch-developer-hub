import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Show loading state while checking authentication
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-twitch-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/60">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
};
