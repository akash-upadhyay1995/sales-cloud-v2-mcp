/**
 * End-to-end connection test — runs 4 scenario rounds against the live API.
 * Usage: node --env-file=.env dist/test-e2e.js
 */
import { loadConfig } from "./config.js";
import { SalesCloudClient } from "./api/client.js";

const SEP = "─".repeat(70);

function printHeader(round: number, label: string) {
  console.log(`\n${SEP}`);
  console.log(`  ROUND ${round}: ${label}`);
  console.log(SEP);
}

function ok(label: string, data: unknown) {
  console.log(`  ✓  ${label}`);
  console.log(JSON.stringify(data, null, 2)
    .split("\n")
    .map(l => `     ${l}`)
    .join("\n"));
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`  ✗  ${label}`);
  console.log(`     ${msg}`);
}

async function main() {
  console.log(`\n${"═".repeat(70)}`);
  console.log("  SAP Sales Cloud V2 — End-to-End Connection Tests");
  console.log(`${"═".repeat(70)}`);

  const config = loadConfig();
  console.log(`\n  Tenant : ${config.salesCloudBaseUrl}`);
  console.log(`  Path   : ${config.odataBasePath}`);
  console.log(`  Auth   : ${config.salesCloudApiKeyHeader} header`);

  const client = new SalesCloudClient(config);

  // ── Round 1: Ping / connectivity ───────────────────────────────────────────
  printHeader(1, "Connectivity & Ping — CorporateAccountCollection (1 record)");
  try {
    const res = await client.list("CorporateAccountCollection", {
      $top: 1,
      $select: "ObjectID,Name,LifeCycleStatusCode,CountryCode",
      $count: true,
    });
    ok(`GET CorporateAccountCollection?$top=1 → HTTP 200`, {
      total_accounts: res["@odata.count"],
      sample: res.value[0] ?? "(no records)",
    });
  } catch (err) {
    fail("Connectivity ping failed", err);
  }

  // ── Round 2: List Accounts — top 5 sorted by name ──────────────────────────
  printHeader(2, "List Accounts — top 5 sorted by name");
  try {
    const res = await client.list("CorporateAccountCollection", {
      $top: 5,
      $select: "ObjectID,Name,LifeCycleStatusCode,IndustrialSectorCode,CountryCode",
      $orderby: "Name asc",
      $count: true,
    });
    ok(`Total accounts in tenant: ${res["@odata.count"] ?? "unknown"}`, {
      returned: res.value.length,
      accounts: res.value,
    });
  } catch (err) {
    fail("List accounts failed", err);
  }

  // ── Round 3: List Opportunities — top 5 in-process ─────────────────────────
  printHeader(3, "List Opportunities — top 5 in-process (LifeCycleStatusCode=2)");
  try {
    const res = await client.list("OpportunityCollection", {
      $top: 5,
      $select: "ObjectID,Name,ProspectPartyName,SalesCyclePhaseCodeText,ExpectedRevenueAmount,ExpectedRevenueAmountCurrencyCode,LifeCycleStatusCodeText",
      $filter: "LifeCycleStatusCode eq '2'",
      $orderby: "Name asc",
      $count: true,
    });
    ok(`Total in-process opportunities: ${res["@odata.count"] ?? "unknown"}`, {
      returned: res.value.length,
      opportunities: res.value,
    });
  } catch (err) {
    fail("List opportunities failed", err);
  }

  // ── Round 4: Cross-entity — leads + contacts for first account ─────────────
  printHeader(4, "Cross-entity — Leads and Contacts for the first account");
  try {
    const acctRes = await client.list("CorporateAccountCollection", {
      $top: 1,
      $select: "ObjectID,AccountID,Name",
    });
    const account = acctRes.value[0] as Record<string, unknown>;
    if (!account) throw new Error("No accounts found");

    console.log(`  ℹ  Using account: ${account.Name} (AccountID: ${account.AccountID})`);

    const [leads, contacts] = await Promise.all([
      client.list("LeadCollection", {
        $top: 3,
        $select: "ObjectID,Name,LifeCycleStatusCode,QualificationLevelCode",
        $filter: `AccountPartyID eq '${account.AccountID}'`,
        $count: true,
      }),
      client.list("ContactCollection", {
        $top: 3,
        $select: "ObjectID,FirstName,LastName,Email,Phone,StatusCode",
        $filter: `AccountID eq '${account.AccountID}'`,
        $count: true,
      }),
    ]);

    ok(`Leads for account (total: ${leads["@odata.count"] ?? "?"})`, leads.value);
    ok(`Contacts for account (total: ${contacts["@odata.count"] ?? "?"})`, contacts.value);
  } catch (err) {
    fail("Cross-entity query failed", err);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  Tests complete. Review results above.");
  console.log(`${"═".repeat(70)}\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\nFatal: ${msg}`);
  process.exit(1);
});
