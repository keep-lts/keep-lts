#!/usr/bin/env node
/* Static-site generator for the LTS catalog. Dependency-free.
 * Reads each fork's fork-meta.json + package.json (+ weekly downloads) and emits an
 * SEO-tuned, deployable static site to ./dist. The per-package page targets the moment
 * a developer's `npm audit` flags a package with "no fix available" and they search for one.
 *
 * Brand-neutral: edit BRAND below (or set env vars) before deploying. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const TARGETS = join(__dir, "..", "targets");
const OUT = join(__dir, "dist");

const BRAND = {
  name: process.env.LTS_BRAND || "Keep",
  scope: process.env.LTS_SCOPE || "@keep-lts",
  domain: process.env.LTS_DOMAIN || "keep-lts.com",
  tagline: "Security-maintained drop-in forks of abandoned npm packages.",
  blurb:
    "Thousands of npm packages have known CVEs and no fix on the registry — the maintainer moved on. " +
    "We publish minimal, tested, drop-in security patches so you can clear the audit finding without rewriting code.",
};

// test counts (passing regression tests per package) — evidence shown on each page
const TEST_COUNTS = {
  "101": 9, "apidoc-core": 5, csvjson: 6, "deep-defaults": 4, "defaults-deep": 4,
  "expr-eval": 8, "parse-git-config": 21, "utils-extend": 5, xlsx: 6,
  "url-regex": 5, "html-minifier": 7,
};
const downloads = JSON.parse(readFileSync(join(TARGETS, "..", "site-downloads.json"), "utf8"));

// Packages not yet live on npm (so the site only advertises installable fixes).
// "101" is excluded — npm blocks that package name; it ships once renamed.
const NOT_PUBLISHED = new Set(["101"]);

// ---- gather package data ----
const pkgs = [];
for (const d of readdirSync(TARGETS)) {
  if (!d.startsWith("fork-")) continue;
  const dir = join(TARGETS, d);
  const metaPath = join(dir, "fork-meta.json");
  const pkgPath = join(dir, "package.json");
  if (!existsSync(metaPath) || !existsSync(pkgPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const orig = pkg.name.replace(BRAND.scope + "/", "");
  if (NOT_PUBLISHED.has(orig)) continue;
  pkgs.push({
    orig, scoped: pkg.name, version: pkg.version, license: pkg.license,
    dl: downloads[orig] || 0, tests: TEST_COUNTS[orig] || null, meta,
  });
}
pkgs.sort((a, b) => b.dl - a.dl);

const totalDl = pkgs.reduce((s, p) => s + p.dl, 0);
const totalCves = pkgs.reduce((s, p) => s + (p.meta.cves?.length || 0), 0);
const fmt = (n) => n.toLocaleString("en-US");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sevClass = (s) => /crit/i.test(s) ? "crit" : /high/i.test(s) ? "high" : "med";

// ---- shared chrome ----
const head = (title, desc, canonical, jsonld) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://${BRAND.domain}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta name="robots" content="index,follow">
<link rel="stylesheet" href="/style.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head><body>
<header class="nav"><a class="brand" href="/">${esc(BRAND.name)}<span>LTS</span></a>
<nav><a href="/#catalog">Catalog</a><a href="/how-it-works.html">How it works</a><a href="/security.html">Security</a></nav></header>`;

const foot = `<footer><div class="wrap"><p><strong>${esc(BRAND.name)} LTS</strong> — ${esc(BRAND.tagline)}</p>
<p class="muted">Unofficial security-maintenance forks. Original packages remain the property and trademark of their authors;
each fork preserves upstream license and attribution. Not affiliated with or endorsed by the original maintainers.</p></div></footer>
</body></html>`;

// ---- per-package page ----
function packagePage(p) {
  const cves = (p.meta.cves || []).join(", ");
  const title = `Fix ${cves} in ${p.orig} — secure drop-in replacement (npm) | ${BRAND.name} LTS`;
  const desc = `${p.orig} ${p.meta.affectedRange} has ${cves} (${p.meta.severity}, ${p.meta.cwe}) with no fix on npm. ` +
    `${p.scoped}@${p.version} is a tested, drop-in security patch — fix it with one npm "overrides" entry, no code changes.`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "TechArticle",
    headline: p.meta.title, datePublished: p.meta.date,
    about: (p.meta.cves || []).map((c) => ({ "@type": "Thing", name: c })),
    description: desc,
  };
  const overrides = `{\n  "overrides": {\n    "${p.orig}": "npm:${p.scoped}@^${p.version}"\n  }\n}`;
  return head(title, desc, `/packages/${p.orig}.html`, jsonld) + `
<main class="wrap article">
<nav class="crumbs"><a href="/">Catalog</a> / <span>${esc(p.orig)}</span></nav>
<span class="sev ${sevClass(p.meta.severity)}">${esc(p.meta.severity)}</span>
<h1><code>${esc(p.orig)}</code> ${esc((p.meta.cves || []).join(" · "))}</h1>
<p class="lede">${esc(p.meta.title)}.</p>

<section class="callout warn">
<h2>The problem</h2>
<p><code>${esc(p.orig)}</code> <strong>${esc(p.meta.affectedRange)}</strong> is affected by
<strong>${esc(cves)}</strong> (${esc(p.meta.cwe)}). The published package has
<strong>no fix available</strong> — this is exactly what <code>npm audit</code> reports. ${esc(p.meta.summary)}</p>
</section>

<section class="callout ok">
<h2>The fix — drop-in, no code changes</h2>
<p>Add an <code>overrides</code> entry so every direct and transitive dependency on
<code>${esc(p.orig)}</code> resolves to the patched fork, then reinstall:</p>
<pre class="copy"><code>${esc(overrides)}</code></pre>
<p class="muted">Equivalent for Yarn: use <code>resolutions</code>. The public API is unchanged — nothing else to do.</p>
<p class="live">✓ Live on npm: <a href="https://www.npmjs.com/package/${esc(p.scoped)}"><code>${esc(p.scoped)}</code></a> &nbsp;·&nbsp; or install directly: <code>npm i ${esc(p.scoped)}</code></p>
</section>

<section>
<h2>What we changed</h2>
<p>${esc(p.meta.fixExplanation)}</p>
<h3>Proof of concept (the vulnerability)</h3>
<pre><code>${esc(p.meta.poc)}</code></pre>
</section>

<section class="grid facts">
<div><span class="k">Patched version</span><span class="v"><code>${esc(p.scoped)}@${esc(p.version)}</code></span></div>
<div><span class="k">Weekly downloads (affected pkg)</span><span class="v">${fmt(p.dl)}</span></div>
<div><span class="k">Regression tests</span><span class="v">${p.tests ? p.tests + " passing" : "yes"}</span></div>
<div><span class="k">License</span><span class="v">${esc(p.license || "see repo")}</span></div>
</section>

<section class="callout">
<h2>How we keep it trustworthy</h2>
<ul class="checks">
<li>Minimal, surgical patch — security only, no feature changes.</li>
<li>A regression test that <strong>fails on the original and passes on the patch</strong>; legitimate behavior preserved.</li>
<li>Published under the <code>${esc(BRAND.scope)}</code> org with the full advisory and tests inside the package; upstream license &amp; attribution retained.</li>
</ul>
<p class="muted">Full advisory and changelog ship inside the package (<code>SECURITY.md</code>, <code>CHANGELOG.md</code>).</p>
</section>

<p class="back"><a href="/#catalog">← All maintained packages</a></p>
</main>` + foot;
}

// ---- index ----
function indexPage() {
  const title = `${BRAND.name} LTS — security fixes for abandoned npm packages with no upstream patch`;
  const desc = `${BRAND.blurb} ${pkgs.length} packages maintained, ${totalCves} CVEs fixed, ${fmt(totalDl)} weekly downloads covered.`;
  const rows = pkgs.map((p) => `<tr>
<td><a href="/packages/${p.orig}.html"><code>${esc(p.orig)}</code></a></td>
<td>${(p.meta.cves || []).map((c) => `<code>${esc(c)}</code>`).join("<br>")}</td>
<td><span class="sev ${sevClass(p.meta.severity)}">${esc(p.meta.severity)}</span></td>
<td class="num">${fmt(p.dl)}</td>
<td><a class="cta" href="/packages/${p.orig}.html">Secure it →</a></td></tr>`).join("\n");
  return head(title, desc, "/", {
    "@context": "https://schema.org", "@type": "WebSite", name: `${BRAND.name} LTS`,
    url: `https://${BRAND.domain}/`, description: desc,
  }) + `
<main>
<section class="hero"><div class="wrap">
<h1>Your <code>npm audit</code> found a vulnerability with <span class="hl">no fix available</span>.</h1>
<p class="lede">${esc(BRAND.blurb)}</p>
<div class="stats">
<div><b>${pkgs.length}</b><span>packages maintained</span></div>
<div><b>${totalCves}</b><span>CVEs fixed</span></div>
<div><b>${fmt(totalDl)}</b><span>weekly downloads covered</span></div>
</div></div></section>

<section id="catalog" class="wrap">
<h2>Maintained packages</h2>
<p class="muted">Each is a drop-in replacement: add one <code>overrides</code> entry, reinstall, done.</p>
<table class="catalog"><thead><tr><th>Package</th><th>Fixes</th><th>Severity</th><th class="num">Downloads/wk</th><th></th></tr></thead>
<tbody>${rows}</tbody></table>
</section>

<section class="wrap pro">
<h2>For teams that get audited</h2>
<p>Every fix above is free, forever. But if your SOC&nbsp;2 / PCI / ISO audit needs more than a
community fork — a <strong>guaranteed patch SLA</strong>, private support, and a real vendor on the
hook — that's <strong>${esc(BRAND.name)} LTS Pro</strong>.</p>
<ul class="prolist">
<li><b>Guaranteed remediation window</b> when a new CVE lands on a package you depend on.</li>
<li><b>SBOM / VEX attestations</b> your compliance team can hand straight to the auditor.</li>
<li><b>One contract</b> covering your whole tail of abandoned dependencies, not 50 separate forks.</li>
</ul>
<a class="cta big" href="mailto:hello@${BRAND.domain}?subject=${encodeURIComponent(BRAND.name + " LTS Pro")}">Talk to us about Pro →</a>
</section>

<section class="wrap band">
<h2>Don't see your package?</h2>
<p>We continuously scan the npm advisory database for high-impact packages that are abandoned with
unfixed CVEs. <a href="/how-it-works.html">See how it works</a> — or request a package.</p>
</section>
</main>` + foot;
}

function howItWorksPage() {
  const title = `How ${BRAND.name} LTS works — drop-in security forks for unmaintained npm packages`;
  const desc = `How we find, patch, test, and publish drop-in security fixes for abandoned npm packages with unfixed CVEs.`;
  return head(title, desc, "/how-it-works.html") + `
<main class="wrap article">
<h1>How it works</h1>
<p class="lede">The npm registry is full of packages with known CVEs and no path to a fix — the maintainer
moved on, deprecated the package, or stopped publishing. Migrating away is often a big job. We close the gap.</p>
<ol class="steps">
<li><b>Find.</b> We scan the full npm advisory database for packages that are widely used, abandoned, and have a
vulnerability with <em>no fixed version</em> — the worst quadrant.</li>
<li><b>Reproduce.</b> Every fix starts with a working proof-of-concept for the actual CVE.</li>
<li><b>Patch, minimally.</b> Security-only, surgical changes — we port the upstream fix where one exists on a
side channel, or write the smallest correct guard. No feature changes.</li>
<li><b>Prove it.</b> A regression test that fails on the original and passes on the patch, plus checks that
legitimate behavior is byte-for-byte preserved.</li>
<li><b>Publish.</b> A scoped, signed, drop-in package you adopt with one <code>overrides</code> line —
upstream license and attribution retained.</li>
</ol>
<h2>Adopting a fix</h2>
<p>Add the package's <code>overrides</code> entry (shown on each package page) to your <code>package.json</code>
and reinstall. Every direct and transitive dependency now resolves to the patched build. Your audit clears;
your code doesn't change.</p>
<p class="back"><a href="/#catalog">← Browse the catalog</a></p>
</main>` + foot;
}

function securityPage() {
  const title = `Security &amp; trust — ${BRAND.name} LTS`;
  const desc = `How ${BRAND.name} LTS keeps drop-in security forks trustworthy: minimal patches, reproducible tests, provenance, preserved licensing.`;
  return head(title, desc, "/security.html") + `
<main class="wrap article">
<h1>Security &amp; trust</h1>
<p class="lede">You're installing a security patch from a third party. That bar is high — here's how we meet it.</p>
<ul class="checks big">
<li><b>Minimal &amp; auditable.</b> Each fork changes as little as possible; the diff is security-only and the
changed lines are commented with their CVE. Read it before you adopt.</li>
<li><b>Reproduced &amp; regression-tested.</b> Every fix has a PoC for the real vulnerability and a test that fails
on the unpatched original and passes on the patch.</li>
<li><b>Behavior preserved.</b> Legitimate inputs produce identical results — verified, for larger packages, by
cross-version equivalence tests against the original.</li>
<li><b>Provenance.</b> Packages are published with npm provenance/signing so you can verify what you install.</li>
<li><b>Licensing respected.</b> Upstream license, copyright, and attribution are retained; Apache <code>NOTICE</code>
files and change statements are preserved. We are not affiliated with the original maintainers and link you to
them for ongoing support.</li>
</ul>
<p class="back"><a href="/#catalog">← Browse the catalog</a></p>
</main>` + foot;
}

const CSS = `:root{--bg:#0b0e14;--panel:#11151f;--panel2:#161b27;--ink:#e6e9ef;--mut:#8a93a6;--line:#222a39;
--acc:#5db4ff;--ok:#3fce8f;--okbg:#0f2018;--warn:#ffb454;--warnbg:#241a0f;--crit:#ff6b6b;--high:#ff9f43;--med:#ffd166}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
code{font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace;font-size:.92em}
.wrap{max-width:980px;margin:0 auto;padding:0 22px}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.nav{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(11,14,20,.85);backdrop-filter:blur(8px);z-index:5}
.brand{font-weight:700;font-size:18px;color:var(--ink)}.brand span{color:var(--acc);margin-left:6px;font-size:12px;letter-spacing:.12em;vertical-align:super}
.nav nav a{margin-left:20px;color:var(--mut);font-size:14px}.nav nav a:hover{color:var(--ink);text-decoration:none}
.hero{padding:70px 0 40px;border-bottom:1px solid var(--line);background:radial-gradient(900px 300px at 50% -10%,rgba(93,180,255,.10),transparent)}
.hero h1{font-size:40px;line-height:1.15;margin:0 0 14px;letter-spacing:-.02em}.hl{color:var(--crit)}
.lede{font-size:19px;color:var(--mut);max-width:70ch;margin:0 0 26px}
.stats{display:flex;gap:34px;flex-wrap:wrap}.stats div{display:flex;flex-direction:column}.stats b{font-size:30px;color:var(--ink)}.stats span{color:var(--mut);font-size:13px}
h2{font-size:24px;margin:38px 0 8px;letter-spacing:-.01em}h3{font-size:17px;margin:22px 0 6px}
.muted{color:var(--mut)}
table.catalog{width:100%;border-collapse:collapse;margin:18px 0 10px}
.catalog th,.catalog td{text-align:left;padding:12px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.catalog th{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.catalog td.num,.catalog th.num{text-align:right;font-variant-numeric:tabular-nums}
.catalog tr:hover td{background:var(--panel)}
.cta{white-space:nowrap;font-weight:600}
.sev{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.sev.crit{background:rgba(255,107,107,.14);color:var(--crit)}.sev.high{background:rgba(255,159,67,.14);color:var(--high)}.sev.med{background:rgba(255,209,102,.14);color:var(--med)}
.band{margin:46px auto;padding:26px;background:var(--panel);border:1px solid var(--line);border-radius:14px}
.live{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:14px;color:var(--ok)}
.live a{color:var(--acc)}
.pro{margin:46px auto;padding:30px;background:var(--okbg);border:1px solid #1f5a3f;border-radius:14px}
.pro h2{margin-top:0}.prolist{list-style:none;padding:0;margin:14px 0 22px}
.prolist li{padding:7px 0 7px 26px;position:relative}.prolist li:before{content:"→";position:absolute;left:0;color:var(--ok)}
.cta.big{display:inline-block;background:var(--ok);color:#04150d;font-weight:700;padding:11px 20px;border-radius:10px}
.cta.big:hover{text-decoration:none;filter:brightness(1.08)}
.article{padding:34px 22px 60px;max-width:820px}
.crumbs{color:var(--mut);font-size:13px;margin-bottom:14px}
.article h1{font-size:30px;margin:8px 0 6px;letter-spacing:-.01em}
.callout{border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:18px 0;background:var(--panel)}
.callout.warn{border-color:#5a4421;background:var(--warnbg)}.callout.ok{border-color:#1f5a3f;background:var(--okbg)}
.callout h2{margin:0 0 8px;font-size:18px}
pre{background:#0a0d13;border:1px solid var(--line);border-radius:10px;padding:14px 16px;overflow:auto;font-size:13.5px;line-height:1.5}
pre.copy{position:relative}
.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:18px 0}
.facts div{background:var(--panel);padding:14px 16px;display:flex;flex-direction:column;gap:3px}
.facts .k{color:var(--mut);font-size:12px}.facts .v{font-size:15px}
.checks{list-style:none;padding:0;margin:8px 0}.checks li{padding:7px 0 7px 28px;position:relative}
.checks li:before{content:"✓";position:absolute;left:0;color:var(--ok);font-weight:700}
.checks.big li{padding:12px 0 12px 30px;border-bottom:1px solid var(--line)}
.steps{padding-left:22px}.steps li{margin:12px 0}
.back{margin-top:30px}
footer{border-top:1px solid var(--line);margin-top:50px;padding:26px 0 50px}
footer .muted{font-size:13px;max-width:80ch}
@media(max-width:640px){.hero h1{font-size:30px}.facts{grid-template-columns:1fr}.nav nav a{margin-left:12px}}`;

// ---- emit ----
rmSync(OUT, { recursive: true, force: true });   // clean stale output (e.g. removed packages)
mkdirSync(join(OUT, "packages"), { recursive: true });
writeFileSync(join(OUT, "style.css"), CSS);
writeFileSync(join(OUT, "index.html"), indexPage());
writeFileSync(join(OUT, "how-it-works.html"), howItWorksPage());
writeFileSync(join(OUT, "security.html"), securityPage());
for (const p of pkgs) writeFileSync(join(OUT, "packages", `${p.orig}.html`), packagePage(p));

// sitemap + robots (SEO)
const urls = ["/", "/how-it-works.html", "/security.html", ...pkgs.map((p) => `/packages/${p.orig}.html`)];
writeFileSync(join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>https://${BRAND.domain}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: https://${BRAND.domain}/sitemap.xml\n`);

console.log(`generated ${pkgs.length} package pages + index/how-it-works/security + sitemap`);
console.log(`brand: ${BRAND.name} (${BRAND.scope}) -> ${BRAND.domain}`);
console.log(`output: ${OUT}`);
