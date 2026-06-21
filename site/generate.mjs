#!/usr/bin/env node
/* Static-site generator for the Keep LTS catalog. Dependency-free (Node core only).
 * Reads each fork's fork-meta.json + package.json (+ weekly downloads) and emits an
 * SEO-tuned, deployable static site to ./dist.
 *
 * Design: the homepage + chrome adopt the "Keep LTS" visual identity in ./base.css
 * (IBM Plex / Space Grotesk, green accent, hexagon-pulse logo). Real data is wired in
 * from the fork metadata — never placeholders. Per-package pages remain separate
 * (the SEO funnel) and are restyled to match. Brand-neutral via BRAND / env vars. */
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
    "Drop-in security forks of abandoned npm packages — same API, patched CVEs, regression-tested. " +
    "Clear the audit finding with a one-line overrides entry, no code changes.",
};

// passing regression tests per package — evidence shown on each page
const TEST_COUNTS = {
  "101": 9, "apidoc-core": 5, csvjson: 6, "deep-defaults": 4, "defaults-deep": 4,
  "expr-eval": 8, "parse-git-config": 21, "utils-extend": 5, xlsx: 6,
  "url-regex": 5, "html-minifier": 7,
};
const downloads = JSON.parse(readFileSync(join(TARGETS, "..", "site-downloads.json"), "utf8"));

// Packages not yet live on npm (so the site only advertises installable fixes).
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

// flagship package used in the hero/verify terminals (real, not a placeholder)
const FLAG = pkgs.find((p) => p.orig === "xlsx") || pkgs[0];

// ---- shared chrome ----
const FONTS =
  `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
  `<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">`;

const NAV_LINKS =
  `<div class="nav-links"><a href="/#problem">Why</a><a href="/#how">How it works</a><a href="/#catalog">Catalog</a>` +
  `<a href="/#pro">Pro</a><a href="/#security">Security</a><a class="btn btn-primary btn-sm" href="/#contact">Get coverage</a></div>`;

const REVEAL_SCRIPT =
  `<script>(function(){if(!("IntersectionObserver"in window)){document.querySelectorAll(".reveal").forEach(function(el){el.classList.add("in");});return;}` +
  `var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:0.12});` +
  `document.querySelectorAll(".reveal").forEach(function(el){io.observe(el);});})();</script>`;

// hexagon "package" mark with a heartbeat pulse through it (logo concept "a")
const brand = (size) =>
  `<a class="brand" href="/"><span class="logo logo-a"><svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">` +
  `<path class="mark-stroke" d="M16 5 L25.5 10.5 L25.5 21.5 L16 27 L6.5 21.5 L6.5 10.5 Z" stroke-width="1.8" stroke-linejoin="round"></path>` +
  `<path class="mark-stroke" d="M16 16 L6.5 10.5 M16 16 L25.5 10.5 M16 16 L16 27" stroke-width="1.2" opacity="0.55"></path>` +
  `<path class="mark-accent" d="M2 16 H10 L13 10 L17 21 L20 16 H30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>` +
  `</svg><span class="brand-word">Keep <span class="brand-tag">LTS</span></span></span></a>`;

const FAVICON =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0A0E13"/>` +
  `<path d="M16 6 L24.5 11 L24.5 21 L16 26 L7.5 21 L7.5 11 Z" fill="none" stroke="#E6EDF3" stroke-width="1.6" stroke-linejoin="round"/>` +
  `<path d="M3 16 H10.5 L13 11 L17 21 L19.5 16 H29" fill="none" stroke="#3ECF8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const head = (title, desc, canonical, jsonld) => `<!doctype html>
