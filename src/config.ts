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
  /** OData service path relative to salesCloudBaseUrl (default: /sap/c4c/odata/v1/c4codataapi) */
  odataBasePath: string;

  // ── Auth — one of: apikey | basic | oauth2 (auto-detected) ───────────────
  /** API key sent in a header (apikey auth) */
  salesCloudApiKey: string | undefined;
  /** HTTP header name carrying the API key (default: APIKey) */
  salesCloudApiKeyHeader: string;
  /** Username for HTTP Basic authentication */
  salesCloudUsername: string | undefined;
  /** Password for HTTP Basic authentication */
  salesCloudPassword: string | undefined;

  // ── SAP BTP Deployment (OAuth2) ───────────────────────────────────────────
  btpAppUrl: string | undefined;
  btpClientId: string | undefined;
  btpClientSecret: string | undefined;
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
  const salesCloudBaseUrl = requireEnv(
    "SALES_CLOUD_BASE_URL",
    "e.g. https://my123456.crm.cloud.sap"
  );

  const salesCloudApiKey = optionalEnv("SALES_CLOUD_API_KEY");
  const salesCloudUsername = optionalEnv("SALES_CLOUD_USERNAME");
  const salesCloudPassword = optionalEnv("SALES_CLOUD_PASSWORD");
  const btpClientId = optionalEnv("BTP_CLIENT_ID");
  const btpClientSecret = optionalEnv("BTP_CLIENT_SECRET");
  const btpTokenUrl = optionalEnv("BTP_TOKEN_URL");

  // Validate: at least one auth method must be configured
  const hasApiKey = !!salesCloudApiKey;
  const hasBasic = !!(salesCloudUsername && salesCloudPassword);
  const hasOAuth = !!(btpClientId && btpClientSecret && btpTokenUrl);

  if (!hasApiKey && !hasBasic && !hasOAuth) {
    throw new Error(
      "No authentication credentials configured.\n" +
        "  Set one of:\n" +
        "    API key:    SALES_CLOUD_API_KEY=<key>\n" +
        "    Basic auth: SALES_CLOUD_USERNAME=<user>  SALES_CLOUD_PASSWORD=<pass>\n" +
        "    OAuth2:     BTP_CLIENT_ID + BTP_CLIENT_SECRET + BTP_TOKEN_URL"
    );
  }

  return {
    salesCloudBaseUrl,
    odataBasePath: optionalEnv("ODATA_BASE_PATH") ?? "/sap/c4c/odata/v1/c4codataapi",

    salesCloudApiKey,
    salesCloudApiKeyHeader: optionalEnv("SALES_CLOUD_API_KEY_HEADER") ?? "APIKey",
    salesCloudUsername,
    salesCloudPassword,

    btpAppUrl: optionalEnv("BTP_APP_URL"),
    btpClientId,
    btpClientSecret,
    btpTokenUrl,

    requestTimeoutMs: Number(optionalEnv("REQUEST_TIMEOUT_MS") ?? 30_000),
    maxRetries: Number(optionalEnv("MAX_RETRIES") ?? 3),
  };
}
