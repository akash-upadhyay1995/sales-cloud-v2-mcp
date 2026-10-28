import axios, { type AxiosInstance, AxiosError } from "axios";
import type { Config } from "../config.js";
import { apiKeyHeaders, getOAuthToken, isOAuthConfigured } from "./auth.js";
import type { ODataListResponse, QueryParams } from "./types.js";

// OData v2 JSON response envelopes returned by SAP C4C
interface ODataV2ListResponse<T> {
  d: { results: T[]; __count?: string };
}
interface ODataV2SingleResponse<T> {
  d: T;
}

/** Normalize an OData v2 list response into the v4-style shape used everywhere else. */
function normalizeList<T>(raw: unknown): ODataListResponse<T> {
  // HTML string → wrong base URL (catalog page, login redirect, etc.)
  if (typeof raw === "string") {
    throw new Error(
      "Expected OData JSON but got a text/HTML response. " +
      "SALES_CLOUD_BASE_URL in your .env is pointing at the wrong endpoint. " +
      "Use https://sandbox.api.sap.com for the sandbox, or https://<tenant>.crm.cloud.sap for a real tenant."
    );
  }

  // OData v2 envelope: { d: { results: [...], __count?: "N" } }
  const v2 = raw as ODataV2ListResponse<T>;
  if (v2?.d?.results !== undefined) {
    return {
      value: v2.d.results,
      "@odata.count": v2.d.__count !== undefined ? parseInt(v2.d.__count, 10) : undefined,
    };
  }

  // OData v4 envelope: { value: [...] }
  if (raw !== null && typeof raw === "object" && "value" in raw) {
    return raw as ODataListResponse<T>;
  }

  // Neither v2 nor v4 — something is wrong with the base URL
  const preview = JSON.stringify(raw).slice(0, 120);
  throw new Error(
    `Response is not OData (missing both d.results and value). ` +
    `Check SALES_CLOUD_BASE_URL in your .env. Got: ${preview}`
  );
}

/** Unwrap a single-entity OData v2 response. */
function normalizeSingle<T>(raw: unknown): T {
  const v2 = raw as ODataV2SingleResponse<T>;
  if (v2?.d !== undefined && typeof v2.d === "object" && !Array.isArray(v2.d)) {
    return v2.d;
  }
  return raw as T;
}

export class SalesCloudClient {
  private readonly http: AxiosInstance;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;

    const baseURL = `${config.salesCloudBaseUrl.replace(/\/$/, "")}${config.odataBasePath}`;

    this.http = axios.create({
      baseURL,
      timeout: config.requestTimeoutMs,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.http.interceptors.request.use(async (axiosConfig) => {
      const authHeaders = isOAuthConfigured(config)
        ? { Authorization: `Bearer ${await getOAuthToken(config)}` }
        : apiKeyHeaders(config);
      axiosConfig.headers = Object.assign(axiosConfig.headers ?? {}, authHeaders);
      return axiosConfig;
    });

    this.http.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const status = err.response?.status ?? "unknown";
        const data = err.response?.data as Record<string, unknown> | undefined;

        // SAP OData v2 error shape: { error: { message: { value: "..." } } }
        const sapMessage =
          (
            (data?.error as Record<string, unknown>)?.message as
              | Record<string, unknown>
              | string
              | undefined
          ) ?? undefined;
        const message =
          typeof sapMessage === "object"
            ? (sapMessage as Record<string, unknown>).value
            : sapMessage ?? (data?.message as string) ?? err.message;

        throw new Error(`SAP Sales Cloud API [${status}]: ${String(message)}`);
      }
    );
  }

  /** List entities. Accepts OData v2 ($inlinecount) and v4 ($count) — normalised to v4 shape. */
  async list<T>(
    entitySet: string,
    params: QueryParams = {}
  ): Promise<ODataListResponse<T>> {
    // Translate $count → $inlinecount for OData v2
    const { $count, ...rest } = params;
    const queryParams = {
      ...rest,
      ...($count !== false ? { $inlinecount: "allpages" } : {}),
    };

    const res = await this.http.get<unknown>(`/${entitySet}`, { params: queryParams });
    return normalizeList<T>(res.data);
  }

  /** Get a single entity by ObjectID key. */
  async getById<T>(
    entitySet: string,
    objectId: string,
    params: QueryParams = {}
  ): Promise<T> {
    const res = await this.http.get<unknown>(`/${entitySet}('${objectId}')`, { params });
    return normalizeSingle<T>(res.data);
  }

  /** Create a new entity. */
  async create<T>(entitySet: string, body: Partial<T>): Promise<T> {
    const res = await this.http.post<unknown>(`/${entitySet}`, body);
    return normalizeSingle<T>(res.data);
  }

  /** Partial update via PATCH. */
  async patch<T>(
    entitySet: string,
    objectId: string,
    body: Partial<T>
  ): Promise<void> {
    await this.http.patch(`/${entitySet}('${objectId}')`, body, {
      headers: { "X-HTTP-Method": "MERGE" },
    });
  }

  /** Delete an entity by ObjectID. */
  async delete(entitySet: string, objectId: string): Promise<void> {
    await this.http.delete(`/${entitySet}('${objectId}')`);
  }

  /** Raw OData query for advanced use (any entity set, any params). */
  async rawQuery<T = unknown>(
    entitySet: string,
    params: QueryParams
  ): Promise<ODataListResponse<T>> {
    return this.list<T>(entitySet, params);
  }
}
