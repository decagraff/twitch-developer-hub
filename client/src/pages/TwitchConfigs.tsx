import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useAuthStore } from '../store/authStore';
import twitchConfigService from '../services/twitchConfigService';
import type { TwitchConfig, CreateTwitchConfigRequest } from '../types/index';

export const TwitchConfigs: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [configs, setConfigs] = useState<TwitchConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TwitchConfig | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await twitchConfigService.getAllConfigs();
      setConfigs(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (config?: TwitchConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        name: config.name || '',
      });
    } else {
      setEditingConfig(null);
      setFormData({
        clientId: '',
        clientSecret: '',
        name: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConfig(null);
    setFormData({
      clientId: '',
      clientSecret: '',
      name: '',
    });
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      toast.error(t('configurations.requiredFields'));
      return;
    }

    try {
      setIsValidating(true);
      const result = await twitchConfigService.validateConfig(
        formData.clientId.trim(),
        formData.clientSecret.trim()
      );
      setValidationResult(result);

      if (result.valid) {
        toast.success(t('configurations.credentialsValid') + ' ✓');
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
      setValidationResult({ valid: false, message });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.clientSecret) {
      toast.error(t('configurations.requiredFields'));
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateTwitchConfigRequest = {
        clientId: formData.clientId.trim(),
        clientSecret: formData.clientSecret.trim(),
        name: formData.name.trim() || undefined,
      };

      if (editingConfig) {
        // Update existing config
        await twitchConfigService.updateConfig(editingConfig.id, requestData);
        toast.success(t('configurations.configUpdated'));
      } else {
        // Create new config
        await twitchConfigService.createConfig(requestData);
        toast.success(t('configurations.configCreated'));
      }

      handleCloseModal();
      loadConfigs();
    } catch (error: any) {
      const message =
        error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (config: TwitchConfig) => {
    const tokenCount = config.tokensCount || 0;
    let confirmMessage = t('configurations.deleteConfirmation', { name: config.name || config.clientId });

    if (tokenCount > 0) {
      confirmMessage += '\n\n' + t('configurations.deleteWarning', { count: tokenCount });
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await twitchConfigService.deleteConfig(config.id);
      toast.success(t('configurations.configDeleted'));
      loadConfigs();
    } catch (error: any) {
      const message =
        error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message, { duration: 5000 });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  return (
    <div className="min-h-screen bg-twitch-dark">
      {/* Header */}
      <header className="bg-twitch-dark-light border-b border-twitch-gray-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.dashboard')}
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => navigate('/tokens')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.tokens')}
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => navigate('/api-tester')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.apiTester')}
              </button>
              <span className="text-gray-600">|</span>
              <LanguageSelector />
              <span className="text-gray-600">|</span>
              <span className="text-gray-300">
                {user?.name || user?.email}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('configurations.title')}
            </h1>
            <p className="text-white/60">
              {t('configurations.subtitle')}
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <span className="text-xl mr-2">+</span>
            {t('configurations.addConfiguration')}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : configs.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {t('configurations.noConfigurations')}
            </h2>
            <p className="text-white/60 mb-6">
              {t('configurations.noConfigurationsText')}
            </p>
            <Button onClick={() => handleOpenModal()}>{t('configurations.addConfiguration')}</Button>
          </Card>
        ) : (
          /* Configs List */
          <div className="grid gap-4">
            {configs.map((config) => (
              <Card key={config.id} className="hover:border-twitch-purple/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">
                        {config.name || 'Unnamed Configuration'}
                      </h3>
                      <span className="px-2 py-1 bg-twitch-purple/20 text-twitch-purple text-xs rounded-full">
                        {t('configurations.active')}
                      </span>
                      {config.tokensCount !== undefined && config.tokensCount > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {t('configurations.tokens', { count: config.tokensCount })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">{t('configurations.clientId')}:</span>
                        <code className="text-white bg-twitch-dark-light px-2 py-1 rounded">
                          {config.clientId}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">{t('configurations.clientSecret')}:</span>
                        <code className="text-white/40 bg-twitch-dark-light px-2 py-1 rounded">
                          {maskSecret(config.clientSecret)}
                        </code>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40 mt-3">
                        <span>{t('configurations.created')}: {formatDate(config.createdAt)}</span>
                        <span>{t('configurations.updated')}: {formatDate(config.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleOpenModal(config)}
                      className="px-4 py-2 bg-twitch-dark-light hover:bg-white/10 text-white rounded-lg transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(config)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingConfig ? t('configurations.editConfiguration') : t('configurations.addConfiguration')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('configurations.name')}
                </label>
                <Input
                  type="text"
                  placeholder={t('configurations.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('configurations.clientId')} *
                </label>
                <Input
                  type="text"
                  placeholder={t('configurations.clientIdPlaceholder')}
                  value={formData.clientId}
                  onChange={(e) => {
                    setFormData({ ...formData, clientId: e.target.value });
                    setValidationResult(null); // Reset validation when changing input
                  }}
                  required
                />
                <p className="text-xs text-white/40 mt-1">
                  {t('configurations.clientIdHint')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('configurations.clientSecret')} *
                </label>
                <Input
                  type="password"
                  placeholder={t('configurations.clientSecretPlaceholder')}
                  value={formData.clientSecret}
                  onChange={(e) => {
                    setFormData({ ...formData, clientSecret: e.target.value });
                    setValidationResult(null); // Reset validation when changing input
                  }}
                  required
                />
                <p className="text-xs text-white/40 mt-1">
                  {t('configurations.clientSecretHint')}
                </p>
              </div>

              {/* Validation Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !formData.clientId || !formData.clientSecret}
                  className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isValidating ? t('configurations.validating') : t('configurations.validateCredentials')}
                </button>
              </div>

              {/* Validation Result */}
              {validationResult && (
                <div
                  className={`p-3 rounded-lg ${
                    validationResult.valid
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {validationResult.valid ? '✓' : '✗'}
                    </span>
                    <span
                      className={
                        validationResult.valid ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {validationResult.message}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting
                    ? t('common.loading')
                    : editingConfig
                    ? t('configurations.editConfiguration')
                    : t('configurations.createConfiguration')}
                </Button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
