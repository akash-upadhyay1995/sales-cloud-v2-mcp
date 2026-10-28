import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { Account } from "../api/types.js";
import { successResult, errorResult, extraFields, type ToolResult } from "../api/types.js";

// Entity set name in this SAP C4C sandbox
const ENTITY = "CorporateAccountCollection";

export const accountTools: Tool[] = [
  {
    name: "sc_list_accounts",
    description:
      "List corporate accounts from SAP Sales Cloud V2. Returns a paginated list with total count. Supports filtering by name, lifecycle status, industry sector, and country.",
    inputSchema: {
      type: "object",
      properties: {
        name_filter: {
          type: "string",
          description: "Filter by account name (prefix match, case-sensitive)",
        },
        status: {
          type: "string",
          description: "Lifecycle status code: '1' = Active, '2' = Blocked, '4' = Prospect",
        },
        industry: {
          type: "string",
          description: "Industrial sector code (e.g. '44' = IT, 'BK' = Banking)",
        },
        country: {
          type: "string",
          description: "ISO 2-letter country code (e.g. 'DE', 'US', 'IN')",
        },
        top: {
          type: "number",
          description: "Max records to return (1–100, default 20)",
        },
        skip: {
          type: "number",
          description: "Records to skip for pagination (default 0)",
        },
        select: {
          type: "string",
          description: "Comma-separated field names to return (reduces payload size)",
        },
        orderby: {
          type: "string",
          description: "Sort expression, e.g. 'Name asc'",
        },
      },
    },
  },
  {
    name: "sc_get_account",
    description:
      "Retrieve a single corporate account by its ObjectID from SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: {
          type: "string",
          description: "ObjectID of the account",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated navigation properties to expand (e.g. 'CorporateAccountTeam,CorporateAccountAddress')",
        },
      },
    },
  },
  {
    name: "sc_create_account",
    description: "Create a new corporate account in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Account name (required)" },
        industry_code: { type: "string", description: "Industrial sector code" },
        country_code: { type: "string", description: "ISO 2-letter country code" },
        additional_fields: {
          type: "object",
          description: "Any additional SAP field key-value pairs",
          additionalProperties: true,
        },
      },
    },
  },
  {
    name: "sc_update_account",
    description: "Update fields on an existing corporate account in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: {
          type: "string",
          description: "ObjectID of the account to update",
        },
        name: { type: "string", description: "New account name" },
        industry_code: { type: "string", description: "New industrial sector code" },
        country_code: { type: "string", description: "New country code" },
        status_code: {
          type: "string",
          description: "New lifecycle status code",
        },
        additional_fields: {
          type: "object",
          description: "Additional fields to patch",
          additionalProperties: true,
        },
      },
    },
  },
];

export async function handleAccountTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_list_accounts": {
        const filters: string[] = [];
        if (args.name_filter)
          filters.push(`startswith(Name,'${args.name_filter}')`);
        if (args.status)
          filters.push(`LifeCycleStatusCode eq '${args.status}'`);
        if (args.industry)
          filters.push(`IndustrialSectorCode eq '${args.industry}'`);
        if (args.country)
          filters.push(`CountryCode eq '${args.country}'`);

        const result = await client.list<Account>(ENTITY, {
          $filter: filters.length ? filters.join(" and ") : undefined,
          $top: Math.min(Number(args.top ?? 20), 100),
          $skip: args.skip ? Number(args.skip) : undefined,
          $select: args.select as string | undefined,
          $orderby: args.orderby as string | undefined,
          $count: true,
        });

        return successResult({
          total: result["@odata.count"],
          returned: result.value.length,
          accounts: result.value,
        });
      }

      case "sc_get_account": {
        const account = await client.getById<Account>(
          ENTITY,
          args.object_id as string,
          { $expand: args.expand as string | undefined }
        );
        return successResult(account);
      }

      case "sc_create_account": {
        const body: Partial<Account> = {
          Name: args.name as string,
          ...(args.industry_code ? { IndustrialSectorCode: args.industry_code as string } : {}),
          ...(args.country_code ? { CountryCode: args.country_code as string } : {}),
          ...extraFields(args),
        };
        const created = await client.create<Account>(ENTITY, body);
        return successResult({ message: "Account created", account: created });
      }

      case "sc_update_account": {
        const body: Partial<Account> = {
          ...(args.name ? { Name: args.name as string } : {}),
          ...(args.industry_code ? { IndustrialSectorCode: args.industry_code as string } : {}),
          ...(args.country_code ? { CountryCode: args.country_code as string } : {}),
          ...(args.status_code ? { LifeCycleStatusCode: args.status_code as string } : {}),
          ...extraFields(args),
        };
        await client.patch<Account>(ENTITY, args.object_id as string, body);
        return successResult({
          message: "Account updated",
          object_id: args.object_id,
        });
      }

      default:
        return errorResult(`Unknown account tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Account operation failed", err);
  }
}
