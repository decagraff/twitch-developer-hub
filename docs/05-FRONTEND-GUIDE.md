# ⚛️ Frontend Guide

Guide to the React frontend architecture, components, and state management.

---

## Project Structure

```
client/src/
├── components/          # Reusable components
│   ├── common/         # Buttons, Inputs, Cards
│   ├── layout/         # Header, Sidebar, Footer
│   └── features/       # Feature-specific components
├── pages/              # Route pages
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── TokenManager.tsx
│   ├── WebhookManager.tsx
│   └── Settings.tsx
├── store/              # Zustand stores
│   ├── authStore.ts
│   ├── tokenStore.ts
│   └── webhookStore.ts
├── services/           # API calls
│   ├── api.ts
│   ├── authService.ts
│   ├── tokenService.ts
│   └── webhookService.ts
├── utils/              # Utilities
│   ├── validation.ts
│   └── formatting.ts
├── types/              # TypeScript types
│   └── index.ts
├── App.tsx             # Main component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

---

## Routing

Using React Router 7:

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tokens" element={<TokenManager />} />
          <Route path="/webhooks" element={<WebhookManager />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## State Management (Zustand)

### Auth Store

```typescript
// store/authStore.ts
import create from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email, password) => {
    const { user, accessToken } = await authService.login(email, password);
    localStorage.setItem('token', accessToken);
    set({ user, token: accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user })
}));
```

### Usage in Components

```tsx
function Dashboard() {
  const { user, logout } = useAuthStore();

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## API Service Layer

### API Configuration

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth Service

```typescript
// services/authService.ts
import api from './api';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string, name: string) {
    const { data } = await api.post('/auth/register', { email, password, name });
    return data;
  },

  async getCurrentUser() {
    const { data } = await api.get('/users/me');
    return data;
  }
};
```

---

## Components

### Button Component

```tsx
// components/common/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant = 'primary',
  children,
  onClick,
  disabled
}: ButtonProps) {
  const baseClass = 'font-semibold py-2 px-4 rounded-lg transition-colors duration-200';
  const variantClass = variant === 'primary'
    ? 'bg-twitch-purple hover:bg-twitch-purple-dark text-white'
    : 'bg-twitch-gray-dark hover:bg-twitch-gray text-white';

  return (
    <button
      className={`${baseClass} ${variantClass} disabled:opacity-50`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Input Component

```tsx
// components/common/Input.tsx
interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  error
}: InputProps) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-field w-full ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
```

---

## Tailwind CSS Utilities

Custom classes defined in `index.css`:

```css
.btn-primary {
  @apply bg-twitch-purple hover:bg-twitch-purple-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200;
}

.input-field {
  @apply bg-twitch-dark-light border border-twitch-gray-dark rounded-lg px-4 py-2 text-white placeholder-twitch-gray-light focus:outline-none focus:border-twitch-purple transition-colors duration-200;
}

.card {
  @apply bg-twitch-dark-light rounded-lg p-6 border border-twitch-gray-dark;
}
```

---

## Forms

Using React Hook Form (recommended):

```tsx
import { useForm } from 'react-hook-form';

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    await authService.login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email', { required: 'Email is required' })}
        className="input-field"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        type="password"
        {...register('password', { required: 'Password is required' })}
        className="input-field"
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" className="btn-primary">Login</button>
    </form>
  );
}
```

---

## Notifications

Using React Hot Toast:

```tsx
import toast from 'react-hot-toast';

// Success
toast.success('Token generated successfully!');

// Error
toast.error('Failed to generate token');

// Loading
const toastId = toast.loading('Generating token...');
// ... async operation
toast.success('Done!', { id: toastId });
```

---

## Environment Variables

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const appName = import.meta.env.VITE_APP_NAME;
```

---

**[⬆ Back to Main README](../README.md)** | **[Next: Deployment Guide →](06-DEPLOYMENT.md)**
