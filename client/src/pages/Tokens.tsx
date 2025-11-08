import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useAuthStore } from '../store/authStore';
import tokenService from '../services/tokenService';
import twitchConfigService from '../services/twitchConfigService';
import type {
  SavedToken,
  TwitchConfig,
  GenerateAppTokenRequest,
  StartUserTokenRequest,
  DeviceFlowResponse,
} from '../types/index';

export const Tokens: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [tokens, setTokens] = useState<SavedToken[]>([]);
  const [configs, setConfigs] = useState<TwitchConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUserTokenModal, setShowUserTokenModal] = useState(false);
  const [showDeviceFlowModal, setShowDeviceFlowModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<SavedToken | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [deviceFlowData, setDeviceFlowData] = useState<DeviceFlowResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const [formData, setFormData] = useState({
    twitchConfigId: '',
    name: '',
  });
  const [userTokenFormData, setUserTokenFormData] = useState({
    twitchConfigId: '',
    name: '',
    scopes: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Analytics', 'Channel', 'Moderator', 'User', 'Chat']);
  const [expandedTokens, setExpandedTokens] = useState<string[]>([]); // Para controlar qué tokens muestran detalles

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Load tokens and configs on mount
  useEffect(() => {
    loadTokens();
    loadConfigs();
  }, []);

  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const data = await tokenService.getAllTokens();
      setTokens(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const data = await twitchConfigService.getAllConfigs();
      setConfigs(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    }
  };

  const handleOpenGenerateModal = () => {
    if (configs.length === 0) {
      toast.error(t('configurations.noConfigurations'));
      navigate('/twitch-configs');
      return;
    }
    setFormData({
      twitchConfigId: configs[0]?.id || '',
      name: '',
    });
    setShowGenerateModal(true);
  };

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
    setFormData({
      twitchConfigId: '',
      name: '',
    });
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.twitchConfigId) {
      toast.error(t('configurations.noConfigurations'));
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: GenerateAppTokenRequest = {
        twitchConfigId: formData.twitchConfigId,
        name: formData.name.trim() || undefined,
      };

      const newToken = await tokenService.generateAppToken(requestData);
      toast.success(t('tokens.tokenGenerated'));
      handleCloseGenerateModal();
      loadTokens();

      // Show the token in a modal
      setSelectedToken(newToken);
      setShowTokenModal(true);
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewToken = async (token: SavedToken) => {
    try {
      // Fetch the full token with decrypted access token
      const fullToken = await tokenService.getToken(token.id);
      setSelectedToken(fullToken);
      setShowTokenModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    }
  };

  const handleCopyToken = () => {
    if (selectedToken?.accessToken) {
      navigator.clipboard.writeText(selectedToken.accessToken);
      toast.success(t('tokens.copy') + '!');
    }
  };

  const handleCopyRefreshToken = () => {
    if (selectedToken?.refreshToken) {
      navigator.clipboard.writeText(selectedToken.refreshToken);
      toast.success(t('tokens.copy') + '!');
    }
  };

  const toggleTokenExpansion = (tokenId: string) => {
    setExpandedTokens((prev) =>
      prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const handleDelete = async (token: SavedToken) => {
    if (
      !window.confirm(
        t('tokens.deleteConfirmation')
      )
    ) {
      return;
    }

    try {
      await tokenService.deleteToken(token.id);
      toast.success(t('tokens.tokenDeleted'));
      loadTokens();
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    }
  };

  const handleRefreshToken = async (token: SavedToken) => {
    if (token.tokenType !== 'user') {
      toast.error(t('tokens.noRefresh'));
      return;
    }

    try {
      const refreshedToken = await tokenService.refreshToken(token.id);
      toast.success(t('tokens.tokenRefreshed'));
      loadTokens();

      // Show the refreshed token
      setSelectedToken(refreshedToken);
      setShowTokenModal(true);
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    }
  };

  const handleValidateToken = async (token: SavedToken) => {
    try {
      const result = await tokenService.validateToken(token.id);
      setValidationResult(result);
      setSelectedToken(token);
      setShowValidationModal(true);

      if (result.valid) {
        toast.success(t('configurations.credentialsValid') + '!');
      } else {
        toast.error(t('configurations.credentialsInvalid'));
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    }
  };

  // User Token Functions
  const handleOpenUserTokenModal = () => {
    if (configs.length === 0) {
      toast.error(t('configurations.noConfigurations'));
      navigate('/twitch-configs');
      return;
    }
    setUserTokenFormData({
      twitchConfigId: configs[0]?.id || '',
      name: '',
      scopes: [],
    });
    setShowUserTokenModal(true);
  };

  const handleToggleScope = (scope: string) => {
    setUserTokenFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleSelectAllScopes = () => {
    const allScopes = [
      'analytics:read:extensions', 'analytics:read:games', 'bits:read',
      'channel:bot', 'channel:manage:ads', 'channel:read:ads',
      'channel:manage:broadcast', 'channel:read:charity', 'channel:edit:commercial',
      'channel:read:editors', 'channel:manage:extensions', 'channel:read:goals',
      'channel:read:guest_star', 'channel:manage:guest_star', 'channel:read:hype_train',
      'channel:manage:moderators', 'channel:moderate', 'channel:read:polls',
      'channel:manage:polls', 'channel:read:predictions', 'channel:manage:predictions',
      'channel:manage:raids', 'channel:read:redemptions', 'channel:manage:redemptions',
      'channel:manage:schedule', 'channel:read:stream_key', 'channel:read:subscriptions',
      'channel:manage:videos', 'channel:read:vips', 'channel:manage:vips',
      'clips:edit', 'moderation:read', 'moderator:manage:announcements',
      'moderator:manage:automod', 'moderator:read:automod_settings',
      'moderator:manage:automod_settings', 'moderator:read:banned_users',
      'moderator:manage:banned_users', 'moderator:read:blocked_terms',
      'moderator:manage:blocked_terms', 'moderator:read:chat_messages',
      'moderator:manage:chat_messages', 'moderator:read:chat_settings',
      'moderator:manage:chat_settings', 'moderator:read:chatters',
      'moderator:read:followers', 'moderator:read:guest_star',
      'moderator:manage:guest_star', 'moderator:read:moderators',
      'moderator:read:shield_mode', 'moderator:manage:shield_mode',
      'moderator:read:shoutouts', 'moderator:manage:shoutouts',
      'moderator:read:suspicious_users', 'moderator:read:unban_requests',
      'moderator:manage:unban_requests', 'moderator:read:vips',
      'moderator:read:warnings', 'moderator:manage:warnings',
      'user:bot', 'user:edit', 'user:edit:broadcast',
      'user:read:blocked_users', 'user:manage:blocked_users', 'user:read:broadcast',
      'user:read:chat', 'user:manage:chat_color', 'user:read:email',
      'user:read:emotes', 'user:read:follows', 'user:read:moderated_channels',
      'user:read:subscriptions', 'user:read:whispers', 'user:manage:whispers',
      'user:write:chat', 'chat:read', 'chat:edit', 'whispers:read'
    ];
    setUserTokenFormData((prev) => ({ ...prev, scopes: allScopes }));
  };

  const handleDeselectAllScopes = () => {
    setUserTokenFormData((prev) => ({ ...prev, scopes: [] }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const getScopesGrouped = () => {
    const allScopes = [
      'analytics:read:extensions', 'analytics:read:games', 'bits:read',
      'channel:bot', 'channel:manage:ads', 'channel:read:ads',
      'channel:manage:broadcast', 'channel:read:charity', 'channel:edit:commercial',
      'channel:read:editors', 'channel:manage:extensions', 'channel:read:goals',
      'channel:read:guest_star', 'channel:manage:guest_star', 'channel:read:hype_train',
      'channel:manage:moderators', 'channel:moderate', 'channel:read:polls',
      'channel:manage:polls', 'channel:read:predictions', 'channel:manage:predictions',
      'channel:manage:raids', 'channel:read:redemptions', 'channel:manage:redemptions',
      'channel:manage:schedule', 'channel:read:stream_key', 'channel:read:subscriptions',
      'channel:manage:videos', 'channel:read:vips', 'channel:manage:vips',
      'clips:edit', 'moderation:read', 'moderator:manage:announcements',
      'moderator:manage:automod', 'moderator:read:automod_settings',
      'moderator:manage:automod_settings', 'moderator:read:banned_users',
      'moderator:manage:banned_users', 'moderator:read:blocked_terms',
      'moderator:manage:blocked_terms', 'moderator:read:chat_messages',
      'moderator:manage:chat_messages', 'moderator:read:chat_settings',
      'moderator:manage:chat_settings', 'moderator:read:chatters',
      'moderator:read:followers', 'moderator:read:guest_star',
      'moderator:manage:guest_star', 'moderator:read:moderators',
      'moderator:read:shield_mode', 'moderator:manage:shield_mode',
      'moderator:read:shoutouts', 'moderator:manage:shoutouts',
      'moderator:read:suspicious_users', 'moderator:read:unban_requests',
      'moderator:manage:unban_requests', 'moderator:read:vips',
      'moderator:read:warnings', 'moderator:manage:warnings',
      'user:bot', 'user:edit', 'user:edit:broadcast',
      'user:read:blocked_users', 'user:manage:blocked_users', 'user:read:broadcast',
      'user:read:chat', 'user:manage:chat_color', 'user:read:email',
      'user:read:emotes', 'user:read:follows', 'user:read:moderated_channels',
      'user:read:subscriptions', 'user:read:whispers', 'user:manage:whispers',
      'user:write:chat', 'chat:read', 'chat:edit', 'whispers:read'
    ];

    return {
      'Analytics': allScopes.filter(s => s.startsWith('analytics:')),
      'Channel': allScopes.filter(s => s.startsWith('channel:') || s === 'bits:read' || s === 'clips:edit'),
      'Moderator': allScopes.filter(s => s.startsWith('moderator:') || s.startsWith('moderation:')),
      'User': allScopes.filter(s => s.startsWith('user:')),
      'Chat': allScopes.filter(s => s.startsWith('chat:') || s.startsWith('whispers:')),
    };
  };

  const handleStartUserToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userTokenFormData.twitchConfigId) {
      toast.error(t('configurations.noConfigurations'));
      return;
    }

    if (userTokenFormData.scopes.length === 0) {
      toast.error(t('tokens.selectScopes'));
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: StartUserTokenRequest = {
        twitchConfigId: userTokenFormData.twitchConfigId,
        scopes: userTokenFormData.scopes,
        name: userTokenFormData.name.trim() || undefined,
      };

      const flowData = await tokenService.startUserToken(requestData);
      setDeviceFlowData(flowData);
      setShowUserTokenModal(false);
      setShowDeviceFlowModal(true);

      // Start polling
      startPolling(flowData.deviceCode, flowData.interval);
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPolling = (deviceCode: string, interval: number) => {
    setIsPolling(true);

    const poll = async () => {
      try {
        const result = await tokenService.pollUserToken({
          twitchConfigId: userTokenFormData.twitchConfigId,
          deviceCode,
          name: userTokenFormData.name.trim() || undefined,
        });

        if (result.status === 'success' && result.token) {
          stopPolling();
          setShowDeviceFlowModal(false);
          toast.success(t('tokens.tokenGenerated'));
          loadTokens();

          // Show the token
          setSelectedToken(result.token);
          setShowTokenModal(true);
        } else if (result.status === 'denied') {
          stopPolling();
          setShowDeviceFlowModal(false);
          toast.error(t('errors.unauthorized'));
        } else if (result.status === 'expired') {
          stopPolling();
          setShowDeviceFlowModal(false);
          toast.error(t('errors.somethingWentWrong'));
        }
        // If 'pending', continue polling
      } catch (error: any) {
        stopPolling();
        setShowDeviceFlowModal(false);
        const message = error.response?.data?.message || t('errors.somethingWentWrong');
        toast.error(message);
      }
    };

    // Poll immediately, then at intervals
    poll();
    pollingIntervalRef.current = setInterval(poll, interval * 1000);
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleCancelDeviceFlow = () => {
    stopPolling();
    setShowDeviceFlowModal(false);
    setDeviceFlowData(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
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
                onClick={() => navigate('/twitch-configs')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.configurations')}
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
              <span className="text-gray-300">{user?.name || user?.email}</span>
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
            <h1 className="text-3xl font-bold text-white mb-2">{t('tokens.title')}</h1>
            <p className="text-white/60">{t('tokens.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleOpenGenerateModal} variant="secondary">
              <span className="text-xl mr-2">+</span>
              {t('tokens.appToken')}
            </Button>
            <Button onClick={handleOpenUserTokenModal}>
              <span className="text-xl mr-2">+</span>
              {t('tokens.userToken')}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tokens.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">🔑</div>
            <h2 className="text-xl font-semibold text-white mb-2">{t('tokens.noTokens')}</h2>
            <p className="text-white/60 mb-6">
              {t('tokens.noTokensText')}
            </p>
            <Button onClick={handleOpenGenerateModal}>{t('tokens.generateToken')}</Button>
          </Card>
        ) : (
          /* Tokens List */
          <div className="grid gap-4">
            {tokens.map((token) => {
              const isExpanded = expandedTokens.includes(token.id);
              return (
              <Card
                key={token.id}
                className="hover:border-twitch-purple/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => toggleTokenExpansion(token.id)}
                        className="text-white/60 hover:text-white transition-colors"
                        title={isExpanded ? "Hide details" : "Show details"}
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <h3 className="text-xl font-semibold text-white">
                        {token.name || `${token.tokenType.toUpperCase()} Token`}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          token.tokenType === 'app'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {token.tokenType.toUpperCase()}
                      </span>
                      {isExpired(token.expiresAt) && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">Configuration:</span>
                        <span className="text-white">
                          {token.twitchConfig.name || token.twitchConfig.clientId}
                        </span>
                      </div>
                      {isExpanded && (
                        <>
                          {token.channelLogin && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/60">Channel:</span>
                              <span className="text-white">{token.channelLogin}</span>
                            </div>
                          )}
                          {token.scopes.length > 0 && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-white/60 pt-1">Scopes ({token.scopes.length}):</span>
                              <div className="flex flex-wrap gap-1 flex-1">
                                {token.scopes.map((scope) => (
                                  <span
                                    key={scope}
                                    className="px-2 py-0.5 bg-twitch-dark-light text-white/80 text-xs rounded"
                                  >
                                    {scope}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-4 text-xs text-white/40 mt-3">
                        <span>Created: {formatDate(token.createdAt)}</span>
                        <span>
                          Expires: {getTimeRemaining(token.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleViewToken(token)}
                      className="px-4 py-2 bg-twitch-purple hover:bg-twitch-purple-dark text-white rounded-lg transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleValidateToken(token)}
                      className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                      title="Validate this token with Twitch API"
                    >
                      Validate
                    </button>
                    {token.tokenType === 'user' && (
                      <button
                        onClick={() => handleRefreshToken(token)}
                        className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        title="Refresh this token"
                      >
                        Refresh
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(token)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        )}
      </div>

      {/* Generate Token Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              Generate App Access Token
            </h2>
            <form onSubmit={handleGenerateToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Twitch Configuration *
                </label>
                <select
                  value={formData.twitchConfigId}
                  onChange={(e) =>
                    setFormData({ ...formData, twitchConfigId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                >
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name || config.clientId}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/40 mt-1">
                  Select which Twitch application to use
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="My App Token"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <p className="text-xs text-white/40 mt-1">
                  Give this token a memorable name
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <strong>Note:</strong> App Access Tokens are used for
                  server-to-server requests and don't require user authorization.
                  They have no scopes and can't access user-specific data.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Generating...' : 'Generate Token'}
                </Button>
                <button
                  type="button"
                  onClick={handleCloseGenerateModal}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* User Token Scopes Modal */}
      {showUserTokenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              Generate User Access Token
            </h2>
            <form onSubmit={handleStartUserToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Twitch Configuration *
                </label>
                <select
                  value={userTokenFormData.twitchConfigId}
                  onChange={(e) =>
                    setUserTokenFormData({
                      ...userTokenFormData,
                      twitchConfigId: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                >
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name || config.clientId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="My User Token"
                  value={userTokenFormData.name}
                  onChange={(e) =>
                    setUserTokenFormData({
                      ...userTokenFormData,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-white/80">
                    Scopes * (Select at least one)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllScopes}
                      className="px-3 py-1 text-xs bg-twitch-purple hover:bg-twitch-purple-dark text-white rounded transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllScopes}
                      className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto bg-twitch-dark border border-twitch-gray-dark rounded-lg">
                  {Object.entries(getScopesGrouped()).map(([category, scopes]) => (
                    <div key={category} className="border-b border-twitch-gray-dark last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-twitch-dark-light hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{category}</span>
                          <span className="text-xs text-white/60">({scopes.length} scopes)</span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-white/60 transition-transform ${
                            expandedCategories.includes(category) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedCategories.includes(category) && (
                        <div className="grid grid-cols-2 gap-2 p-3">
                          {scopes.map((scope) => (
                            <label
                              key={scope}
                              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                                userTokenFormData.scopes.includes(scope)
                                  ? 'bg-twitch-purple/20 border border-twitch-purple'
                                  : 'bg-twitch-dark hover:bg-white/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={userTokenFormData.scopes.includes(scope)}
                                onChange={() => handleToggleScope(scope)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-white">{scope}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Selected: {userTokenFormData.scopes.length} scopes
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <strong>Device Flow:</strong> You'll receive a code to authorize on Twitch.
                  Simply visit the URL, enter the code, and we'll automatically detect when you've
                  authorized. No need to copy/paste anything back!
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Starting...' : 'Start Authorization'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowUserTokenModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Device Flow Authorization Modal */}
      {showDeviceFlowModal && deviceFlowData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Authorize on Twitch
            </h2>
            <div className="space-y-6">
              {/* Step 1: Authorization Code */}
              <div className="text-center">
                <p className="text-white/80 text-sm mb-2">
                  <span className="inline-block w-6 h-6 bg-twitch-purple text-white rounded-full text-xs leading-6 mr-2">1</span>
                  Your authorization code:
                </p>
                <div className="inline-block px-8 py-4 bg-twitch-dark border-2 border-twitch-purple rounded-lg mb-3">
                  <code className="text-4xl font-bold text-white tracking-wider">
                    {deviceFlowData.userCode}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(deviceFlowData.userCode);
                    toast.success('Code copied to clipboard!');
                  }}
                  className="text-xs text-twitch-purple hover:text-twitch-purple-dark transition-colors"
                >
                  📋 Copy code
                </button>
              </div>

              {/* Step 2: Open Twitch Button */}
              <div className="text-center">
                <p className="text-white/80 text-sm mb-3">
                  <span className="inline-block w-6 h-6 bg-twitch-purple text-white rounded-full text-xs leading-6 mr-2">2</span>
                  Click the button below to authorize:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.open(deviceFlowData.verificationUri, '_blank', 'noopener,noreferrer');
                    toast.success('Opening Twitch authorization page...');
                  }}
                  className="w-full px-6 py-4 bg-twitch-purple hover:bg-twitch-purple-dark text-white font-bold text-lg rounded-lg transition-colors shadow-lg hover:shadow-twitch-purple/50"
                >
                  🚀 Open Twitch & Authorize
                </button>
                <p className="text-xs text-white/40 mt-2">
                  Enter the code shown above when prompted
                </p>
              </div>

              {/* Polling Status */}
              <div className="flex items-center justify-center gap-2 text-white/60 min-h-[40px]">
                {isPolling && (
                  <>
                    <div className="w-5 h-5 border-2 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Waiting for authorization...</span>
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  💡 <strong>Tip:</strong> After authorizing on Twitch, this window will automatically
                  detect it and close. Expires in {Math.floor(deviceFlowData.expiresIn / 60)} minutes.
                </p>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelDeviceFlow}
                className="w-full px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* View Token Modal */}
      {showTokenModal && selectedToken && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">Token Details</h2>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Access Token
                </label>
                <div className="relative">
                  <code className="block w-full px-4 py-3 pr-20 bg-twitch-dark border border-twitch-gray-dark text-white rounded-lg break-all text-sm font-mono">
                    {selectedToken.accessToken}
                  </code>
                  <Button
                    onClick={handleCopyToken}
                    className="absolute top-2 right-2"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              {selectedToken.refreshToken && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Refresh Token
                  </label>
                  <div className="relative">
                    <code className="block w-full px-4 py-3 pr-20 bg-twitch-dark border border-twitch-gray-dark text-white rounded-lg break-all text-sm font-mono">
                      {selectedToken.refreshToken}
                    </code>
                    <Button
                      onClick={handleCopyRefreshToken}
                      className="absolute top-2 right-2"
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Use this token to refresh the access token when it expires
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Type
                  </label>
                  <p className="text-white">{selectedToken.tokenType.toUpperCase()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Expires
                  </label>
                  <p className="text-white">
                    {getTimeRemaining(selectedToken.expiresAt)}
                  </p>
                </div>
              </div>
              {selectedToken.channelLogin && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Authorized User
                  </label>
                  <p className="text-white">{selectedToken.channelLogin}</p>
                </div>
              )}
              {selectedToken.scopes && selectedToken.scopes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Scopes ({selectedToken.scopes.length})
                  </label>
                  <div className="flex flex-wrap gap-1 bg-twitch-dark border border-twitch-gray-dark rounded-lg p-3 max-h-48 overflow-y-auto">
                    {selectedToken.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 bg-twitch-dark-light text-white/80 text-xs rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  <strong>Security Warning:</strong> Keep these tokens secure and never
                  share them publicly. Anyone with these tokens can make API requests on
                  behalf of your application{selectedToken.tokenType === 'user' ? ' or user' : ''}.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Validation Result Modal */}
      {showValidationModal && validationResult && selectedToken && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">Token Validation</h2>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {/* Validation Status */}
              <div className={`p-4 rounded-lg border-2 ${
                validationResult.valid
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-red-500/10 border-red-500/50'
              }`}>
                <div className="flex items-center gap-3">
                  {validationResult.valid ? (
                    <>
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-xl font-bold text-green-400">Token is Valid</h3>
                        <p className="text-sm text-green-300">This token is active and working correctly</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-xl font-bold text-red-400">Token is Invalid</h3>
                        <p className="text-sm text-red-300">{validationResult.message || 'This token is expired or has been revoked'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {validationResult.valid && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Token Name
                      </label>
                      <p className="text-white">{selectedToken.name || `${selectedToken.tokenType.toUpperCase()} Token`}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Type
                      </label>
                      <p className="text-white">{selectedToken.tokenType.toUpperCase()}</p>
                    </div>
                  </div>

                  {validationResult.login && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Authorized User
                      </label>
                      <p className="text-white">{validationResult.login}</p>
                    </div>
                  )}

                  {validationResult.userId && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        User ID
                      </label>
                      <p className="text-white font-mono">{validationResult.userId}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Client ID
                    </label>
                    <p className="text-white font-mono text-sm">{validationResult.clientId}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Expires In
                    </label>
                    <p className="text-white">
                      {Math.floor(validationResult.expiresIn / 3600)} hours {Math.floor((validationResult.expiresIn % 3600) / 60)} minutes
                    </p>
                  </div>

                  {validationResult.scopes && validationResult.scopes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Active Scopes ({validationResult.scopes.length})
                      </label>
                      <div className="flex flex-wrap gap-1 bg-twitch-dark border border-twitch-gray-dark rounded-lg p-3 max-h-48 overflow-y-auto">
                        {validationResult.scopes.map((scope: string) => (
                          <span
                            key={scope}
                            className="px-2 py-1 bg-twitch-dark-light text-white/80 text-xs rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-400">
                      💡 <strong>Info:</strong> This validation was performed in real-time with Twitch's API.
                      The token is currently active and can be used for API requests.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
