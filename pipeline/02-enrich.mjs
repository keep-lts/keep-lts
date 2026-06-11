#!/usr/bin/env node
// Stage 2: enrich no-fix packages with npm downloads + registry metadata, rank targets.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const IN = fileURLToPath(new URL("../data/nofix-packages.json", import.meta.url));
const OUT = fileURLToPath(new URL("../data/targets-ranked.json", import.meta.url));
const pkgs = JSON.parse(readFileSync(IN, "utf8"));

const MIN_WEEKLY_DOWNLOADS = 10_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 2) { console.error(`FAIL ${url}: ${e.message}`); return null; }
      await sleep(500 * (attempt + 1));
    }
  }
}

// --- downloads: bulk endpoint for unscoped (128/call), individual for scoped ---
const downloads = new Map();
const unscoped = pkgs.filter((p) => !p.name.startsWith("@")).map((p) => p.name);
const scoped = pkgs.filter((p) => p.name.startsWith("@")).map((p) => p.name);

for (let i = 0; i < unscoped.length; i += 128) {
  const batch = unscoped.slice(i, i + 128);
  const data = await getJSON(`https://api.npmjs.org/downloads/point/last-week/${batch.join(",")}`);
  if (data) {
    if (batch.length === 1) downloads.set(batch[0], data.downloads ?? 0);
    else for (const [name, rec] of Object.entries(data)) downloads.set(name, rec?.downloads ?? 0);
  }
  process.stderr.write(`\rdownloads: ${Math.min(i + 128, unscoped.length)}/${unscoped.length} unscoped`);
  await sleep(150);
}
for (let i = 0; i < scoped.length; i++) {
  const data = await getJSON(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(scoped[i])}`);
  downloads.set(scoped[i], data?.downloads ?? 0);
  if (i % 20 === 0) process.stderr.write(`\rdownloads: ${i}/${scoped.length} scoped          `);
  await sleep(100);
}
console.error(`\ndownloads fetched for ${downloads.size} packages`);

// --- registry metadata only for packages above the demand floor ---
const candidates = pkgs.filter((p) => (downloads.get(p.name) ?? 0) >= MIN_WEEKLY_DOWNLOADS);
console.error(`candidates >= ${MIN_WEEKLY_DOWNLOADS}/wk: ${candidates.length}`);

const enriched = [];
let done = 0;
async function enrichOne(p) {
  const doc = await getJSON(`https://registry.npmjs.org/${encodeURIComponent(p.name).replace("%40", "@")}`);
  done++;
  if (done % 25 === 0) process.stderr.write(`\rregistry: ${done}/${candidates.length}`);
  if (!doc) return;
  const latestVer = doc["dist-tags"]?.latest;
  const latest = doc.versions?.[latestVer] ?? {};
  const lastPublish = doc.time?.[latestVer] ?? doc.time?.modified;
  const license = typeof latest.license === "object" ? latest.license?.type : latest.license;
  enriched.push({
    name: p.name,
    weeklyDownloads: downloads.get(p.name) ?? 0,
    latestVersion: latestVer,
    lastPublish: lastPublish?.slice(0, 10),
    yearsSincePublish: lastPublish ? (Date.now() - Date.parse(lastPublish)) / 3.156e10 : null,
    deprecated: latest.deprecated !== undefined,
    license: license ?? "UNKNOWN",
    repository: (typeof latest.repository === "object" ? latest.repository?.url : latest.repository) ?? null,
    maintainers: (doc.maintainers ?? []).length,
    vulns: p.vulns,
  });
}
const queue = [...candidates];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) { const p = queue.shift(); await enrichOne(p); await sleep(50); }
}));
console.error(`\nenriched: ${enriched.length}`);

// --- scoring ---
const sevW = { CRITICAL: 4, HIGH: 3, MODERATE: 1.5, LOW: 0.5, UNKNOWN: 1 };
const PERMISSIVE = /^(MIT|ISC|BSD-[23]-Clause|Apache-2\.0|0BSD|Unlicense|CC0-1\.0)$/i;
// CWEs that are typically small, surgical patches
const EASY_CWE = new Set(["CWE-1333", "CWE-400", "CWE-1321", "CWE-915", "CWE-22", "CWE-79"]);

for (const e of enriched) {
  const maxSev = Math.max(...e.vulns.map((v) => sevW[v.severity] ?? 1));
  const abandonment = Math.min(e.yearsSincePublish ?? 0, 6);
  e.maxSeverity = Object.entries(sevW).find(([, w]) => w === maxSev)?.[0] ?? "UNKNOWN";
  e.permissiveLicense = PERMISSIVE.test(e.license);
  e.likelySmallPatch = e.vulns.some((v) => v.cwes?.some((c) => EASY_CWE.has(c)));
  e.abandoned = abandonment >= 2;
  e.score = Math.round(Math.log10(Math.max(e.weeklyDownloads, 10)) * maxSev * Math.max(abandonment, 0.25) * 10) / 10;
}
enriched.sort((a, b) => b.score - a.score);
writeFileSync(OUT, JSON.stringify(enriched, null, 1));

console.log(`\n=== TOP 30 TARGETS (score = log10(dl/wk) x severity x years-abandoned) ===`);
for (const e of enriched.slice(0, 30)) {
  console.log(
    `${e.score.toString().padStart(6)}  ${e.name.padEnd(34)} ${String(e.weeklyDownloads).padStart(11)}/wk  ${e.maxSeverity.padEnd(8)} ${String(e.vulns.length)}v  pub:${e.lastPublish} ${e.deprecated ? "DEPRECATED" : ""} lic:${e.license} ${e.permissiveLicense ? "" : "(!)"} ${e.likelySmallPatch ? "small-patch" : ""}`
  );
}
console.log(`\nabandoned(>=2y) + permissive license + >=100k dl/wk: ${enriched.filter((e) => e.abandoned && e.permissiveLicense && e.weeklyDownloads >= 100_000).length}`);
