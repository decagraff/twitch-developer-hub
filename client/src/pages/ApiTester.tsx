import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useAuthStore } from '../store/authStore';
import tokenService from '../services/tokenService';
import apiLogService from '../services/apiLogService';
import type { SavedToken } from '../types/index';

interface ApiCall {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number | null;
  response: any;
  error: string | null;
}

const COMMON_ENDPOINTS = [
  { label: 'Get Users', method: 'GET', path: '/users', params: '?login=twitch' },
  { label: 'Get Channel Info', method: 'GET', path: '/channels', params: '?broadcaster_id=' },
  { label: 'Get Streams', method: 'GET', path: '/streams', params: '?user_login=twitch' },
  { label: 'Get Followers', method: 'GET', path: '/channels/followers', params: '?broadcaster_id=' },
  { label: 'Get Moderators', method: 'GET', path: '/moderation/moderators', params: '?broadcaster_id=' },
  { label: 'Get Videos', method: 'GET', path: '/videos', params: '?user_id=' },
  { label: 'Get Clips', method: 'GET', path: '/clips', params: '?broadcaster_id=' },
  { label: 'Get Games', method: 'GET', path: '/games', params: '?name=Just%20Chatting' },
  { label: 'Get Top Games', method: 'GET', path: '/games/top', params: '' },
  { label: 'Get Subscriptions', method: 'GET', path: '/subscriptions', params: '?broadcaster_id=' },
  { label: 'Get Emotes', method: 'GET', path: '/chat/emotes', params: '?broadcaster_id=' },
  { label: 'Get Chatters', method: 'GET', path: '/chat/chatters', params: '?broadcaster_id=&moderator_id=' },
  { label: 'Custom Endpoint', method: 'GET', path: '', params: '' },
];

