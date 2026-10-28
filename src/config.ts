import { config as loadDotenv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from the project root regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadDotenv({ path: resolve(__dirname, "..", ".env") });

export interface Config {
  // ── SAP Sales Cloud V2 ────────────────────────────────────────────────────
  /** Base URL of the SAP Sales Cloud V2 tenant (e.g. https://my123456.crm.cloud.sap) */
  salesCloudBaseUrl: string;
  /** API key sent with every request */
  salesCloudApiKey: string;
  /** HTTP header name carrying the API key (default: APIKey) */
  salesCloudApiKeyHeader: string;
  /** OData service path relative to salesCloudBaseUrl (default: /sap/c4c/odata/v1/c4codataapi) */
  odataBasePath: string;

  // ── SAP BTP Deployment (future) ───────────────────────────────────────────
  /** Public URL of the MCP server when deployed on SAP BTP */
  btpAppUrl: string | undefined;
  /** OAuth2 client ID from BTP xsuaa service binding */
  btpClientId: string | undefined;
  /** OAuth2 client secret from BTP xsuaa service binding */
  btpClientSecret: string | undefined;
  /** OAuth2 token endpoint URL from BTP xsuaa service binding */
  btpTokenUrl: string | undefined;

  // ── HTTP settings ─────────────────────────────────────────────────────────
  requestTimeoutMs: number;
  maxRetries: number;
}

function requireEnv(key: string, hint: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Required environment variable "${key}" is not set.\n` +
        `  Hint: ${hint}\n` +
        `  Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function loadConfig(): Config {
  return {
    salesCloudBaseUrl: requireEnv(
      "SALES_CLOUD_BASE_URL",
      "e.g. https://my123456.crm.cloud.sap"
    ),
    salesCloudApiKey: requireEnv(
      "SALES_CLOUD_API_KEY",
      "Obtain from Settings > API Keys in your Sales Cloud V2 tenant"
    ),
    salesCloudApiKeyHeader: optionalEnv("SALES_CLOUD_API_KEY_HEADER") ?? "APIKey",
    odataBasePath:
      optionalEnv("ODATA_BASE_PATH") ?? "/sap/c4c/odata/v1/c4codataapi",

    btpAppUrl: optionalEnv("BTP_APP_URL"),
    btpClientId: optionalEnv("BTP_CLIENT_ID"),
    btpClientSecret: optionalEnv("BTP_CLIENT_SECRET"),
    btpTokenUrl: optionalEnv("BTP_TOKEN_URL"),

    requestTimeoutMs: Number(optionalEnv("REQUEST_TIMEOUT_MS") ?? 30_000),
    maxRetries: Number(optionalEnv("MAX_RETRIES") ?? 3),
  };
}
