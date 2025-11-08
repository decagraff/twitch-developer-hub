import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { TwitchConfigs } from './pages/TwitchConfigs';
import { Tokens } from './pages/Tokens';
import { ApiTester } from './pages/ApiTester';
import { Webhooks } from './pages/Webhooks';

// Components
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  const { initializeAuth } = useAuthStore();

  // Initialize auth on app load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1F1F23',
            color: '#fff',
            border: '1px solid #53535F',
          },
          success: {
            iconTheme: {
              primary: '#9146FF',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/twitch-configs" element={<TwitchConfigs />} />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/api-tester" element={<ApiTester />} />
          <Route path="/webhooks" element={<Webhooks />} />
        </Route>

        {/* Redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
