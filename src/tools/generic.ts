import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import { successResult, errorResult, type ToolResult } from "../api/types.js";

export const genericTools: Tool[] = [
  {
    name: "sc_odata_query",
    description:
      "Execute a raw OData v4 query against any SAP Sales Cloud V2 entity set. Use this for advanced queries not covered by the specific entity tools. All standard OData query options are supported.",
    inputSchema: {
      type: "object",
      required: ["entity_set"],
      properties: {
        entity_set: {
          type: "string",
          description:
            "OData entity set name, e.g. 'AccountCollection', 'OpportunityCollection', 'ProductCollection'",
        },
        filter: {
          type: "string",
          description:
            "OData $filter expression, e.g. \"AccountName eq 'Acme' and CountryCode eq 'DE'\"",
        },
        select: {
          type: "string",
          description:
            "Comma-separated list of fields to return, e.g. 'ObjectID,AccountName,Email'",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated navigation properties to expand, e.g. 'AccountTeam,ContactCollection'",
        },
        orderby: {
          type: "string",
          description:
            "Sort expression, e.g. 'AccountName asc' or 'CreationDateTime desc'",
        },
        top: {
          type: "number",
          description: "Max records to return (default 20, max 100)",
        },
        skip: {
          type: "number",
          description: "Number of records to skip for pagination",
        },
      },
    },
  },
  {
    name: "sc_get_entity",
    description:
      "Retrieve a single entity by ObjectID from any SAP Sales Cloud V2 entity set. Use when you know the exact entity type and ID.",
    inputSchema: {
      type: "object",
      required: ["entity_set", "object_id"],
      properties: {
        entity_set: {
          type: "string",
          description: "OData entity set name, e.g. 'ProductCollection'",
        },
        object_id: {
          type: "string",
          description: "ObjectID of the entity to retrieve",
        },
        select: {
          type: "string",
          description: "Comma-separated fields to return",
        },
        expand: {
          type: "string",
          description: "Comma-separated navigation properties to expand",
        },
      },
    },
  },
];

export async function handleGenericTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_odata_query": {
        const result = await client.rawQuery(args.entity_set as string, {
          $filter: args.filter as string | undefined,
          $select: args.select as string | undefined,
          $expand: args.expand as string | undefined,
          $orderby: args.orderby as string | undefined,
          $top: Math.min(Number(args.top ?? 20), 100),
          $skip: args.skip ? Number(args.skip) : undefined,
          $count: true,
        });
        return successResult({
          entity_set: args.entity_set,
          total: result["@odata.count"],
          returned: result.value.length,
          value: result.value,
        });
      }

      case "sc_get_entity": {
        const entity = await client.getById<unknown>(
          args.entity_set as string,
          args.object_id as string,
          {
            $select: args.select as string | undefined,
            $expand: args.expand as string | undefined,
          }
        );
        return successResult(entity);
      }

      default:
        return errorResult(`Unknown generic tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Query failed", err);
  }
}
