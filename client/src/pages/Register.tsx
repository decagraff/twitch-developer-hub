import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.email) {
      newErrors.email = t('errors.requiredField');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('errors.requiredField');
    } else if (formData.password.length < 6) {
      newErrors.password = t('errors.passwordTooShort');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.requiredField');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
      });
      toast.success(t('auth.welcome'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(error || t('errors.somethingWentWrong'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (errors[e.target.name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [e.target.name]: undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-twitch-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">{t('auth.createAccount')}</h1>
          <p className="text-gray-400">{t('auth.register')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('auth.name')}
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
            />

            <Input
              label={t('auth.email')}
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label={t('auth.password')}
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {error && (
              <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {t('auth.createAccount')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                className="text-twitch-purple hover:text-twitch-purple-light font-medium"
              >
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← {t('common.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};