export const ApiTester: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [tokens, setTokens] = useState<SavedToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(COMMON_ENDPOINTS[0]);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ApiCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    loadTokens();
    loadLogs();
  }, []);

  const loadTokens = async () => {
    try {
      const data = await tokenService.getAllTokens();
      setTokens(data);
      if (data.length > 0) {
        setSelectedTokenId(data[0].id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    }
  };

  const loadLogs = async () => {
    try {
      const data = await apiLogService.getAllLogs(20, 0);
      // Convert to ApiCall format
      const calls: ApiCall[] = data.logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        method: log.method,
        endpoint: log.endpoint,
        status: log.status,
        response: log.responseBody,
        error: log.error,
      }));
      setHistory(calls);
    } catch (error: any) {
      console.error('Failed to load logs:', error);
      // Don't show error toast, logs are optional
    }
  };

  const handleEndpointChange = (index: number) => {
    const endpoint = COMMON_ENDPOINTS[index];
    setSelectedEndpoint(endpoint);
    setMethod(endpoint.method);
    if (endpoint.label === 'Custom Endpoint') {
      setCustomEndpoint('');
    } else {
      setCustomEndpoint(endpoint.path + endpoint.params);
    }
  };

  const handleTestApi = async () => {
    if (!selectedTokenId) {
      toast.error(t('apiTester.selectToken'));
      return;
    }

    const endpoint = customEndpoint || (selectedEndpoint.path + selectedEndpoint.params);
    if (!endpoint) {
      toast.error(t('errors.requiredField'));
      return;
    }

    try {
      setIsLoading(true);

      // Get the token
      const token = await tokenService.getToken(selectedTokenId);

      // Make the API call to Twitch
      const url = `https://api.twitch.tv/helix${endpoint}`;
      const clientId = token.twitchConfig.clientId;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Client-Id': clientId,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      // Create history entry
      const call: ApiCall = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        status: response.status,
        response: data,
        error: null,
      };

      setHistory((prev) => [call, ...prev]);
      setSelectedCall(call);

      // Save to database (don't block on this)
      apiLogService.createLog({
        tokenId: selectedTokenId,
        method,
        endpoint,
        status: response.status,
        responseBody: data,
      }).catch((err) => {
        console.error('Failed to save log:', err);
      });

      if (response.ok) {
        toast.success(t('apiTester.sendRequest') + '!');
      } else {
        toast.error(`${t('apiTester.error')}: ${response.status}`);
      }
    } catch (error: any) {
      const call: ApiCall = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        status: null,
        response: null,
        error: error.message,
      };

      setHistory((prev) => [call, ...prev]);
      setSelectedCall(call);

      // Save error to database
      apiLogService.createLog({
        tokenId: selectedTokenId,
        method,
        endpoint,
        error: error.message,
      }).catch((err) => {
        console.error('Failed to save log:', err);
      });

      toast.error(error.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatJson = (json: any) => {
    return JSON.stringify(json, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('tokens.copy') + '!');
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
                onClick={() => navigate('/twitch-configs')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {t('common.configurations')}
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('apiTester.title')}</h1>
          <p className="text-white/60">{t('apiTester.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Request Configuration */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">{t('apiTester.sendRequest')}</h2>

              {/* Token Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiTester.selectToken')}
                </label>
                <select
                  value={selectedTokenId}
                  onChange={(e) => setSelectedTokenId(e.target.value)}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                >
                  {tokens.length === 0 && (
                    <option value="">{t('apiTester.noTokens')}</option>
                  )}
                  {tokens.map((token) => (
                    <option key={token.id} value={token.id}>
                      {token.name || `${token.tokenType.toUpperCase()} Token`} - {token.twitchConfig.name || token.twitchConfig.clientId}
                    </option>
                  ))}
                </select>
                {tokens.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    {t('apiTester.noTokens')}. <button onClick={() => navigate('/tokens')} className="underline">{t('apiTester.createTokenFirst')}</button>
                  </p>
                )}
              </div>

              {/* Endpoint Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiTester.endpoint')}
                </label>
                <select
                  onChange={(e) => handleEndpointChange(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                >
                  {COMMON_ENDPOINTS.map((endpoint, index) => (
                    <option key={index} value={index}>
                      {endpoint.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiTester.method')}
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {/* Custom Endpoint */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('apiTester.endpoint')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">https://api.twitch.tv/helix</span>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder={t('apiTester.endpointPlaceholder')}
                    className="flex-1 px-4 py-2 bg-twitch-dark-light border border-twitch-gray-dark text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-twitch-purple"
                  />
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Enter the path starting with /
                </p>
              </div>

              {/* Test Button */}
              <Button
                onClick={handleTestApi}
                disabled={isLoading || !selectedTokenId}
                className="w-full"
              >
                {isLoading ? t('apiTester.sending') : t('apiTester.sendRequest')}
              </Button>
            </Card>

            {/* History */}
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">{t('apiTester.requestHistory')}</h2>
              {history.length === 0 ? (
                <p className="text-white/40 text-center py-8">{t('apiTester.noHistory')}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((call) => (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedCall?.id === call.id
                          ? 'bg-twitch-purple/20 border border-twitch-purple'
                          : 'bg-twitch-dark-light hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            call.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                            call.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                            call.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                            call.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {call.method}
                          </span>
                          <span className="text-white text-sm font-mono">{call.endpoint}</span>
                        </div>
                        {call.status && (
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            call.status >= 200 && call.status < 300
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {call.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        {new Date(call.timestamp).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Response Viewer */}
          <div>
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{t('apiTester.response')}</h2>
                {selectedCall && selectedCall.response && (
                  <Button
                    onClick={() => copyToClipboard(formatJson(selectedCall.response))}
                    variant="secondary"
                  >
                    {t('tokens.copy')} JSON
                  </Button>
                )}
              </div>

              {!selectedCall ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-white/40">{t('apiTester.noHistoryText')}</p>
                </div>
              ) : (
                <div>
                  {/* Status */}
                  <div className="mb-4 p-3 rounded-lg bg-twitch-dark-light">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">{t('apiTester.status')}:</span>
                      {selectedCall.status ? (
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedCall.status >= 200 && selectedCall.status < 300
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedCall.status} {
                            selectedCall.status >= 200 && selectedCall.status < 300 ? 'Success' :
                            selectedCall.status >= 400 && selectedCall.status < 500 ? 'Client Error' :
                            selectedCall.status >= 500 ? 'Server Error' : ''
                          }
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded text-sm font-medium bg-red-500/20 text-red-400">
                          {t('apiTester.error')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Response Body */}
                  {selectedCall.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 font-medium mb-2">{t('apiTester.error')}</p>
                      <p className="text-red-300 text-sm">{selectedCall.error}</p>
                    </div>
                  ) : (
                    <div className="bg-twitch-dark border border-twitch-gray-dark rounded-lg overflow-hidden">
                      <pre className="p-4 overflow-x-auto text-xs text-white/80 font-mono max-h-[600px] overflow-y-auto">
                        {formatJson(selectedCall.response)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
