#!/usr/bin/env node
// Stage 1: scan OSV npm advisories, emit packages that have >=1 vulnerability
// with NO fixed version in any range ("zero fix path").
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OSV_DIR = fileURLToPath(new URL("../data/osv", import.meta.url));
const OUT = fileURLToPath(new URL("../data/nofix-packages.json", import.meta.url));

const files = readdirSync(OSV_DIR).filter((f) => f.startsWith("GHSA-"));
const byPackage = new Map();
let advisories = 0, withdrawn = 0, nofixHits = 0;

for (const f of files) {
  const adv = JSON.parse(readFileSync(join(OSV_DIR, f), "utf8"));
  advisories++;
  if (adv.withdrawn) { withdrawn++; continue; }

  for (const aff of adv.affected ?? []) {
    if (aff.package?.ecosystem !== "npm") continue;
    const ranges = aff.ranges ?? [];
    const hasFix = ranges.some((r) => (r.events ?? []).some((e) => e.fixed !== undefined));
    if (hasFix) continue;

    nofixHits++;
    const name = aff.package.name;
    if (!byPackage.has(name)) byPackage.set(name, { name, vulns: [] });
    byPackage.get(name).vulns.push({
      id: adv.id,
      cves: (adv.aliases ?? []).filter((a) => a.startsWith("CVE-")),
      severity: adv.database_specific?.severity ?? "UNKNOWN",
      cwes: adv.database_specific?.cwe_ids ?? [],
      summary: (adv.summary ?? "").slice(0, 140),
      published: adv.published?.slice(0, 10),
      introduced: ranges[0]?.events?.find((e) => e.introduced !== undefined)?.introduced,
    });
  }
}

const result = [...byPackage.values()].sort((a, b) => b.vulns.length - a.vulns.length);
writeFileSync(OUT, JSON.stringify(result, null, 1));

const sevRank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, UNKNOWN: 0 };
const sevCount = {};
for (const p of result) for (const v of p.vulns) sevCount[v.severity] = (sevCount[v.severity] ?? 0) + 1;
console.log(`advisories scanned: ${advisories} (withdrawn skipped: ${withdrawn})`);
console.log(`no-fix (package,vuln) pairs: ${nofixHits}`);
console.log(`distinct packages with >=1 no-fix vuln: ${result.length}`);
console.log(`severity distribution:`, sevCount);
console.log(`packages with a CRITICAL/HIGH no-fix vuln:`, result.filter((p) => p.vulns.some((v) => sevRank[v.severity] >= 3)).length);
