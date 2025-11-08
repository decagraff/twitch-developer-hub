import axios from 'axios';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';

/**
 * Generate an App Access Token using Client Credentials flow
 * @param clientId - Twitch application Client ID
 * @param clientSecret - Twitch application Client Secret
 * @returns Access token and expiration time
 */
export async function generateAppAccessToken(
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number }> {
  try {
    const response = await axios.post(TWITCH_AUTH_URL, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in, // seconds until expiration
    };
  } catch (error: any) {
    console.error('Twitch API error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to generate app access token'
    );
  }
}

/**
 * Validate a token with Twitch API
 * @param accessToken - Token to validate
 * @returns Token validation data
 */
export async function validateToken(accessToken: string): Promise<{
  clientId: string;
  login: string | null;
  scopes: string[];
  userId: string | null;
  expiresIn: number;
}> {
  try {
    const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    return {
      clientId: response.data.client_id,
      login: response.data.login || null,
      scopes: response.data.scopes || [],
      userId: response.data.user_id || null,
      expiresIn: response.data.expires_in,
    };
  } catch (error: any) {
    console.error('Token validation error:', error.response?.data || error.message);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Revoke a token
 * @param clientId - Twitch application Client ID
 * @param accessToken - Token to revoke
 */
export async function revokeToken(
  clientId: string,
  accessToken: string
): Promise<void> {
  try {
    await axios.post('https://id.twitch.tv/oauth2/revoke', null, {
      params: {
        client_id: clientId,
        token: accessToken,
      },
    });
  } catch (error: any) {
    console.error('Token revocation error:', error.response?.data || error.message);
    throw new Error('Failed to revoke token');
  }
}

/**
 * Start the Device Flow authorization process
 * @param clientId - Twitch application Client ID
 * @param scopes - Array of scopes to request
 * @returns Device code, user code, and verification URI
 */
export async function startDeviceFlow(
  clientId: string,
  scopes: string[]
): Promise<{
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}> {
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/device', null, {
      params: {
        client_id: clientId,
        scopes: scopes.join(' '),
      },
    });

    return {
      deviceCode: response.data.device_code,
      userCode: response.data.user_code,
      verificationUri: response.data.verification_uri,
      expiresIn: response.data.expires_in,
      interval: response.data.interval || 5, // Default polling interval
    };
  } catch (error: any) {
    console.error('Device flow start error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to start device flow'
    );
  }
}

/**
 * Poll for device flow token (check if user authorized)
 * @param clientId - Twitch application Client ID
 * @param deviceCode - Device code from startDeviceFlow
 * @returns Access token, refresh token, and expiration, or null if still pending
 */
export async function pollDeviceToken(
  clientId: string,
  deviceCode: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] } | null> {
  try {
    const response = await axios.post(TWITCH_AUTH_URL, null, {
      params: {
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      scopes: Array.isArray(response.data.scope)
        ? response.data.scope
        : (response.data.scope ? response.data.scope.split(' ') : []),
    };
  } catch (error: any) {
    // These errors are expected during polling
    if (error.response?.status === 400) {
      const errorType = error.response.data?.message || error.response.data?.error;

      // Still waiting for user authorization
      if (errorType === 'authorization_pending') {
        return null;
      }

      // User denied or code expired
      if (errorType === 'access_denied' || errorType === 'expired_token') {
        throw new Error(errorType);
      }

      // Polling too fast
      if (errorType === 'slow_down') {
        return null;
      }
    }

    console.error('Device token poll error:', error.response?.data || error.message);
    throw new Error('Failed to poll for device token');
  }
}

/**
 * Generate Authorization Code Flow URL
 * @param clientId - Twitch application Client ID
 * @param redirectUri - Redirect URI configured in Twitch app
 * @param scopes - Array of scopes to request
 * @param state - Random state for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function generateAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token (Authorization Code Flow)
 * @param clientId - Twitch application Client ID
 * @param clientSecret - Twitch application Client Secret
 * @param code - Authorization code from redirect
 * @param redirectUri - Same redirect URI used in authorization
 * @returns Access token, refresh token, and expiration
 */
export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] }> {
  try {
    const response = await axios.post(TWITCH_AUTH_URL, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      scopes: Array.isArray(response.data.scope)
        ? response.data.scope
        : (response.data.scope ? response.data.scope.split(' ') : []),
    };
  } catch (error: any) {
    console.error('Code exchange error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to exchange authorization code'
    );
  }
}

/**
 * Refresh an access token using a refresh token
 * @param clientId - Twitch application Client ID
 * @param clientSecret - Twitch application Client Secret
 * @param refreshToken - Refresh token from previous authorization
 * @returns New access token and refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] }> {
  try {
    const response = await axios.post(TWITCH_AUTH_URL, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      scopes: Array.isArray(response.data.scope)
        ? response.data.scope
        : (response.data.scope ? response.data.scope.split(' ') : []),
    };
  } catch (error: any) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to refresh access token'
    );
  }
}
