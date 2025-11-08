export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  message: string;
  messages?: string[];
  stack?: string;
}

export interface TwitchConfig {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string | null;
  tokensCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTwitchConfigRequest {
  clientId: string;
  clientSecret: string;
  name?: string;
}

export interface UpdateTwitchConfigRequest {
  clientId?: string;
  clientSecret?: string;
  name?: string;
}

export interface TwitchConfigsResponse {
  configs: TwitchConfig[];
}

export interface TwitchConfigResponse {
  config: TwitchConfig;
  message?: string;
}

export interface SavedToken {
  id: string;
  tokenType: 'user' | 'app';
  accessToken?: string; // Only present when fetching a specific token
  refreshToken?: string; // Only present for user tokens when fetching a specific token
  scopes: string[];
  channelLogin: string | null;
  channelId: string | null;
  name: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  twitchConfig: {
    id: string;
    clientId: string;
    name: string | null;
  };
}

export interface GenerateAppTokenRequest {
  twitchConfigId: string;
  name?: string;
}

export interface StartUserTokenRequest {
  twitchConfigId: string;
  scopes: string[];
  name?: string;
}

export interface DeviceFlowResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface PollUserTokenRequest {
  twitchConfigId: string;
  deviceCode: string;
  name?: string;
}

export interface PollUserTokenResponse {
  status: 'pending' | 'success' | 'denied' | 'expired';
  token?: SavedToken;
  message?: string;
}

export interface TokensResponse {
  tokens: SavedToken[];
}

export interface TokenResponse {
  token: SavedToken;
  message?: string;
}

export interface StartAuthorizationFlowRequest {
  twitchConfigId: string;
  scopes: string[];
  state: string;
}

export interface StartAuthorizationFlowResponse {
  authorizationUrl: string;
  redirectUri: string;
}

export interface HandleOAuthCallbackRequest {
  twitchConfigId: string;
  code: string;
  name?: string;
}

export interface RefreshTokenRequest {
  tokenId: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  clientId?: string;
  login?: string | null;
  userId?: string | null;
  scopes?: string[];
  expiresIn?: number;
  message?: string;
}

export interface Webhook {
  id: string;
  subscriptionId: string;
  type: string;
  condition?: Record<string, string>;
  callbackUrl: string;
  status: string;
  cost: number;
  createdAt: string;
}

export interface CreateWebhookRequest {
  tokenId: string;
  type: string;
  condition: Record<string, string>;
  callbackUrl: string;
}

export interface EventSubType {
  type: string;
  version: string;
  description: string;
  condition: Record<string, string>;
}

export interface WebhooksResponse {
  webhooks: Webhook[];
}

export interface EventSubTypesResponse {
  types: EventSubType[];
}

export interface ApiLog {
  id: string;
  tokenId: string | null;
  tokenName: string | null;
  tokenType: string | null;
  method: string;
  endpoint: string;
  status: number | null;
  requestBody: any;
  responseBody: any;
  error: string | null;
  createdAt: string;
}

export interface CreateApiLogRequest {
  tokenId?: string;
  method: string;
  endpoint: string;
  status?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

export interface ApiLogsResponse {
  logs: ApiLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiLogResponse {
  log: ApiLog;
}
