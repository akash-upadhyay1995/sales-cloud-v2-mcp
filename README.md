# SAP Sales Cloud V2 — MCP Server

Connect Claude directly to your SAP Sales Cloud V2 CRM data via the [Model Context Protocol](https://modelcontextprotocol.io).

---

## Getting Started (3 steps)

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd sales-cloud-v2-mcp
npm install          # installs dependencies and auto-builds dist/
```

### Step 2 — Configure your credentials

```bash
cp .env.example .env
```

Open `.env` and fill in the two required values:

```env
SALES_CLOUD_BASE_URL=https://your-tenant.crm.cloud.sap
SALES_CLOUD_API_KEY=your-api-key-here
```

> **.env is the only place credentials go.** It is gitignored and stays on your machine.  
> No other config file should ever contain your URL or API key.

### Step 3 — Register with Claude Code

```bash
npm run setup
```

This registers the MCP server with Claude Code and confirms it is **Connected**. You should see:

```
✓  Build found: dist/index.js
✓  .env present
✓  Registered
✓  sales-cloud-v2: node /absolute/path/dist/index.js - ✔ Connected
```

**That's it.** The server is now live. Use `sc_ping` in Claude to verify the Sales Cloud connection.

---

## Verify at any time

```bash
claude mcp list
```

```
sales-cloud-v2: node .../dist/index.js - ✔ Connected
```

---

## Credentials reference

All settings go in `.env`. Copy `.env.example` to get the template.

| Variable | Required | Description |
|---|---|---|
| `SALES_CLOUD_BASE_URL` | ✓ | Base URL of your SAP Sales Cloud V2 tenant |
| `SALES_CLOUD_API_KEY` | ✓ | API key from Settings > API Keys in your tenant |
| `SALES_CLOUD_API_KEY_HEADER` | — | Header name (default: `APIKey`) |
| `ODATA_BASE_PATH` | — | OData path (default: `/sap/c4c/odata/v1/c4codataapi`) |
| `REQUEST_TIMEOUT_MS` | — | HTTP timeout ms (default: `30000`) |
| `MAX_RETRIES` | — | Retry count (default: `3`) |

---

## Available Tools (23)

### Connection
| Tool | Description |
|---|---|
| `sc_ping` | Test connectivity and confirm credentials work |

### Accounts (`CorporateAccountCollection`)
| Tool | Description |
|---|---|
| `sc_list_accounts` | List accounts with filters (name, status, industry, country) |
| `sc_get_account` | Get account by ObjectID |
| `sc_create_account` | Create a new account |
| `sc_update_account` | Update fields on an existing account |

### Opportunities
| Tool | Description |
|---|---|
| `sc_list_opportunities` | List opportunities (filter by phase, status, prospect, owner) |
| `sc_get_opportunity` | Get opportunity by ObjectID |
| `sc_create_opportunity` | Create a new opportunity |
| `sc_update_opportunity` | Update phase, revenue, status etc. |

### Leads
| Tool | Description |
|---|---|
| `sc_list_leads` | List leads (filter by status, qualification level, origin) |
| `sc_get_lead` | Get lead by ObjectID |
| `sc_create_lead` | Create a new lead |
| `sc_update_lead` | Update status or qualification |

### Contacts
| Tool | Description |
|---|---|
| `sc_list_contacts` | List contacts (filter by name, account, email, status) |
| `sc_get_contact` | Get contact by ObjectID |
| `sc_create_contact` | Create a new contact |
| `sc_update_contact` | Update contact fields |

### Activities
| Tool | Description |
|---|---|
| `sc_list_activities` | List activities (filter by type, status, subject, date) |
| `sc_get_activity` | Get activity by ObjectID |
| `sc_create_activity` | Create a task / appointment / phone call |
| `sc_update_activity` | Update status, subject etc. |

### Generic / Advanced
| Tool | Description |
|---|---|
| `sc_odata_query` | Raw OData query against any entity set |
| `sc_get_entity` | Get any entity by ObjectID |

---

## Claude Desktop (alternative to Claude Code)

If your team uses Claude Desktop instead of Claude Code, add this to  
`%APPDATA%\Claude\claude_desktop_config.json` (Windows) or  
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "sales-cloud-v2": {
      "command": "node",
      "args": ["C:/absolute/path/to/sales-cloud-v2-mcp/dist/index.js"]
    }
  }
}
```

Credentials are **not** set here — they come from `.env` in the project root.

---

## Development

```bash
npm run dev        # run without building (uses tsx)
npm run typecheck  # type-check without emitting
npm run build      # rebuild dist/
npm run clean      # remove dist/
```

---

## SAP BTP Cloud Foundry Deployment

When hosting the MCP server on BTP, set four additional variables (see `.env.example`) to enable OAuth2 `client_credentials` flow. Then deploy with:

```bash
npm run build
cf push          # uses manifest.yml
cf set-env sales-cloud-v2-mcp SALES_CLOUD_BASE_URL <value>
cf set-env sales-cloud-v2-mcp SALES_CLOUD_API_KEY  <value>
cf restage sales-cloud-v2-mcp
```

---

## Project Structure

```
sales-cloud-v2-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config.ts             # Env var loading (.env → Config)
│   ├── api/
│   │   ├── auth.ts           # API key & OAuth2 helpers
│   │   ├── client.ts         # OData HTTP client (v2 normalisation)
│   │   └── types.ts          # TypeScript interfaces & result helpers
│   └── tools/
│       ├── accounts.ts       # Account tools
│       ├── activities.ts     # Activity tools
│       ├── contacts.ts       # Contact tools
│       ├── generic.ts        # Raw OData query tools
│       ├── index.ts          # Tool registry
│       ├── leads.ts          # Lead tools
│       ├── opportunities.ts  # Opportunity tools
│       └── ping.ts           # Connection test tool
├── scripts/
│   └── setup.js              # One-time Claude Code registration script
├── .env.example              # Credential template — copy to .env
├── .mcp.json                 # Claude Code project config (no credentials)
├── manifest.yml              # SAP BTP Cloud Foundry deployment manifest
├── mcp.json                  # MCP server manifest & Claude Desktop snippet
├── package.json
└── tsconfig.json
```

---

## License

MIT
