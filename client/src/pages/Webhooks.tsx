import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useAuthStore } from '../store/authStore';
import webhookService from '../services/webhookService';
import tokenService from '../services/tokenService';
import twitchConfigService from '../services/twitchConfigService';
import type { Webhook, EventSubType, SavedToken, TwitchConfig } from '../types/index';

export const Webhooks: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [eventTypes, setEventTypes] = useState<EventSubType[]>([]);
  const [tokens, setTokens] = useState<SavedToken[]>([]);
  const [configs, setConfigs] = useState<TwitchConfig[]>([]);
  const [selectedConfigForSync, setSelectedConfigForSync] = useState<string>(''); // empty = all
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    tokenId: '',
    type: '',
    callbackUrl: 'https://example.com/webhook',
    broadcasterUserId: '',
    moderatorUserId: '',
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [webhooksData, typesData, tokensData, configsData] = await Promise.all([
        webhookService.getAllWebhooks(),
        webhookService.getEventSubTypes(),
        tokenService.getAllTokens(),
        twitchConfigService.getAllConfigs(),
      ]);

      setWebhooks(webhooksData);
      setEventTypes(typesData);
      setTokens(tokensData); // Keep all tokens to check for app tokens
      setConfigs(configsData);

      // Set default token to first user token for webhook creation
      const userTokens = tokensData.filter(t => t.tokenType === 'user');
      if (userTokens.length > 0) {
        setFormData(prev => ({ ...prev, tokenId: userTokens[0].id }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const userTokens = tokens.filter(t => t.tokenType === 'user');
    if (userTokens.length === 0) {
      toast.error(t('tokens.noTokens'));
      navigate('/tokens');
      return;
    }
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedType = eventTypes.find(t => t.type === formData.type);
      if (!selectedType) {
        toast.error(t('errors.requiredField'));
        return;
      }

      const condition: Record<string, string> = {};

      // Build condition based on required fields
      if (selectedType.condition.broadcaster_user_id) {
        if (!formData.broadcasterUserId) {
          toast.error(t('errors.requiredField'));
          return;
        }
        condition.broadcaster_user_id = formData.broadcasterUserId;
      }

      if (selectedType.condition.moderator_user_id) {
        if (!formData.moderatorUserId) {
          toast.error(t('errors.requiredField'));
          return;
        }
        condition.moderator_user_id = formData.moderatorUserId;
      }

      if (selectedType.condition.to_broadcaster_user_id) {
        if (!formData.broadcasterUserId) {
          toast.error(t('errors.requiredField'));
          return;
        }
        condition.to_broadcaster_user_id = formData.broadcasterUserId;
      }

      await webhookService.createWebhook({
        tokenId: formData.tokenId,
        type: formData.type,
        condition,
        callbackUrl: formData.callbackUrl,
      });

      toast.success(t('webhooks.webhookCreated'));
      setShowCreateModal(false);
      setFormData({
        tokenId: tokens[0]?.id || '',
        type: '',
        callbackUrl: 'https://example.com/webhook',
        broadcasterUserId: '',
        moderatorUserId: '',
      });
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (webhook: Webhook) => {
    if (!window.confirm(t('webhooks.deleteConfirmation', { type: webhook.type }))) {
      return;
    }

    try {
      await webhookService.deleteWebhook(webhook.id);
      toast.success(t('webhooks.webhookDeleted'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    }
  };

  const handleSync = async () => {
    const hasAppToken = tokens.some(t => t.tokenType === 'app');
    if (!hasAppToken) {
      toast.error(t('webhooks.needAppToken'));
      return;
    }

    try {
      setIsSyncing(true);
      const result = await webhookService.syncWebhooks(selectedConfigForSync || undefined);

      let message = t('webhooks.syncCompleted', { total: result.total });
      if (result.imported > 0 || result.updated > 0 || result.removed > 0) {
        message += ', ' + t('webhooks.syncStats', { imported: result.imported, updated: result.updated, removed: result.removed });
      }
      if (result.configsSynced) {
        message += '\n\n' + t('webhooks.syncConfigs', { configs: result.configsSynced });
      }

      toast.success(message, { duration: 6000 });
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.message || t('errors.somethingWentWrong');
      toast.error(message, { duration: 5000 });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const toggleGroup = (broadcasterId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(broadcasterId)) {
      newCollapsed.delete(broadcasterId);
    } else {
      newCollapsed.add(broadcasterId);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Filter webhooks based on search and filters
  const filteredWebhooks = webhooks.filter(webhook => {
    // Search filter
    if (searchTerm) {
      const broadcasterUserId = webhook.condition?.broadcaster_user_id || '';
      const moderatorUserId = webhook.condition?.moderator_user_id || '';
      const toBroadcasterUserId = webhook.condition?.to_broadcaster_user_id || '';

      const matchesSearch =
        broadcasterUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        moderatorUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        toBroadcasterUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        webhook.type.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType && webhook.type !== filterType) return false;

    // Status filter
    if (filterStatus && webhook.status !== filterStatus) return false;

    return true;
  });

  // Group webhooks by broadcaster_user_id
  const groupedWebhooks = filteredWebhooks.reduce((groups, webhook) => {
    const broadcasterId = webhook.condition?.broadcaster_user_id ||
                          webhook.condition?.to_broadcaster_user_id ||
                          'unknown';

    if (!groups[broadcasterId]) {
      groups[broadcasterId] = [];
    }
    groups[broadcasterId].push(webhook);
    return groups;
  }, {} as Record<string, Webhook[]>);

  // Get unique types and statuses for filters
  const uniqueTypes = Array.from(new Set(webhooks.map(w => w.type))).sort();
  const uniqueStatuses = Array.from(new Set(webhooks.map(w => w.status))).sort();

  const selectedType = eventTypes.find(t => t.type === formData.type);

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
            <h1 className="text-3xl font-bold text-white mb-2">{t('webhooks.title')}</h1>
            <p className="text-white/60">
              {t('webhooks.subtitle')}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Config Selector for Sync */}
            <select
              value={selectedConfigForSync}
              onChange={(e) => setSelectedConfigForSync(e.target.value)}
              disabled={isSyncing}
              className="px-3 py-2 bg-twitch-dark-light border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-twitch-purple disabled:opacity-50"
            >
              <option value="">{t('webhooks.allConfigurations')}</option>
              {configs.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name || config.clientId}
                </option>
              ))}
            </select>

            <button
              onClick={handleSync}
              disabled={isSyncing || !tokens.some(t => t.tokenType === 'app')}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isSyncing ? t('webhooks.syncing') : t('webhooks.sync')}
            </button>
            <Button onClick={handleOpenCreateModal}>
              <span className="text-xl mr-2">+</span>
              {t('webhooks.createSubscription')}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : webhooks.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('webhooks.noWebhooks')}
              </h3>
              <p className="text-white/60 mb-6">
                {t('webhooks.noWebhooksText')}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !tokens.some(t => t.tokenType === 'app')}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {isSyncing ? t('webhooks.syncing') : t('webhooks.syncWithTwitch')}
                </button>
                <Button onClick={handleOpenCreateModal}>{t('webhooks.createSubscription')}</Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Filters and Search */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-1">
                <input
                  type="text"
                  placeholder={t('webhooks.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-twitch-purple"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-white/10 rounded-lg text-white focus:outline-none focus:border-twitch-purple"
                >
                  <option value="">{t('webhooks.allTypes')}</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-white/10 rounded-lg text-white focus:outline-none focus:border-twitch-purple"
                >
                  <option value="">{t('webhooks.allStatuses')}</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="mb-4 flex items-center justify-between bg-twitch-dark-light rounded-lg p-3">
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span>{t('webhooks.broadcasters', { count: Object.keys(groupedWebhooks).length })}</span>
                <span>•</span>
                <span>{t('webhooks.subscriptions', { count: filteredWebhooks.length })}</span>
                <span>•</span>
                <span>{t('webhooks.totalCost', { cost: filteredWebhooks.reduce((sum, w) => sum + w.cost, 0) })}</span>
              </div>
            </div>

            {/* Grouped Webhooks */}
            <div className="space-y-4">
              {Object.entries(groupedWebhooks).map(([broadcasterId, groupWebhooks]) => {
                const isCollapsed = collapsedGroups.has(broadcasterId);
                const enabledCount = groupWebhooks.filter(w => w.status === 'enabled').length;

                return (
                  <div key={broadcasterId} className="border border-white/10 rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(broadcasterId)}
                      className="w-full px-4 py-3 bg-twitch-dark-light hover:bg-white/5 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 text-white/60 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <svg className="w-5 h-5 text-twitch-purple" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-white">
                            {t('webhooks.broadcaster')} ID: <span className="font-mono">{broadcasterId}</span>
                          </h3>
                          <p className="text-xs text-white/60">
                            {t('webhooks.subscriptions', { count: groupWebhooks.length })} • {enabledCount} {t('webhooks.status.enabled').toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {groupWebhooks.some(w => w.status === 'enabled') && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {t('webhooks.active')}
                          </span>
                        )}
                        <span className="text-xs text-white/40">
                          {isCollapsed ? t('webhooks.expand') : t('webhooks.collapse')}
                        </span>
                      </div>
                    </button>

                    {/* Group Content */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-3 bg-twitch-dark">
                        {groupWebhooks.map((webhook) => (
              <Card key={webhook.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Header with type and status */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-white">{webhook.type}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        webhook.status === 'enabled'
                          ? 'bg-green-500/20 text-green-400'
                          : webhook.status === 'webhook_callback_verification_pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {webhook.status}
                      </span>
                      {webhook.cost > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {t('webhooks.cost', { cost: webhook.cost })}
                        </span>
                      )}
                    </div>

                    {/* Conditions - Main info */}
                    {webhook.condition && (
                      <div className="bg-twitch-dark-light rounded-lg p-3 mb-3">
                        <h4 className="text-sm font-semibold text-white/80 mb-2">{t('webhooks.conditions')}:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {webhook.condition.broadcaster_user_id && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-twitch-purple" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <span className="text-xs text-white/40">{t('webhooks.broadcaster')}:</span>
                                <p className="text-sm text-white font-mono">{webhook.condition.broadcaster_user_id}</p>
                              </div>
                            </div>
                          )}
                          {webhook.condition.moderator_user_id && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <span className="text-xs text-white/40">{t('webhooks.moderator')}:</span>
                                <p className="text-sm text-white font-mono">{webhook.condition.moderator_user_id}</p>
                              </div>
                            </div>
                          )}
                          {webhook.condition.to_broadcaster_user_id && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                              </svg>
                              <div>
                                <span className="text-xs text-white/40">{t('webhooks.toBroadcaster')}:</span>
                                <p className="text-sm text-white font-mono">{webhook.condition.to_broadcaster_user_id}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical details */}
                    <div className="space-y-1">
                      <p className="text-sm text-white/60">
                        <span className="font-medium">{t('webhooks.subscriptionId')}:</span> {webhook.subscriptionId}
                      </p>
                      <p className="text-sm text-white/60">
                        <span className="font-medium">{t('webhooks.callback')}:</span>{' '}
                        <span className="text-xs font-mono">{webhook.callbackUrl}</span>
                      </p>
                      <p className="text-xs text-white/40">
                        {t('webhooks.created')}: {formatDate(webhook.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDelete(webhook)}
                    variant="secondary"
                    className="ml-4"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">{t('webhooks.createSubscription')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Token Selector */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('common.tokens')}
                </label>
                <select
                  value={formData.tokenId}
                  onChange={(e) => setFormData({ ...formData, tokenId: e.target.value })}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                  required
                >
                  {tokens.map((token) => (
                    <option key={token.id} value={token.id}>
                      {token.name || `Token - ${token.channelLogin}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiTester.endpoint')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                  required
                >
                  <option value="">{t('errors.requiredField')}</option>
                  {eventTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.type} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Broadcaster User ID */}
              {selectedType && (selectedType.condition.broadcaster_user_id || selectedType.condition.to_broadcaster_user_id) && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('webhooks.broadcaster')} User ID *
                  </label>
                  <input
                    type="text"
                    value={formData.broadcasterUserId}
                    onChange={(e) => setFormData({ ...formData, broadcasterUserId: e.target.value })}
                    placeholder="e.g., 12345678"
                    className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">
                    The Twitch user ID of the broadcaster
                  </p>
                </div>
              )}

              {/* Moderator User ID */}
              {selectedType && selectedType.condition.moderator_user_id === 'required' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('webhooks.moderator')} User ID *
                  </label>
                  <input
                    type="text"
                    value={formData.moderatorUserId}
                    onChange={(e) => setFormData({ ...formData, moderatorUserId: e.target.value })}
                    placeholder="e.g., 87654321"
                    className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">
                    The Twitch user ID of the moderator
                  </p>
                </div>
              )}

              {/* Callback URL */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('webhooks.callback')} URL
                </label>
                <input
                  type="url"
                  value={formData.callbackUrl}
                  onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                  placeholder="https://example.com/webhook"
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                  required
                />
                <p className="text-xs text-white/40 mt-1">
                  The URL where Twitch will send event notifications (must be HTTPS)
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> Your callback URL must be publicly accessible and able to respond to Twitch's verification challenge.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? t('common.loading') : t('webhooks.createSubscription')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
