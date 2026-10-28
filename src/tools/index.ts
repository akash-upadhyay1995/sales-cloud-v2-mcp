import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { ToolResult } from "../api/types.js";
import { accountTools, handleAccountTool } from "./accounts.js";
import { opportunityTools, handleOpportunityTool } from "./opportunities.js";
import { leadTools, handleLeadTool } from "./leads.js";
import { contactTools, handleContactTool } from "./contacts.js";
import { activityTools, handleActivityTool } from "./activities.js";
import { genericTools, handleGenericTool } from "./generic.js";
import { pingTools, handlePingTool } from "./ping.js";

// All tools registered with the MCP server
const allTools: Tool[] = [
  ...accountTools,
  ...opportunityTools,
  ...leadTools,
  ...contactTools,
  ...activityTools,
  ...genericTools,
  ...pingTools,
];

// Routing map: tool name prefix → handler
const handlerMap: Record<
  string,
  (
    name: string,
    args: Record<string, unknown>,
    client: SalesCloudClient
  ) => Promise<ToolResult>
> = {
  sc_list_accounts: handleAccountTool,
  sc_get_account: handleAccountTool,
  sc_create_account: handleAccountTool,
  sc_update_account: handleAccountTool,

  sc_list_opportunities: handleOpportunityTool,
  sc_get_opportunity: handleOpportunityTool,
  sc_create_opportunity: handleOpportunityTool,
  sc_update_opportunity: handleOpportunityTool,

  sc_list_leads: handleLeadTool,
  sc_get_lead: handleLeadTool,
  sc_create_lead: handleLeadTool,
  sc_update_lead: handleLeadTool,

  sc_list_contacts: handleContactTool,
  sc_get_contact: handleContactTool,
  sc_create_contact: handleContactTool,
  sc_update_contact: handleContactTool,

  sc_list_activities: handleActivityTool,
  sc_get_activity: handleActivityTool,
  sc_create_activity: handleActivityTool,
  sc_update_activity: handleActivityTool,

  sc_odata_query: handleGenericTool,
  sc_get_entity: handleGenericTool,

  sc_ping: handlePingTool,
};

export function getAllToolDefinitions(): Tool[] {
  return allTools;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  const handler = handlerMap[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: "${name}"` }],
      isError: true,
    };
  }
  return handler(name, args, client);
}
