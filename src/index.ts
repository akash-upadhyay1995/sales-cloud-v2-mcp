import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./config.js";
import { SalesCloudClient } from "./api/client.js";
import { getAllToolDefinitions, handleToolCall } from "./tools/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new SalesCloudClient(config);

  const server = new Server(
    { name: "sales-cloud-v2-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getAllToolDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await handleToolCall(
      name,
      (args ?? {}) as Record<string, unknown>,
      client
    );
    // ToolResult is structurally compatible with CallToolResult at runtime;
    // the cast is necessary because the SDK union includes SDK-internal task shapes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `SAP Sales Cloud V2 MCP Server running (${config.salesCloudBaseUrl})\n`
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
