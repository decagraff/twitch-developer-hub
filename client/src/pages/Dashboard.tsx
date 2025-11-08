import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import tokenService from '../services/tokenService';
import twitchConfigService from '../services/twitchConfigService';
import apiLogService from '../services/apiLogService';
import twitchApiService, { type TwitchUser, type TwitchStream } from '../services/twitchApiService';
import type { SavedToken } from '../types/index';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    configs: 0,
    tokens: 0,
    logs: 0,
  });
  const [twitchData, setTwitchData] = useState<{
    user: TwitchUser | null;
    stream: TwitchStream | null;
    followers: number;
    subscribers: number;
  }>({
    user: null,
    stream: null,
    followers: 0,
    subscribers: 0,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load stats
      const [configs, tokens, logs] = await Promise.all([
        twitchConfigService.getAllConfigs(),
        tokenService.getAllTokens(),
        apiLogService.getAllLogs(1, 0),
      ]);

      setStats({
        configs: configs.length,
        tokens: tokens.length,
        logs: logs.total,
      });

      // Try to find a user token to display Twitch data
      const userToken = tokens.find(t => t.tokenType === 'user');
      if (userToken) {
        await loadTwitchData(userToken);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTwitchData = async (token: SavedToken) => {
    try {
      // Get full token with accessToken
      const fullToken = await tokenService.getToken(token.id);

      if (!fullToken.channelId) {
        return;
      }

      // Load user info
      const users = await twitchApiService.getUsers(fullToken, [fullToken.channelLogin!]);
      const twitchUser = users[0] || null;

      // Load stream status
      const streams = await twitchApiService.getStreams(fullToken, [fullToken.channelId]);
      const stream = streams[0] || null;

      // Load followers (only if has scope)
      let followers = 0;
      if (fullToken.scopes.includes('moderator:read:followers')) {
        try {
          followers = await twitchApiService.getFollowerCount(fullToken, fullToken.channelId);
        } catch (err) {
          console.log('No follower scope');
        }
      }

      // Load subscribers (only if has scope)
      let subscribers = 0;
      if (fullToken.scopes.includes('channel:read:subscriptions')) {
        try {
          subscribers = await twitchApiService.getSubscriberCount(fullToken, fullToken.channelId);
        } catch (err) {
          console.log('No subscriber scope');
        }
      }

      setTwitchData({
        user: twitchUser,
        stream,
        followers,
        subscribers,
      });
    } catch (error: any) {
      console.error('Failed to load Twitch data:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-twitch-dark">
      {/* Header */}
      <header className="bg-twitch-dark-light border-b border-twitch-gray-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Logo />
            <div className="flex items-center space-x-4">
              <LanguageSelector />
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
                onClick={() => navigate('/webhooks')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.webhooks')}
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => navigate('/api-tester')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.apiTester')}
              </button>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                {t('auth.welcomeBack')}{user?.name ? `, ${user.name}` : ''}! 👋
              </h1>
              <p className="text-gray-400">
                {t('dashboard.subtitle')}
              </p>
            </div>

            {/* Twitch Channel Info */}
            {twitchData.user && (
              <div className="mb-8">
                <Card>
                  <div className="flex items-start gap-6">
                    {/* Profile Image */}
                    <img
                      src={twitchData.user.profile_image_url}
                      alt={twitchData.user.display_name}
                      className="w-24 h-24 rounded-full border-4 border-twitch-purple"
                    />

                    {/* Channel Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">
                          {twitchData.user.display_name}
                        </h2>
                        {twitchData.stream ? (
                          <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            {t('dashboard.live')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm font-medium rounded-full">
                            {t('dashboard.offline')}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 mb-4">{twitchData.user.description || 'No description'}</p>

                      {/* Stream Info if Live */}
                      {twitchData.stream && (
                        <div className="bg-twitch-dark border border-twitch-purple/30 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium mb-1">{twitchData.stream.title}</p>
                              <p className="text-white/60 text-sm">{twitchData.stream.game_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-twitch-purple">
                                {formatNumber(twitchData.stream.viewer_count)}
                              </p>
                              <p className="text-white/60 text-sm">{t('dashboard.viewers')}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="flex gap-6">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {formatNumber(twitchData.user.view_count)}
                          </p>
                          <p className="text-white/60 text-sm">{t('dashboard.viewers')}</p>
                        </div>
                        {twitchData.followers > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-white">
                              {formatNumber(twitchData.followers)}
                            </p>
                            <p className="text-white/60 text-sm">{t('dashboard.followers')}</p>
                          </div>
                        )}
                        {twitchData.subscribers > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-white">
                              {formatNumber(twitchData.subscribers)}
                            </p>
                            <p className="text-white/60 text-sm">{t('dashboard.subscribers')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{t('common.configurations')}</h3>
                  <span className="text-3xl">⚙️</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stats.configs}</p>
                <p className="text-sm text-gray-400">{t('configurations.title')}</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{t('common.tokens')}</h3>
                  <span className="text-3xl">🔑</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stats.tokens}</p>
                <p className="text-sm text-gray-400">{t('tokens.title')}</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{t('common.apiTester')}</h3>
                  <span className="text-3xl">📊</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(stats.logs)}</p>
                <p className="text-sm text-gray-400">{t('apiTester.title')}</p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h2 className="text-2xl font-bold text-white mb-6">{t('dashboard.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  className="w-full py-4"
                  onClick={() => navigate('/tokens')}
                >
                  {t('tokens.title')}
                </Button>
                <Button
                  className="w-full py-4"
                  onClick={() => navigate('/webhooks')}
                >
                  {t('webhooks.title')}
                </Button>
                <Button
                  className="w-full py-4"
                  onClick={() => navigate('/api-tester')}
                  variant="secondary"
                >
                  {t('apiTester.title')}
                </Button>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};
