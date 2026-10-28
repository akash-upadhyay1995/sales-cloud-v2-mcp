import axios from "axios";
import type { Config } from "../config.js";

export interface TokenCache {
  token: string;
  expiresAt: number;
}

// Module-level cache shared across requests within the same process lifetime
let _tokenCache: TokenCache | null = null;

/** Returns the API-key auth header. */
export function apiKeyHeaders(config: Config): Record<string, string> {
  return { [config.salesCloudApiKeyHeader]: config.salesCloudApiKey! };
}

/** Returns the HTTP Basic Auth header (base64-encoded user:pass). */
export function basicAuthHeaders(config: Config): Record<string, string> {
  const encoded = Buffer.from(
    `${config.salesCloudUsername}:${config.salesCloudPassword}`
  ).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

/** Auto-detect which auth method to use based on what is configured. Priority: OAuth2 > Basic > API key. */
export function resolveAuthHeaders(config: Config): Promise<Record<string, string>> | Record<string, string> {
  if (isOAuthConfigured(config)) return getOAuthToken(config).then((t) => ({ Authorization: `Bearer ${t}` }));
  if (isBasicConfigured(config)) return basicAuthHeaders(config);
  return apiKeyHeaders(config);
}

/** True when all required BTP OAuth2 values are present. */
export function isOAuthConfigured(config: Config): boolean {
  return !!(config.btpClientId && config.btpClientSecret && config.btpTokenUrl);
}

/** True when both username and password are present. */
export function isBasicConfigured(config: Config): boolean {
  return !!(config.salesCloudUsername && config.salesCloudPassword);
}

/**
 * Fetches (or returns a cached) OAuth2 access token using client_credentials flow.
 * Used when deploying the MCP server to SAP BTP.
 */
export async function getOAuthToken(config: Config): Promise<string> {
  if (!config.btpTokenUrl || !config.btpClientId || !config.btpClientSecret) {
    throw new Error(
      "Incomplete BTP OAuth2 configuration — ensure BTP_TOKEN_URL, BTP_CLIENT_ID, and BTP_CLIENT_SECRET are set"
    );
  }

  // Return cached token with a 60 s safety buffer
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.btpClientId,
    client_secret: config.btpClientSecret,
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
  }>(config.btpTokenUrl, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
  });

  _tokenCache = {
    token: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1_000,
  };

  return _tokenCache.token;
}