<html lang="en" data-logo="a" data-display-font="grotesk"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://${BRAND.domain}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="/style.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head><body id="top">
<nav class="nav"><div class="container nav-inner">${brand(32)}${NAV_LINKS}</div></nav>`;

const foot = `<footer><div class="container"><div class="footer-grid">
<div>${brand(28)}
<p class="footer-tagline"><b>${esc(BRAND.name)} LTS</b> — ${esc(BRAND.tagline)}</p>
<p class="footer-legal">Unofficial security-maintenance forks. Original packages remain the property and trademark of their authors;
each fork preserves upstream license and attribution. Not affiliated with or endorsed by the original maintainers.</p></div>
<div class="footer-col"><h4>Product</h4><ul><li><a href="/#catalog">Catalog</a></li><li><a href="/#pro">Pro</a></li><li><a href="/#how">How it works</a></li><li><a href="/#security">Security</a></li></ul></div>
<div class="footer-col"><h4>Contact</h4><ul><li><a href="mailto:hello@${BRAND.domain}">hello@${BRAND.domain}</a></li><li><a href="/#contact">Get coverage</a></li><li><a href="/#faq">FAQ</a></li></ul></div>
</div><div class="footer-bottom"><span>© 2026 ${BRAND.domain}</span><span>async-first · no calls required</span></div></div></footer>
${REVEAL_SCRIPT}
</body></html>`;

// Netlify lead-capture form (captured to the Netlify dashboard + email notification)
const leadForm = `<form name="pro-inquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/pro-thanks.html" class="leadform">
<input type="hidden" name="form-name" value="pro-inquiry">
<p class="hp"><label>Leave blank if human <input name="bot-field"></label></p>
<div class="row2">
<label>Name <input type="text" name="name" autocomplete="name"></label>
<label>Work email * <input type="email" name="email" required autocomplete="email"></label>
</div>
<div class="row2">
<label>Company <input type="text" name="company" autocomplete="organization"></label>
<label>Compliance driver <select name="framework"><option value="">—</option><option>SOC 2</option><option>PCI-DSS</option><option>ISO 27001</option><option>FedRAMP</option><option>Other</option></select></label>
</div>
<label>What's flagging? <span class="muted">(packages, or paste your npm audit)</span> <textarea name="packages" rows="3" placeholder="e.g. ${esc(FLAG.orig)}, parse-git-config… or paste the audit output"></textarea></label>
<label class="chk"><input type="checkbox" name="deadline" value="yes"> We have an audit deadline in the next 30 days</label>
<button type="submit" class="btn btn-primary">Email the maintainers →</button>
<p class="form-note">Goes straight to the maintainer — a real reply within one business day. No call required.</p>
</form>`;

// ---- homepage ----
function indexPage() {
  const title = `${BRAND.name} LTS — security-maintained forks of abandoned npm packages`;
  const desc = `${BRAND.blurb} ${pkgs.length} packages maintained, ${totalCves} CVEs fixed, ${fmt(totalDl)} weekly downloads covered.`;
  const jsonld = { "@context": "https://schema.org", "@type": "WebSite", name: `${BRAND.name} LTS`, url: `https://${BRAND.domain}/`, description: desc };
  const firstCve = (FLAG.meta.cves || [])[0] || "CVE";

  const catalogCards = pkgs.map((p) => `<a class="pkg" href="/packages/${esc(p.orig)}.html">
<div class="pkg-top"><span class="pkg-name">${esc(p.orig)}</span><span class="badge">maintained</span></div>
<div class="pkg-meta">
<div class="row"><span>weekly downloads</span><b>${fmt(p.dl)}</b></div>
<div class="row"><span>CVEs fixed</span><b>${(p.meta.cves || []).length}</b></div>
<div class="row"><span>drop-in</span><b>${esc(p.version)}</b></div>
</div></a>`).join("\n");

  return head(title, desc, "/", jsonld) + `
<header class="hero"><div class="container hero-inner">
<div>
<p class="eyebrow">security-maintained forks · npm</p>
<h1>Your dependencies were abandoned. <span class="accent">Your risk doesn't have to be.</span></h1>
<p class="hero-sub">${esc(BRAND.name)} LTS publishes <strong>drop-in forks of abandoned npm packages</strong> — same API, patched CVEs, regression-tested. Adopted with a one-line <span class="mono">overrides</span> entry. No code changes, no migration project, no vendor calls.</p>
<div class="hero-ctas"><a class="btn btn-primary" href="/#catalog">Browse the free catalog</a><a class="btn btn-ghost" href="/#pro">See Pro coverage</a></div>
<p class="hero-note">$ npm install ${esc(FLAG.scoped)} — free &amp; open source, today</p>
</div>
<div class="terminal reveal">
<div class="terminal-bar"><i></i><i></i><i></i><span>zsh — ci</span></div>
<pre><span class="t-prompt">$</span> <span class="t-cmd">npm audit</span>
<span class="t-bad">${esc(FLAG.orig)}  ${esc(FLAG.meta.affectedVersion || FLAG.version)} — ${(FLAG.meta.cves || []).length} high severity</span>
<span class="t-dim">  no fix available — frozen upstream</span>

<span class="t-prompt">$</span> <span class="t-cmd">npm pkg set overrides.${esc(FLAG.orig)}=<span class="t-str">"npm:${esc(FLAG.scoped)}@^${esc(FLAG.version)}"</span></span>
<span class="t-prompt">$</span> <span class="t-cmd">npm install</span>
<span class="t-dim">+ ${esc(FLAG.scoped)}@${esc(FLAG.version)} · drop-in · advisory + tests inside</span>

<span class="t-prompt">$</span> <span class="t-cmd">npm audit</span>
<span class="t-good">found 0 vulnerabilities</span></pre>
</div>
</div></header>

<div class="stats"><div class="container stats-inner">
<div class="stat"><b>${pkgs.length}</b><span>forks under active maintenance</span></div>
<div class="stat"><b>${totalCves}</b><span>CVEs patched, advisories published</span></div>
<div class="stat"><b>${fmt(totalDl)}</b><span>weekly downloads covered</span></div>
<div class="stat"><b>100%</b><span>published open source</span></div>
</div></div>

<section id="problem"><div class="container">
<div class="section-head reveal"><p class="eyebrow">the problem</p><h2>Abandonment is a security problem.</h2><p>Thousands of packages with millions of weekly downloads have no maintainer left to ship a fix. The code still works — until an auditor, a CVE, or an attacker finds it.</p></div>
<div class="card-grid reveal">
<div class="card"><div class="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M5.5 5.5 L18.5 18.5"></path></svg></div><h3>No more patches</h3><p>When a maintainer archives a repo, CVE reports stop turning into releases. The vulnerability stays put — only your exposure grows.</p></div>
<div class="card"><div class="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><rect x="8" y="8" width="13" height="13" rx="2"></rect></svg></div><h3>Frozen deep in your tree</h3><p>Abandoned packages get pinned transitively, three levels down your lockfile. Migrating off them means rewriting code nobody wants to touch.</p></div>
<div class="card"><div class="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3 H15 L20 8 V21 H6 Z"></path><path d="M9.5 14.5 L11.5 16.5 L16 12"></path></svg></div><h3>Audits don't care why</h3><p>SOC 2, ISO 27001 and customer security reviews flag known CVEs regardless. "The package is dead" is not an accepted remediation.</p></div>
</div></div></section>

<section id="how"><div class="container">
<div class="section-head reveal"><p class="eyebrow">how it works</p><h2>Drop-in by design.</h2><p>We pick up maintenance exactly where the upstream stopped — so your dependency tree resolves to a patched build and your own code is untouched.</p></div>
<div class="diagram reveal" aria-label="Upstream releases stop and the repo is archived; the Keep LTS fork continues with CVE patches">
<svg viewBox="0 0 880 230" role="img">
<text class="dg-label-strong" x="40" y="38">upstream package</text>
<path class="dg-line" d="M40 60 H462"></path>
<circle class="dg-dot" cx="90" cy="60" r="4"></circle><circle class="dg-dot" cx="170" cy="60" r="4"></circle><circle class="dg-dot" cx="250" cy="60" r="4"></circle><circle class="dg-dot" cx="330" cy="60" r="4"></circle><circle class="dg-dot" cx="410" cy="60" r="4"></circle>
<path class="dg-x" d="M466 54 L478 66 M478 54 L466 66"></path>
<text class="dg-label" x="486" y="38">final release · repo archived</text>
<path class="dg-accent-line" d="M410 60 C455 60 445 150 490 150"></path>
<path class="dg-accent-line" d="M490 150 H800"></path>
<polygon points="798,143 812,150 798,157" fill="var(--accent)"></polygon>
<circle class="dg-accent-dot" cx="540" cy="150" r="4.5"></circle><circle class="dg-accent-dot" cx="615" cy="150" r="4.5"></circle><circle class="dg-accent-dot" cx="690" cy="150" r="4.5"></circle><circle class="dg-accent-dot" cx="760" cy="150" r="4.5"></circle>
<text class="dg-label" x="540" y="180" text-anchor="middle">cve patch</text><text class="dg-label" x="690" y="180" text-anchor="middle">cve patch</text><text class="dg-label" x="800" y="180" text-anchor="end">today</text>
<text class="dg-accent-label" x="490" y="210">@keep-lts fork — patches · tests · advisories</text>
</svg>
</div>
<div class="steps reveal">
<div class="step"><span class="step-num">01 / fork</span><h3>We fork at the last good release</h3><p>When a package with real-world usage is abandoned, we take over its security maintenance — publicly, under the <code>${esc(BRAND.scope)}</code> scope.</p></div>
<div class="step"><span class="step-num">02 / maintain</span><h3>We patch, test, and publish</h3><p>We reproduce the CVE with a real proof-of-concept, write the smallest patch that fixes it, then add a regression test that fails on the original and passes on the fork. The public API never changes — only the patch version moves.</p></div>
<div class="step"><span class="step-num">03 / override</span><h3>You add one line</h3><p>A single <code>overrides</code> entry in <code>package.json</code> resolves your whole tree to the patched build. Your code is untouched, and you can leave any time.</p></div>
</div></div></section>

<section id="catalog"><div class="container">
<div class="section-head reveal"><p class="eyebrow">the catalog</p><h2>A growing catalog of maintained forks.</h2><p>We focus on the long tail — the small, widely-used packages that quietly fail an <span class="mono">npm audit</span> with no fix to upgrade to. Every fork is free, and published in the open: full source, tests and advisories, under its upstream licence.</p></div>
<div class="pkg-grid reveal">
${catalogCards}
</div>
<div class="catalog-cta reveal"><a class="btn btn-ghost" href="/#contact">Request a package →</a><span class="hint">Don't see yours? Enterprise coverage includes forks on request.</span></div>
</div></section>

<section id="pro"><div class="container">
<div class="section-head reveal"><p class="eyebrow">plans</p><h2>Free to install. Pro when you need a vendor on the hook.</h2><p>Identical engineering standard across every tier. Pro adds the guarantee — an SLA on future CVEs, compliance artefacts your auditor will accept, and a real vendor on a contract.</p></div>
<div class="tiers reveal">
<div class="tier"><h3>Team</h3><p class="tier-tag">Clear one audit</p><p class="price">$400<small> /mo · cancel anytime</small></p><ul><li>Up to 10 packages under SLA</li><li>Critical / High CVEs patched in 5 business days</li><li>SBOM &amp; VEX compliance artefacts</li><li>Email support, one business-day reply</li></ul><a class="btn btn-ghost" href="/#contact">Start with Team</a></div>
<div class="tier tier-featured"><span class="tier-flag">Most teams</span><h3>Business</h3><p class="tier-tag">A guarantee on the packages you ship</p><p class="price">$1,200<small> /mo · cancel anytime</small></p><ul><li class="li-plus">Everything in Team</li><li>Up to 40 packages under SLA</li><li>Critical CVEs patched in 2 business days</li><li>Request-a-fork — 3 per quarter</li><li>Private Slack channel &amp; named contact</li></ul><a class="btn btn-primary" href="/#contact">Get Business coverage</a></div>
<div class="tier"><h3>Enterprise</h3><p class="tier-tag">Coverage shaped to your tree</p><p class="price">Custom</p><ul><li class="li-plus">Everything in Business</li><li>Unlimited packages &amp; forks on request</li><li>Private registry / mirror</li><li>DPA / MSA support &amp; optional indemnification</li><li>Written continuity terms</li></ul><a class="btn btn-ghost" href="/#contact">Talk to the maintainers</a></div>
</div></div></section>

<section id="security"><div class="container security-grid">
<div class="reveal"><p class="eyebrow">trust &amp; verification</p><h2>Built to pass your security review.</h2><p style="color:var(--text-2);margin:0;">Every fix is auditable end to end — and every fork is structured so you are never locked in.</p>
<ul class="checklist">
<li><span class="ck">✓</span><div><b>Reproduced &amp; regression-tested</b><span>Each fix ships a PoC for the real CVE and a test that fails on the original and passes on the patch.</span></div></li>
<li><span class="ck">✓</span><div><b>Everything published in the open</b><span>Full source, tests and advisories, under the upstream licence — read it before you adopt.</span></div></li>
<li><span class="ck">✓</span><div><b>No lock-in, by construction</b><span>You always retain the right to build it yourself. Pro contracts add written continuity terms.</span></div></li>
<li><span class="ck">✓</span><div><b>Async-first support</b><span>Email or a shared Slack channel — first reply within one business day. No vendor calls to sit through.</span></div></li>
</ul></div>
<div class="terminal reveal"><div class="terminal-bar"><i></i><i></i><i></i><span>zsh — verify</span></div>
<pre><span class="t-prompt">$</span> <span class="t-cmd">npm pack ${esc(FLAG.scoped)} --dry-run</span>
<span class="t-dim">package: ${esc(FLAG.scoped)}@${esc(FLAG.version)}</span>
  ${esc(FLAG.orig)}.js        <span class="t-dim">patched build</span>
  SECURITY.md    <span class="t-dim">CVE advisory + fix notes</span>
  test/          <span class="t-dim">regression tests</span>

<span class="t-prompt">$</span> <span class="t-cmd">node --test</span>
<span class="t-good">✔ ${esc(firstCve)} · vulnerability no longer reproduces</span>
<span class="t-good">✔ legitimate inputs round-trip unchanged</span></pre></div>
</div></section>

<section id="faq"><div class="container">
<div class="section-head reveal"><p class="eyebrow">faq</p><h2>Questions teams ask.</h2></div>
<div class="faq-list reveal">
<details open><summary>How is this different from the free packages?</summary><div class="faq-body">Identical engineering standard. Pro adds the <em>guarantee</em>: an SLA on future CVEs, coverage for packages we haven't forked yet, the compliance docs, and a contract with a real vendor on the hook.</div></details>
<details><summary>Do we have to get on a call?</summary><div class="faq-body">No — not to buy, not to onboard, not for support. Everything runs async over email or a shared Slack channel. No vendor calls to schedule or sit through.</div></details>
<details><summary>Do we have to change our code?</summary><div class="faq-body">No. Same drop-in <code>overrides</code> model — your dependency tree resolves to the patched build and your own code is untouched.</div></details>
<details><summary>What if you stop maintaining a package?</summary><div class="faq-body">Every fork is published open-source with its full source, tests and advisory, under its upstream licence — you always retain the right to build it yourself. Pro contracts add written continuity terms.</div></details>
<details><summary>Can you sign an NDA or security questionnaire?</summary><div class="faq-body">Yes on Business and Enterprise. Enterprise includes DPA / MSA support and optional indemnification.</div></details>
</div></div></section>

<section id="contact"><div class="container">
<div class="cta-panel with-form reveal">
<div><p class="eyebrow">get coverage</p><h2>Tell us what's flagging.</h2><p>Send the <span class="mono">npm audit</span> output, the Dependabot alert, or just a package name. It goes straight to the maintainer — a real reply, usually within one business day. No call required.</p><p class="cta-email" style="margin-top:16px">or email <a href="mailto:hello@${BRAND.domain}">hello@${BRAND.domain}</a> directly</p></div>
<div>${leadForm}</div>
</div></div></section>
` + foot;
}

