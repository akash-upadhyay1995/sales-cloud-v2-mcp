import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { Lead } from "../api/types.js";
import { successResult, errorResult, extraFields, type ToolResult } from "../api/types.js";

export const leadTools: Tool[] = [
  {
    name: "sc_list_leads",
    description:
      "List leads from SAP Sales Cloud V2. Supports filtering by lifecycle status, qualification level, origin type, and account.",
    inputSchema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "Filter by associated account party ID",
        },
        name_filter: {
          type: "string",
          description: "Filter by lead name (prefix match)",
        },
        status_code: {
          type: "string",
          description:
            "Filter by lifecycle status code (e.g. '1' = Open, '2' = Qualified, '6' = Declined)",
        },
        qualification_level: {
          type: "string",
          description: "Filter by qualification level code",
        },
        origin_type: {
          type: "string",
          description: "Filter by origin type code (e.g. '001' = Trade Show, '003' = Campaign)",
        },
        top: { type: "number", description: "Max records to return (1–100, default 20)" },
        skip: { type: "number", description: "Records to skip for pagination" },
        select: { type: "string", description: "Comma-separated field names to return" },
        orderby: {
          type: "string",
          description: "Sort expression, e.g. 'CreationDateTime desc'",
        },
      },
    },
  },
  {
    name: "sc_get_lead",
    description: "Retrieve a single lead by its ObjectID from SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the lead" },
        expand: {
          type: "string",
          description: "Comma-separated navigation properties to expand",
        },
      },
    },
  },
  {
    name: "sc_create_lead",
    description: "Create a new lead in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Lead name/topic (required)" },
        account_id: {
          type: "string",
          description: "Associated account party ID",
        },
        origin_type: {
          type: "string",
          description: "Origin type code (e.g. '001' = Trade Show, '003' = Campaign)",
        },
        qualification_level: {
          type: "string",
          description: "Qualification level code",
        },
        additional_fields: {
          type: "object",
          description: "Additional SAP field key-value pairs",
          additionalProperties: true,
        },
      },
    },
  },
  {
    name: "sc_update_lead",
    description:
      "Update an existing lead in SAP Sales Cloud V2 (e.g. change status or qualification level).",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the lead to update" },
        name: { type: "string", description: "New lead name" },
        status_code: { type: "string", description: "New lifecycle status code" },
        qualification_level: { type: "string", description: "New qualification level code" },
        account_id: { type: "string", description: "New associated account party ID" },
        additional_fields: {
          type: "object",
          description: "Additional fields to patch",
          additionalProperties: true,
        },
      },
    },
  },
];

export async function handleLeadTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_list_leads": {
        const filters: string[] = [];
        if (args.account_id)
          filters.push(`AccountPartyID eq '${args.account_id}'`);
        if (args.name_filter)
          filters.push(`startswith(Name,'${args.name_filter}')`);
        if (args.status_code)
          filters.push(`LifeCycleStatusCode eq '${args.status_code}'`);
        if (args.qualification_level)
          filters.push(`QualificationLevelCode eq '${args.qualification_level}'`);
        if (args.origin_type)
          filters.push(`OriginTypeCode eq '${args.origin_type}'`);

        const result = await client.list<Lead>("LeadCollection", {
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
          leads: result.value,
        });
      }

      case "sc_get_lead": {
        const lead = await client.getById<Lead>(
          "LeadCollection",
          args.object_id as string,
          { $expand: args.expand as string | undefined }
        );
        return successResult(lead);
      }

      case "sc_create_lead": {
        const body: Partial<Lead> = {
          Name: args.name as string,
          ...(args.account_id ? { AccountPartyID: args.account_id as string } : {}),
          ...(args.origin_type ? { OriginTypeCode: args.origin_type as string } : {}),
          ...(args.qualification_level
            ? { QualificationLevelCode: args.qualification_level as string }
            : {}),
          ...extraFields(args),
        };
        const created = await client.create<Lead>("LeadCollection", body);
        return successResult({ message: "Lead created", lead: created });
      }

      case "sc_update_lead": {
        const body: Partial<Lead> = {
          ...(args.name ? { Name: args.name as string } : {}),
          ...(args.status_code ? { LifeCycleStatusCode: args.status_code as string } : {}),
          ...(args.qualification_level
            ? { QualificationLevelCode: args.qualification_level as string }
            : {}),
          ...(args.account_id ? { AccountPartyID: args.account_id as string } : {}),
          ...extraFields(args),
        };
        await client.patch<Lead>("LeadCollection", args.object_id as string, body);
        return successResult({ message: "Lead updated", object_id: args.object_id });
      }

      default:
        return errorResult(`Unknown lead tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Lead operation failed", err);
  }
}
