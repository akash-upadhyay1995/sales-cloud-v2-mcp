import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { Opportunity } from "../api/types.js";
import { successResult, errorResult, extraFields, type ToolResult } from "../api/types.js";

export const opportunityTools: Tool[] = [
  {
    name: "sc_list_opportunities",
    description:
      "List opportunities from SAP Sales Cloud V2. Supports filtering by prospect account, sales cycle phase, lifecycle status, owner, and revenue end date range.",
    inputSchema: {
      type: "object",
      properties: {
        prospect_id: {
          type: "string",
          description: "Filter by prospect (account) party ID",
        },
        name_filter: {
          type: "string",
          description: "Filter by opportunity name (prefix match)",
        },
        phase_code: {
          type: "string",
          description: "Filter by sales cycle phase code",
        },
        status_code: {
          type: "string",
          description:
            "Filter by lifecycle status code (e.g. '1' = Open, '2' = In Process, '3' = Won, '4' = Lost)",
        },
        owner_id: {
          type: "string",
          description: "Filter by main responsible employee party ID",
        },
        close_date_from: {
          type: "string",
          description:
            "Filter by expected revenue end date >= this value (ISO 8601, e.g. 2025-01-01)",
        },
        close_date_to: {
          type: "string",
          description: "Filter by expected revenue end date <= this value (ISO 8601)",
        },
        top: { type: "number", description: "Max records to return (1–100, default 20)" },
        skip: { type: "number", description: "Records to skip for pagination" },
        select: { type: "string", description: "Comma-separated field names to return" },
        orderby: {
          type: "string",
          description: "Sort expression, e.g. 'ExpectedRevenueEndDate asc'",
        },
      },
    },
  },
  {
    name: "sc_get_opportunity",
    description: "Retrieve a single opportunity by its ObjectID from SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the opportunity" },
        expand: {
          type: "string",
          description:
            "Comma-separated navigation properties to expand (e.g. 'OpportunityItem,OpportunitySalesTeamParty')",
        },
      },
    },
  },
  {
    name: "sc_create_opportunity",
    description: "Create a new opportunity in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Opportunity name (required)" },
        prospect_id: {
          type: "string",
          description: "Prospect (account) party ID",
        },
        phase_code: { type: "string", description: "Initial sales cycle phase code" },
        expected_revenue: { type: "number", description: "Expected revenue amount" },
        currency_code: {
          type: "string",
          description: "Currency code for revenue (e.g. 'EUR', 'USD')",
        },
        close_date: {
          type: "string",
          description:
            "Expected revenue end date (ISO 8601, e.g. 2025-12-31T00:00:00)",
        },
        probability: {
          type: "number",
          description: "Win probability percentage (0–100)",
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
    name: "sc_update_opportunity",
    description:
      "Update an existing opportunity in SAP Sales Cloud V2 (e.g. advance sales phase, update revenue).",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the opportunity to update" },
        name: { type: "string", description: "New opportunity name" },
        phase_code: { type: "string", description: "New sales cycle phase code" },
        status_code: { type: "string", description: "New lifecycle status code" },
        expected_revenue: { type: "number", description: "New expected revenue amount" },
        currency_code: { type: "string", description: "New currency code" },
        close_date: {
          type: "string",
          description: "New expected revenue end date (ISO 8601)",
        },
        probability: { type: "number", description: "New win probability (0–100)" },
        additional_fields: {
          type: "object",
          description: "Additional fields to patch",
          additionalProperties: true,
        },
      },
    },
  },
];

export async function handleOpportunityTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_list_opportunities": {
        const filters: string[] = [];
        if (args.prospect_id)
          filters.push(`ProspectPartyID eq '${args.prospect_id}'`);
        if (args.name_filter)
          filters.push(`startswith(Name,'${args.name_filter}')`);
        if (args.phase_code)
          filters.push(`SalesCyclePhaseCode eq '${args.phase_code}'`);
        if (args.status_code)
          filters.push(`LifeCycleStatusCode eq '${args.status_code}'`);
        if (args.owner_id)
          filters.push(`MainEmployeeResponsiblePartyID eq '${args.owner_id}'`);
        if (args.close_date_from)
          filters.push(`ExpectedRevenueEndDate ge datetime'${args.close_date_from}T00:00:00'`);
        if (args.close_date_to)
          filters.push(`ExpectedRevenueEndDate le datetime'${args.close_date_to}T23:59:59'`);

        const result = await client.list<Opportunity>("OpportunityCollection", {
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
          opportunities: result.value,
        });
      }

      case "sc_get_opportunity": {
        const opp = await client.getById<Opportunity>(
          "OpportunityCollection",
          args.object_id as string,
          { $expand: args.expand as string | undefined }
        );
        return successResult(opp);
      }

      case "sc_create_opportunity": {
        const body: Partial<Opportunity> = {
          Name: args.name as string,
          ...(args.prospect_id ? { ProspectPartyID: args.prospect_id as string } : {}),
          ...(args.phase_code ? { SalesCyclePhaseCode: args.phase_code as string } : {}),
          ...(args.expected_revenue !== undefined && {
            ExpectedRevenueAmount: Number(args.expected_revenue),
          }),
          ...(args.currency_code
            ? { ExpectedRevenueAmountCurrencyCode: args.currency_code as string }
            : {}),
          ...(args.close_date ? { ExpectedRevenueEndDate: args.close_date as string } : {}),
          ...(args.probability !== undefined && {
            ProbabilityPercent: Number(args.probability),
          }),
          ...extraFields(args),
        };
        const created = await client.create<Opportunity>("OpportunityCollection", body);
        return successResult({ message: "Opportunity created", opportunity: created });
      }

      case "sc_update_opportunity": {
        const body: Partial<Opportunity> = {
          ...(args.name ? { Name: args.name as string } : {}),
          ...(args.phase_code ? { SalesCyclePhaseCode: args.phase_code as string } : {}),
          ...(args.status_code ? { LifeCycleStatusCode: args.status_code as string } : {}),
          ...(args.expected_revenue !== undefined && {
            ExpectedRevenueAmount: Number(args.expected_revenue),
          }),
          ...(args.currency_code
            ? { ExpectedRevenueAmountCurrencyCode: args.currency_code as string }
            : {}),
          ...(args.close_date ? { ExpectedRevenueEndDate: args.close_date as string } : {}),
          ...(args.probability !== undefined && {
            ProbabilityPercent: Number(args.probability),
          }),
          ...extraFields(args),
        };
        await client.patch<Opportunity>(
          "OpportunityCollection",
          args.object_id as string,
          body
        );
        return successResult({ message: "Opportunity updated", object_id: args.object_id });
      }

      default:
        return errorResult(`Unknown opportunity tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Opportunity operation failed", err);
  }
}
