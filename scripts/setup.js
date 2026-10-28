#!/usr/bin/env node
/**
 * setup.js — run once after cloning the repo.
 * Verifies the build and .env, then confirms Claude Code can see the server.
 *
 * Registration is handled by .mcp.json (project scope) — this script does NOT
 * add a duplicate user-scope entry.  If Claude Code hasn't approved .mcp.json
 * yet, the script prints a reminder to do so interactively.
 *
 * Usage:  npm run setup
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");
const serverPath = resolve(root, "dist", "index.js");
const serverPathFwd = serverPath.replace(/\\/g, "/");
const envPath = resolve(root, ".env");
const mcpJsonPath = resolve(root, ".mcp.json");

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
    fail("Build failed. Fix TypeScript errors above, then re-run `npm run setup`.");
  }
  if (!existsSync(serverPath)) {
    fail("Build ran but dist/index.js still missing. Check tsconfig.json outDir.");
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

// ── 4. .mcp.json check ──────────────────────────────────────────────────────
// Registration lives in .mcp.json (project scope).  We never add a user-scope
// duplicate — that would produce the "defined in multiple scopes" conflict.
let mcpJsonDefinesServer = false;
try {
  const mcpJson = JSON.parse(readFileSync(mcpJsonPath, "utf8"));
  mcpJsonDefinesServer = !!(mcpJson?.mcpServers?.["sales-cloud-v2"]);
} catch {
  /* .mcp.json absent or unparseable — fall through */
}

if (mcpJsonDefinesServer) {
  console.log("✓  .mcp.json defines sales-cloud-v2 (project scope)");
} else {
  // .mcp.json missing or empty — fall back to user-scope registration
  console.log("\n   .mcp.json does not define sales-cloud-v2.");
  console.log("   Registering at user scope as fallback...");
  const addCmd = `claude mcp add -s user sales-cloud-v2 node "${serverPathFwd}"`;
  try {
    const out = run(addCmd);
    console.log("✓  " + (out || "Registered (user scope)"));
  } catch (err) {
    const msg = (err.stderr ?? err.message ?? String(err)).toString();
    if (msg.includes("already") || msg.includes("exists")) {
      console.log("   Already registered — skipping.");
    } else {
      fail(`Registration failed: ${msg}\n   Try manually: ${addCmd}`);
    }
  }
}

// ── 5. Check claude mcp list ─────────────────────────────────────────────────
console.log("\nChecking `claude mcp list`...");
let list = "";
try {
  list = run("claude mcp list");
} catch (err) {
  fail(`Could not run \`claude mcp list\`: ${err.message ?? String(err)}`);
}

const serverLine = list.split("\n").find((l) => l.includes("sales-cloud-v2"));

if (!serverLine) {
  if (mcpJsonDefinesServer) {
    console.log("⚠  sales-cloud-v2 is not yet visible in `claude mcp list`.");
    console.log("   Project-scope servers require one-time approval in Claude Code.");
    console.log("   Open Claude Code in this folder, then:");
    console.log("     • Run /mcp and enable sales-cloud-v2, or");
    console.log("     • Accept the approval prompt that appears on startup.");
    console.log("   Then restart Claude Code and run sc_ping.\n");
    process.exit(0); // not an error — just needs interactive approval
  } else {
    fail(
      "sales-cloud-v2 is NOT in `claude mcp list` after registration.\n" +
      "   Full output:\n" + (list || "  (empty)")
    );
  }
}

const connected = serverLine.toLowerCase().includes("connected");
const icon = connected ? "✓" : "⚠";
console.log(`${icon}  ${serverLine.trim()}`);

if (!connected) {
  console.log("\n   Server is registered but not yet showing as Connected.");
  console.log("   Restart Claude Code, then run sc_ping to confirm.\n");
}

console.log(`\n${HR}`);
console.log("  Setup complete.");
console.log("  Use sc_ping in Claude to verify the Sales Cloud connection.");
console.log(`${HR}\n`);
