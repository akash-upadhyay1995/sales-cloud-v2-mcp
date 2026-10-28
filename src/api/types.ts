// ── OData v4 standard response envelopes ──────────────────────────────────────

export interface ODataListResponse<T> {
  "@odata.context"?: string;
  "@odata.count"?: number;
  value: T[];
  "odata.nextLink"?: string;
}

// ── Common SAP entity base ────────────────────────────────────────────────────

export interface SAPEntity {
  ObjectID: string;
  ETag?: string;
  LastChangeDateTime?: string;
  CreationDateTime?: string;
}

// ── Domain entities ───────────────────────────────────────────────────────────

export interface Account extends SAPEntity {
  /** Displayed name — field is "Name" in CorporateAccountCollection */
  Name?: string;
  AccountID?: string;
  IndustrialSectorCode?: string;
  LifeCycleStatusCode?: string;
  CountryCode?: string;
  [key: string]: unknown;
}

export interface Opportunity extends SAPEntity {
  Name?: string;
  /** Prospect (account) party ID */
  ProspectPartyID?: string;
  ProspectPartyName?: string;
  SalesCyclePhaseCode?: string;
  SalesCyclePhaseCodeText?: string;
  ExpectedRevenueAmount?: number | string;
  ExpectedRevenueAmountCurrencyCode?: string;
  /** Expected revenue end date — closest field to "close date" */
  ExpectedRevenueEndDate?: string;
  /** Owner = main responsible employee */
  MainEmployeeResponsiblePartyID?: string;
  MainEmployeeResponsiblePartyName?: string;
  ProbabilityPercent?: number | string;
  LifeCycleStatusCode?: string;
  LifeCycleStatusCodeText?: string;
  [key: string]: unknown;
}

export interface Lead extends SAPEntity {
  Name?: string;
  AccountPartyID?: string;
  AccountPartyName?: string;
  LifeCycleStatusCode?: string;
  QualificationLevelCode?: string;
  OriginTypeCode?: string;
  [key: string]: unknown;
}

export interface Contact extends SAPEntity {
  FirstName?: string;
  LastName?: string;
  Name?: string;
  AccountID?: string;
  AccountFormattedName?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  JobTitle?: string;
  FunctionCode?: string;
  DepartmentCode?: string;
  StatusCode?: string;
  [key: string]: unknown;
}

export interface Activity extends SAPEntity {
  /** SAP field is SubjectName in ActivityCollection */
  SubjectName?: string;
  ProcessingTypeCode?: string;
  LifeCycleStatusCode?: string;
  ReportedDate?: string;
  [key: string]: unknown;
}

// ── OData query parameters ────────────────────────────────────────────────────

export interface QueryParams {
  $filter?: string;
  $top?: number;
  $skip?: number;
  $orderby?: string;
  $select?: string;
  $expand?: string;
  $count?: boolean;
}

// ── MCP tool response helpers ─────────────────────────────────────────────────

// Align with the SDK's CallToolResult shape
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  // Allow extra SDK fields (e.g. _meta) without breaking our helpers
  [key: string]: unknown;
}

export function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(message: string, cause?: unknown): ToolResult {
  const detail = cause instanceof Error ? `: ${cause.message}` : "";
  return {
    content: [{ type: "text", text: `Error: ${message}${detail}` }],
    isError: true,
  };
}

/** Safely spread additional_fields — returns empty object when value is absent. */
export function extraFields(
  args: Record<string, unknown>
): Record<string, unknown> {
  const f = args.additional_fields;
  return f && typeof f === "object" && !Array.isArray(f)
    ? (f as Record<string, unknown>)
    : {};
}
