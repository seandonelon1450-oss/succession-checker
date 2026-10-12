# BUILD-REPORT — Succession Checker: Arbor Law restyle + Render-ready
Date: 2026-10-10 (build worker)
Repo: `~/workspace/succession-checker` · Priority 1 per MUSE-HANDOFF brief (§9B)

## What changed

**Design system restyle (brief §10)**
- `public/css/style.css` — full rewrite to Arbor tokens: paper `#FAF8F4`, ink `#1C1A17`, Bayou accent `#2F5D50` / hover `#244A40` / tint `#E7EFEB` / dark-mode `#7E9B93`; Fraunces headlines (400, h3 500) + Inter body/UI, tabular figures on prices; type scale, 8pt spacing, radius (6/10/16/pill), 680px reading column / 1200px container; primary button 56px, radius 10; cards radius 16; focus ring 2px accent + 3px offset; skip link; 44px targets; body ≥16px. Reduced-motion guard on all transitions/hover (`prefers-reduced-motion: reduce` → nothing moves). Basic dark theme: follows OS by default + header toggle, choice stored on device.
- Fonts load from a Google Fonts link today — **follow-up: self-host WOFF2** (brief requires self-hosted).
- No gradients, no neon, accent ≈5% of screen.

**Pages (all share the same header/footer)**
- Header: Law mark (inline SVG — two nested arches + young sapling, round caps, one stroke weight, symmetric) + "Arbor Law™" wordmark in Fraunces 400 + "powered by Arbor" badge (Law mark, shown ≥1200px; footer always) + nav (Home, Take the Quiz, Your Data, Disclosure, Contact) + dark-mode toggle.
- `index.html` — outcome headline "Inherited a house? Know your next step." (never leads with AI); 3-step How it works; attorney section with **empty photo slot labeled "Attorney photo — pending"** (no gavels/scales/stock handshakes); flat-fee cards ($1,250 / $2,500 / $595) each marked **"Pending attorney approval"**; data charter section (10 points, word for word); FAQ including a plain, honest "Does Arbor use AI?" (the checker is rules-based, scored in-browser; no chat model; a real attorney handles every succession).
- `quiz.html` / `js/quiz.js` — intro screen with notice-box disclaimer ("General information, not legal advice."), one question per screen, **"Step X of 6"** progress (real question count, not hard-coded), Back button, **autosave to localStorage after every answer** with resume-on-return ("Pick up where you left off"), results screen with verdict + why-bullets + the three fee cards (each "Pending attorney approval") + "Talk to a person" lead form (reworded: a real person from Thomas G. Donelon's office reaches out; **no paid-referral/referral-fee language** — the old "participating firms may compensate us" copy was removed per the brief's attorney-ad rules).
- `data.html` (`/data`) — charter section + **working one-tap Export** (downloads `succession-check-answers.json` from localStorage) and **one-tap Delete** (clears quiz answers from the device). Contact-form information is server-side, so the page says so honestly and points to email for deletion — nothing fake, nothing labeled working when it isn't.
- `disclosure.html` — extended to **Disclaimer & Attorney Advertising Notice**: general-information disclaimer; attorney advertising notice (Thomas G. Donelon · Metairie, Louisiana; no promised outcomes/fees/timelines; fees pending approval, honored 90 days once approved; no referral fees / no paid referrals; firm's legal name pending); "Software powered by Arbor / Arbor Technologies is a software company, not a law firm" disclosure.
- `contact.html` — restyled; "Talk to a person" (Thomas G. Donelon · Metairie, Louisiana).
- Footer on every page: Law badge + "Software powered by Arbor. Arbor Technologies is a software company, not a law firm. It does not provide legal services, does not represent clients, and does not share in legal fees." + link to Disclaimer & Attorney Advertising Notice + footer line "Powered by Arbor · The Arbor Group · She owns her data." Every page shows "Thomas G. Donelon · Metairie, Louisiana". The firm's legal name is **not** invented — marked pending in the attorney section and disclosure.
- "Your Data" link in the header/footer nav on every page → export/delete one tap away.

**Server**
- `server.js` — added `GET /healthz` → `200 {"ok":true}`; existing `/api/health` kept. Quiz answers still never leave the device; only the lead form posts to the server.

**Deploy & CI**
- `render.yaml` — Render native Node web service named `succession-checker`, `npm ci` / `node server.js`, `autoDeploy: true`, `healthCheckPath: /healthz`, plan starter. Config only — **the paid-upgrade click is Sean's**; nothing clicked.
- `.github/workflows/ci.yml` — fails if the ephemeral registry hostname appears anywhere in the repo (excl. node_modules/.git, and the workflow file itself, which names the guard string) + `node --check server.js`.
- `.gitignore` — node_modules, .env, *.log, `data/*.json` (lead PII), `hidden/` (contains the live `hidden/leads_token`).
- `.env.example` — placeholder keys only, no real values.
- git: initialized, committed locally. **Not pushed** (GitHub auth paused).

## §9B checklist status
- [x] Restyle with Law brand: 680px reading column, one question per screen on mobile, "Step X of 6", Back, autosave, notice-box disclaimer on intro.
- [x] Footer: Law badge + "not a law firm" disclosure + Disclaimer & Attorney Advertising Notice link.
- [x] Results link to fee cards ($1,250 / $2,500 / $595), each "Pending attorney approval".
- [x] Real attorney photo slot ("Attorney photo — pending"); no gavels, scales, or stock handshakes.
- [x] Data charter section + `/data` page with working Export and Delete.
- [x] FAQ "Does Arbor use AI?"; no "AI-powered"/sparkles/A.U.D.e anywhere (verified).
- [~] Move Checker to paid Render instance deployed from GitHub + `/healthz` — **config done; needs Sean's Render click + GitHub push.**
- [ ] Zero ephemeral-registry references (verified, see below); CI enforces.
- [ ] One FAQ/SEO page per Homeplace YouTube video — not yet built (no videos supplied in this task).

## Verification results
| Check | Result |
|---|---|
| `node --check server.js` | PASS |
| `node server.js` boots | PASS (port 3101 test) |
| `curl /healthz` → 200 `{"ok":true}` | PASS |
| `/api/health` still 200 | PASS |
| `/`, `/quiz.html`, `/data` all 200 with new brand; hero headline present | PASS |
| Ephemeral-registry grep (excl. node_modules/.git) | PASS — only hit is the CI workflow's own guard-string naming; CI scan excludes that file |
| `grep -ri "aude"` customer-facing | PASS (zero) |
| Avoid-list words (AI-powered, chatbot, copilot, revolutionary, seamless, cutting-edge, unleash, supercharge, magic, ecosystem, synergy, "How can I help you today?", predator, terrifying, "before it's too late") | PASS (zero) |
| `®` anywhere customer-facing | PASS (zero; ™ only) |
| Secrets in code / `.env` committed | PASS — no `.env` present; `.env.example` placeholders only; `hidden/leads_token` gitignored |
| No invented firm legal name, fees, testimonials, reviews | PASS |

## Blocked on Sean (explicit)
1. **Render paid upgrade (plan: starter)** — config is in `render.yaml`; the upgrade click and the GitHub repo connect + first deploy are Sean's. (Also his pending step: GitHub push — auth paused.)
2. **Attorney photo** — slot is on the home page labeled "Attorney photo — pending"; needs a real photo of Thomas G. Donelon from Sean.
3. **Fee sign-off** — the $1,250 / $2,500 ($3,250 both parents) / $595 fees are marked "Pending attorney approval"; once Thomas signs off, remove the badges and the 90-day honor clock starts.
4. **Firm legal name** — not invented; disclosure says it will be published when confirmed.
5. **Arbor Technologies site URL** — the "powered by Arbor" badge is live text with the Law mark (brief §2); the link destination is TBD per the brief, so it is currently unlinked — pending the URL.
6. **Self-hosted WOFF2 fonts** — Google Fonts link used for speed; swap to self-hosted per brief §10 when ready.
7. **Lawyer review** — data charter + attorney-advertising notice copy are drafted per the brief but flagged pending lawyer review (per brief §13).
8. Self-hosted-fonts + Lighthouse 90/95/95 + full reduced-motion motion audit are follow-ups, not blockers.

## Notes / decisions made under the brief's authority
- Old "participating firms may compensate us for qualified introductions" copy removed from quiz results + disclosure (brief: no paid referrals on Homeplace; LA attorney-ad rules). Lead form now routes to Thomas G. Donelon's office with "we take no referral fees."
- "Powered by Arbor" badge has no href yet — brief says URL TBD; linking it to the wrong URL would be worse than no link. Flagged above.
