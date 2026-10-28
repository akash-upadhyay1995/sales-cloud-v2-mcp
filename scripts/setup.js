#!/usr/bin/env node
/**
 * setup.js — run once after cloning the repo.
 * Registers the MCP server with Claude Code (user scope) so it shows up as Connected.
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

function fail(msg) {
  console.error(`\n✗  ${msg}\n`);
  process.exit(1);
}

console.log(`\n${HR}`);
console.log("  SAP Sales Cloud V2 MCP Server — Setup");
console.log(`${HR}\n`);

// ── 1. Verify / build ────────────────────────────────────────────────────────
if (!existsSync(serverPath)) {
  console.log("   dist/index.js not found — running npm run build...");
  try {
    execSync("npm run build", { stdio: "inherit", cwd: root });
  } catch {
    fail(
      "Build failed. Fix TypeScript errors above, then re-run `npm run setup`."
    );
  }
  if (!existsSync(serverPath)) {
    fail(
      "Build ran but dist/index.js still missing. Check tsconfig.json outDir."
    );
  }
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

// ── 4. Register the MCP server (user scope) ──────────────────────────────────
// -s user avoids the project-path key that local scope uses, which can cause
// the entry to be invisible when claude is launched from a different CWD.
console.log("\nRegistering MCP server with Claude Code (user scope)...");

const addCmd = `claude mcp add -s user sales-cloud-v2 node "${serverPathFwd}"`;

try {
  const out = run(addCmd);
  console.log("✓  " + (out || "Registered"));
} catch (err) {
  const msg = (err.stderr ?? err.message ?? String(err)).toString();
  if (msg.includes("already") || msg.includes("exists")) {
    console.log("   Already registered — re-adding to refresh path...");
    try {
      run("claude mcp remove -s user sales-cloud-v2");
    } catch {
      /* ignore if not present */
    }
    try {
      run(addCmd);
      console.log("✓  Updated");
    } catch (e2) {
      fail(`Re-registration failed: ${e2.message ?? String(e2)}\n   Try manually: ${addCmd}`);
    }
  } else {
    fail(`Registration failed: ${msg}\n   Try manually: ${addCmd}`);
  }
}

// ── 5. Verify it's in the list ───────────────────────────────────────────────
console.log("\nVerifying registration...");
let list = "";
try {
  list = run("claude mcp list");
} catch (err) {
  fail(`Could not run \`claude mcp list\`: ${err.message ?? String(err)}`);
}

const serverLine = list.split("\n").find((l) => l.includes("sales-cloud-v2"));

if (!serverLine) {
  console.error("✗  sales-cloud-v2 is NOT in `claude mcp list` after registration.");
  console.error("   Full output of `claude mcp list`:");
  console.error(list || "  (empty)");
  console.error(`\n   Try manually: ${addCmd}\n`);
  process.exit(1);
}

const connected = serverLine.toLowerCase().includes("connected");
const icon = connected ? "✓" : "⚠";
console.log(`${icon}  ${serverLine.trim()}`);

if (!connected) {
  console.log("\n   Server registered but not yet showing as Connected.");
  console.log("   This is normal on first run — restart Claude Code and");
  console.log("   run sc_ping to confirm the Sales Cloud connection.\n");
}

console.log(`\n${HR}`);
console.log("  Setup complete.");
console.log("  Use sc_ping in Claude to verify the Sales Cloud connection.");
console.log(`${HR}\n`);