// ---- per-package SEO page (kept separate; the funnel) ----
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
  // pre-filled mailto so a visitor who found us via this CVE can reply in one click, with context
  const auditSubject = encodeURIComponent("npm audit check — what else do you cover?");
  const auditBody = encodeURIComponent(
    `Hi ${BRAND.name} LTS team,\n\nI found your drop-in fix for ${cves} in ${p.orig}. ` +
    `Could you run the free check on the rest of my audit? Here is my npm audit output:\n\n` +
    `[paste your npm audit / Snyk / Dependabot output here]\n\nThanks,`);
  const auditMailto = `mailto:hello@${BRAND.domain}?subject=${auditSubject}&body=${auditBody}`;
  return head(title, desc, `/packages/${p.orig}.html`, jsonld) + `
<main class="article">
<nav class="crumbs"><a href="/#catalog">Catalog</a> / <span>${esc(p.orig)}</span></nav>
<span class="sev ${sevClass(p.meta.severity)}">${esc(p.meta.severity)}</span>
<h1><code>${esc(p.orig)}</code> ${esc((p.meta.cves || []).join(" · "))}</h1>
<p class="lede">${esc(p.meta.title)}.</p>

<div class="callout warn">
<h2>The problem</h2>
<p><code>${esc(p.orig)}</code> <strong>${esc(p.meta.affectedRange)}</strong> is affected by
<strong>${esc(cves)}</strong> (${esc(p.meta.cwe)}). The published package has
<strong>no fix available</strong> — exactly what <code>npm audit</code> reports. ${esc(p.meta.summary)}</p>
</div>

<div class="callout ok">
<h2>The fix — drop-in, no code changes</h2>
<p>Add an <code>overrides</code> entry so every direct and transitive dependency on
<code>${esc(p.orig)}</code> resolves to the patched fork, then reinstall:</p>
<pre><code>${esc(overrides)}</code></pre>
<p class="muted">Equivalent for Yarn: use <code>resolutions</code>. The public API is unchanged — nothing else to do.</p>
<p class="live">✓ Live on npm: <a href="https://www.npmjs.com/package/${esc(p.scoped)}"><code>${esc(p.scoped)}</code></a> &nbsp;·&nbsp; or install directly: <code>npm i ${esc(p.scoped)}</code></p>
</div>

<div class="callout cta-pkg">
<h2>This is rarely the only one</h2>
<p>If <code>${esc(p.orig)}</code> turned up in your <code>npm audit</code>, there are very likely other abandoned dependencies in the same tree whose CVEs also have no fix on npm. <strong>Send us your <code>npm audit</code> output — or your Snyk / Dependabot list — and we'll tell you, for free, which of those findings we already fix.</strong> No call, no obligation.</p>
<div class="cta-row">
<a class="btn btn-primary" href="${auditMailto}">Email your audit — free check →</a>
<a class="btn btn-ghost" href="/#contact">Or use the contact form →</a>
</div>
<p class="muted">Mid-audit and need a vendor on the hook? <a href="/#pro">${esc(BRAND.name)} LTS Pro</a> adds an SLA on future CVEs and the SBOM / VEX artefacts your auditor will accept — all async, no calls.</p>
</div>

<h2>What we changed</h2>
<p>${esc(p.meta.fixExplanation)}</p>
<h3>Proof of concept (the vulnerability)</h3>
<pre><code>${esc(p.meta.poc)}</code></pre>

<div class="facts">
<div><span class="k">Patched version</span><span class="v"><code>${esc(p.scoped)}@${esc(p.version)}</code></span></div>
<div><span class="k">Weekly downloads (affected pkg)</span><span class="v">${fmt(p.dl)}</span></div>
<div><span class="k">Regression tests</span><span class="v">${p.tests ? p.tests + " passing" : "yes"}</span></div>
<div><span class="k">License</span><span class="v">${esc(p.license || "see repo")}</span></div>
</div>

<div class="callout">
<h2>How we keep it trustworthy</h2>
<ul class="checks">
<li>Minimal, surgical patch — security only, no feature changes.</li>
<li>A regression test that <strong>fails on the original and passes on the patch</strong>; legitimate behaviour preserved.</li>
<li>Published under the <code>${esc(BRAND.scope)}</code> org with the full advisory and tests inside the package; upstream license &amp; attribution retained.</li>
</ul>
<p class="muted">Full advisory and changelog ship inside the package (<code>SECURITY.md</code>, <code>CHANGELOG.md</code>).</p>
</div>

<p class="back"><a href="/#catalog">← All maintained packages</a></p>
</main>` + foot;
}

