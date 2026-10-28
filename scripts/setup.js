#!/usr/bin/env node
/**
 * setup.js — run once after cloning the repo.
 * Registers the MCP server with Claude Code so it shows up as Connected.
 *
 * Usage:  npm run setup
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");
const serverPath = resolve(root, "dist", "index.js");
// Forward slashes work on all platforms including Windows
const serverPathFwd = serverPath.replace(/\\/g, "/");
const envPath = resolve(root, ".env");

const HR = "─".repeat(60);

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", cwd: root, ...opts })
    .toString()
    .trim();
}

console.log(`\n${HR}`);
console.log("  SAP Sales Cloud V2 MCP Server — Setup");
console.log(`${HR}\n`);

// ── 1. Verify build ──────────────────────────────────────────────────────────
if (!existsSync(serverPath)) {
  console.error("✗  dist/index.js not found.");
  console.error("   npm install should have built it automatically.");
  console.error("   If not, run:  npm run build\n");
  process.exit(1);
}
console.log("✓  Build found: dist/index.js");

// ── 2. Verify .env ───────────────────────────────────────────────────────────
if (!existsSync(envPath)) {
  console.log("\n⚠  .env not found.");
  console.log("   Copy .env.example → .env and fill in your credentials:");
  console.log("     SALES_CLOUD_BASE_URL=<your-tenant-url>");
  console.log("     SALES_CLOUD_API_KEY=<your-api-key>\n");
  console.log("   Re-run `npm run setup` once .env is ready.\n");
  process.exit(1);
}
console.log("✓  .env present");

// ── 3. Check claude CLI ──────────────────────────────────────────────────────
let claudeAvailable = false;
try {
  run("claude --version");
  claudeAvailable = true;
} catch {
  /* not installed */
}

if (!claudeAvailable) {
  console.log("\n⚠  `claude` CLI not found — Claude Code is not installed.");
  console.log("   If you are using Claude Desktop, add this to your");
  console.log("   claude_desktop_config.json  (mcpServers section):");
  console.log(`\n     "sales-cloud-v2": {`);
  console.log(`       "command": "node",`);
  console.log(`       "args": ["${serverPathFwd}"]`);
  console.log(`     }\n`);
  process.exit(0);
}

// ── 4. Register the MCP server ───────────────────────────────────────────────
console.log("\nRegistering MCP server with Claude Code...");
try {
  const out = run(`claude mcp add sales-cloud-v2 node "${serverPathFwd}"`);
  console.log("✓ " + (out || "Registered"));
} catch (err) {
  const msg = err.message ?? String(err);
  if (msg.includes("already") || msg.includes("exists")) {
    console.log("✓  Already registered — updating...");
    try {
      run(`claude mcp remove sales-cloud-v2`);
      run(`claude mcp add sales-cloud-v2 node "${serverPathFwd}"`);
      console.log("✓  Updated");
    } catch {
      console.log("   Could not update. Server may already be current.");
    }
  } else {
    console.error("✗  Registration failed:", msg);
    console.error(`   Try manually: claude mcp add sales-cloud-v2 node "${serverPathFwd}"`);
  }
}

// ── 5. Verify connection ─────────────────────────────────────────────────────
console.log("\nVerifying connection...");
try {
  const list = run("claude mcp list");
  const lines = list.split("\n");
  const serverLine = lines.find((l) => l.includes("sales-cloud-v2"));
  if (serverLine) {
    const connected = serverLine.includes("Connected");
    const icon = connected ? "✓" : "⚠";
    console.log(`${icon}  ${serverLine.trim()}`);
    if (!connected) {
      console.log("\n   Server registered but not yet connected.");
      console.log("   Check that SALES_CLOUD_BASE_URL and SALES_CLOUD_API_KEY are");
      console.log("   set correctly in .env, then restart Claude Code.\n");
    }
  } else {
    console.log("   Run `claude mcp list` to check status.");
  }
} catch {
  console.log("   Run `claude mcp list` to check status.");
}

console.log(`\n${HR}`);
console.log("  Setup complete.");
console.log("  Use sc_ping in Claude to verify the Sales Cloud connection.");
console.log(`${HR}\n`);
