import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import { successResult, errorResult, type ToolResult } from "../api/types.js";
import type { Account } from "../api/types.js";

export const pingTools: Tool[] = [
  {
    name: "sc_ping",
    description:
      "Test the connection to SAP Sales Cloud V2. Makes a lightweight API call to verify the configured base URL and API key are valid and the service is reachable.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handlePingTool(
  _toolName: string,
  _args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    const result = await client.list<Account>("CorporateAccountCollection", {
      $top: 1,
      $select: "ObjectID",
      $count: true,
    });

    return successResult({
      status: "connected",
      message: "SAP Sales Cloud V2 connection is healthy",
      account_count: result["@odata.count"],
      sample_id: result.value[0]?.ObjectID ?? null,
    });
  } catch (err) {
    return errorResult("Connection test failed", err);
  }
}