function proThanksPage() {
  return head(`Thanks — message received | ${BRAND.name} LTS`, `Thanks for reaching out about ${BRAND.name} LTS.`, "/pro-thanks.html") + `
<main class="article">
<h1>Thanks — got it. ✓</h1>
<p class="lede">Your message reached the maintainer. You'll get a personal reply, usually within one business day — often sooner if you flagged a deadline.</p>
<div class="callout"><h2>While you wait</h2><ul class="checks">
<li>Browse the <a href="/#catalog">free catalog</a> — adopt any fix with one <code>overrides</code> line.</li>
<li>See <a href="/#how">how each fix is built and tested</a>.</li>
<li>Read our <a href="/#security">security &amp; trust</a> approach.</li>
</ul></div>
<p class="back"><a href="/">← Back to ${esc(BRAND.name)} LTS</a></p>
</main>` + foot;
}

// ---- CSS: designer base + component additions for article/form pages ----
const EXTRA_CSS = `
/* ---------- Article / package pages ---------- */
.article { max-width: 840px; margin: 0 auto; padding: 56px 32px 88px; }
.article section { padding: 0; }
.crumbs { font-family: var(--font-mono); font-size: 13px; color: var(--text-3); margin-bottom: 18px; }
.crumbs a { color: var(--text-2); }
.article h1 { font-family: var(--font-display); font-size: clamp(28px,3.4vw,40px); line-height: 1.12; letter-spacing: -0.02em; margin: 12px 0 10px; }
.article h2 { font-size: 22px; margin: 30px 0 10px; }
.article h3 { font-size: 16px; margin: 22px 0 8px; }
.article > p, .callout p { color: var(--text-2); }
.lede { font-size: 18px; color: var(--text-2); margin: 0 0 8px; }
.muted { color: var(--text-3); font-size: 14px; }
.article code, .faq-body code, .step code { font-family: var(--font-mono); font-size: 13.5px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: 5px; padding: 1px 6px; }
.article pre { background: #0B1117; border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; overflow-x: auto; font-family: var(--font-mono); font-size: 13px; line-height: 1.7; color: var(--text-2); margin: 14px 0; }
.article pre code { background: none; border: none; padding: 0; color: inherit; font-size: inherit; }
.sev { display: inline-block; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px; }
.sev.crit { color: var(--danger); background: color-mix(in oklab, var(--danger) 12%, transparent); border: 1px solid color-mix(in oklab, var(--danger) 30%, transparent); }
.sev.high { color: var(--warn); background: color-mix(in oklab, var(--warn) 12%, transparent); border: 1px solid color-mix(in oklab, var(--warn) 30%, transparent); }
.sev.med { color: var(--text-2); background: var(--surface-2); border: 1px solid var(--border-soft); }
.callout { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: 22px 24px; margin: 20px 0; }
.callout h2 { font-size: 18px; margin: 0 0 8px; }
.callout.warn { border-color: color-mix(in oklab, var(--warn) 32%, var(--border)); background: color-mix(in oklab, var(--warn) 5%, var(--surface)); }
.callout.ok { border-color: color-mix(in oklab, var(--accent) 35%, var(--border)); background: color-mix(in oklab, var(--accent) 5%, var(--surface)); }
.facts { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: var(--border-soft); border: 1px solid var(--border-soft); border-radius: var(--radius); overflow: hidden; margin: 20px 0; }
.facts > div { background: var(--surface); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.facts .k { font-size: 12.5px; color: var(--text-3); }
.facts .v { font-size: 15px; }
.checks { list-style: none; padding: 0; margin: 8px 0; }
.checks li { position: relative; padding: 11px 0 11px 28px; border-top: 1px solid var(--border-soft); font-size: 15px; color: var(--text-2); }
.checks li:last-child { border-bottom: 1px solid var(--border-soft); }
.checks li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-family: var(--font-mono); }
.live { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-soft); font-size: 14px; color: var(--text-2); }
.live a { color: var(--accent); }
.back { margin-top: 32px; }
.back a { color: var(--accent); font-family: var(--font-mono); font-size: 14px; }
.cta-pkg { border-color: color-mix(in oklab, var(--accent) 40%, var(--border)); background: color-mix(in oklab, var(--accent) 7%, var(--surface)); }
.cta-pkg p a { color: var(--accent); }
.cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin: 18px 0 4px; }
.cta-pkg .muted { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-soft); }

/* ---------- Lead form (contact section) ---------- */
.cta-panel.with-form { grid-template-columns: minmax(0,0.85fr) minmax(0,1.15fr); align-items: start; }
.leadform { display: grid; gap: 13px; }
.leadform .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.leadform label { display: grid; gap: 6px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.02em; color: var(--text-3); }
.leadform input, .leadform select, .leadform textarea { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 12px; font-family: var(--font-sans); font-size: 14.5px; }
.leadform input:focus, .leadform select:focus, .leadform textarea:focus { outline: none; border-color: var(--accent); }
.leadform textarea { resize: vertical; min-height: 82px; }
.leadform .chk { display: flex; flex-direction: row; align-items: center; gap: 9px; color: var(--text-2); font-family: var(--font-sans); font-size: 14px; }
.leadform .chk input { width: auto; }
.leadform .hp { position: absolute; left: -9999px; }
.leadform .muted { font-family: var(--font-sans); }
.leadform .form-note { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-3); margin: 2px 0 0; }
.leadform button { justify-content: center; }
@media (max-width: 560px) { .leadform .row2 { grid-template-columns: 1fr; } }
`;

// ---- emit ----
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "packages"), { recursive: true });
writeFileSync(join(OUT, "style.css"), readFileSync(join(__dir, "base.css"), "utf8") + "\n" + EXTRA_CSS);
writeFileSync(join(OUT, "favicon.svg"), FAVICON);
writeFileSync(join(OUT, "index.html"), indexPage());
writeFileSync(join(OUT, "pro-thanks.html"), proThanksPage());
for (const p of pkgs) writeFileSync(join(OUT, "packages", `${p.orig}.html`), packagePage(p));

// sitemap + robots (SEO) — homepage + per-package pages
const urls = ["/", ...pkgs.map((p) => `/packages/${p.orig}.html`)];
writeFileSync(join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>https://${BRAND.domain}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: https://${BRAND.domain}/sitemap.xml\n`);

console.log(`generated homepage + ${pkgs.length} package pages + pro-thanks + favicon + sitemap`);
console.log(`brand: ${BRAND.name} (${BRAND.scope}) -> ${BRAND.domain} · flagship in hero: ${FLAG.orig}`);
console.log(`real data: ${pkgs.length} pkgs · ${totalCves} CVEs · ${fmt(totalDl)} weekly downloads`);
console.log(`output: ${OUT}`);
