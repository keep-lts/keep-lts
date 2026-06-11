#!/usr/bin/env node
// Stage 3: for top-ranked candidates, verify each no-fix vuln actually affects
// the LATEST published version (per OSV affected ranges/versions semantics).
// Kills false positives from advisories that only pin old hijacked versions.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import semver from "semver";

const IN = fileURLToPath(new URL("../data/targets-ranked.json", import.meta.url));
const OSV_DIR = fileURLToPath(new URL("../data/osv", import.meta.url));
const OUT = fileURLToPath(new URL("../data/targets-verified.json", import.meta.url));

const targets = JSON.parse(readFileSync(IN, "utf8")).slice(0, 80);
const clean = (v) => semver.valid(semver.coerce(v, { includePrerelease: true })) ?? semver.valid(v);

function latestIsAffected(adv, pkgName, latest) {
  const L = clean(latest);
  if (!L) return { affected: false, reason: "unparseable latest" };
  for (const aff of adv.affected ?? []) {
    if (aff.package?.name !== pkgName || aff.package?.ecosystem !== "npm") continue;
    // explicit version list takes precedence
    if (aff.versions?.length) {
      if (aff.versions.some((v) => clean(v) === L || v === latest)) return { affected: true, reason: "in versions list" };
      continue;
    }
    for (const range of aff.ranges ?? []) {
      if (range.type === "GIT") continue;
      const events = range.events ?? [];
      let affected = false, verdict = false;
      // walk events in given order (OSV requires sorted)
      for (const e of events) {
        if (e.introduced !== undefined) {
          const intro = e.introduced === "0" ? "0.0.0" : clean(e.introduced);
          if (intro && semver.gte(L, intro)) affected = true;
        } else if (e.fixed !== undefined) {
          const fx = clean(e.fixed);
          if (fx && semver.gte(L, fx)) affected = false;
        } else if (e.last_affected !== undefined) {
          const la = clean(e.last_affected);
          if (la && semver.gt(L, la)) affected = false;
        }
      }
      verdict = affected;
      if (verdict) return { affected: true, reason: "in unfixed range" };
    }
  }
  return { affected: false, reason: "latest outside affected ranges" };
}

const verified = [];
for (const t of targets) {
  const liveVulns = [];
  for (const v of t.vulns) {
    let adv;
    try { adv = JSON.parse(readFileSync(`${OSV_DIR}/${v.id}.json`, "utf8")); } catch { continue; }
    const res = latestIsAffected(adv, t.name, t.latestVersion);
    if (res.affected) liveVulns.push({ ...v, verify: res.reason });
  }
  if (!liveVulns.length) continue;
  const sevW = { CRITICAL: 4, HIGH: 3, MODERATE: 1.5, LOW: 0.5, UNKNOWN: 1 };
  const maxSev = Math.max(...liveVulns.map((v) => sevW[v.severity] ?? 1));
  verified.push({
    ...t,
    vulns: liveVulns,
    droppedVulns: t.vulns.length - liveVulns.length,
    maxSeverity: Object.entries(sevW).find(([, w]) => w === maxSev)?.[0],
    score: Math.round(Math.log10(Math.max(t.weeklyDownloads, 10)) * maxSev * Math.max(Math.min(t.yearsSincePublish ?? 0, 6), 0.25) * 10) / 10,
  });
}
verified.sort((a, b) => b.score - a.score);
writeFileSync(OUT, JSON.stringify(verified, null, 1));

console.log(`verified targets (latest version actually vulnerable): ${verified.length} of ${targets.length} checked\n`);
console.log(`=== TOP 20 VERIFIED ===`);
for (const e of verified.slice(0, 20)) {
  const cves = e.vulns.flatMap((v) => v.cves).slice(0, 3).join(",") || e.vulns[0].id;
  console.log(
    `${e.score.toString().padStart(6)}  ${e.name.padEnd(28)} ${String(e.weeklyDownloads).padStart(11)}/wk  ${e.maxSeverity.padEnd(8)} live:${e.vulns.length} dropped:${e.droppedVulns}  pub:${e.lastPublish}  ${cves}`
  );
}
