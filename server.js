'use strict';
/* =====================================================================
 * Succession Checker V1 — server.
 *
 * A thin backend:
 *  - serves the static frontend (public/)
 *  - POST /api/lead -> stores a lead (name, phone, email, parish,
 *    quiz outcome) in data/leads.json (local file stub; move to a real
 *    CRM / lead router before doing real marketing)
 *  - GET  /api/leads?token=... -> token-gated lead list (token from the
 *    LEADS_TOKEN env var at runtime only — never baked into code/image)
 *  - GET  /api/health -> liveness check
 *
 * No accounts, no payments, no tracking pixels in V1.
 * The server never sees quiz answers — the quiz runs entirely in the
 * visitor's browser. Only the lead form (name/phone/email/parish +
 * the final outcome label) is ever sent to the server.
 * =================================================================== */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, 'data', 'leads.json');

/* All 64 Louisiana parishes. */
const PARISHES = [
  'Acadia','Allen','Ascension','Assumption','Avoyelles','Beauregard','Bienville',
  'Bossier','Caddo','Calcasieu','Caldwell','Cameron','Catahoula','Claiborne',
  'Concordia','De Soto','East Baton Rouge','East Carroll','East Feliciana',
  'Evangeline','Franklin','Grant','Iberia','Iberville','Jackson','Jefferson',
  'Jefferson Davis','Lafayette','Lafourche','LaSalle','Lincoln','Livingston',
  'Madison','Morehouse','Natchitoches','Orleans','Ouachita','Plaquemines',
  'Pointe Coupee','Rapides','Red River','Richland','Sabine','St. Bernard',
  'St. Charles','St. Helena','St. James','St. John the Baptist','St. Landry',
  'St. Martin','St. Mary','St. Tammany','Tangipahoa','Tensas','Terrebonne',
  'Union','Vermilion','Vernon','Washington','Webster','West Baton Rouge',
  'West Carroll','West Feliciana','Winn'
];

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'succession-checker', version: '1.0.0' });
});

/* Render deploy health check. Keep /api/health for the existing dashboard. */
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

/* Token-gated lead list. The token is compared against process.env.LEADS_TOKEN
 * only — it is never baked into the code or the image. Unset env var or a
 * wrong token -> 403. */
app.get('/api/leads', (req, res) => {
  const token = process.env.LEADS_TOKEN;
  if (!token || req.query.token !== token) {
    return res.status(403).json({ ok: false });
  }
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { /* missing file -> empty array */ }
  if (!Array.isArray(list)) list = [];
  res.json({ ok: true, leads: list });
});

/* Lead capture stub. Stores locally; NOT a real CRM yet. */
app.post('/api/lead', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').trim().slice(0, 30);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  const parish = String(body.parish || '').trim().slice(0, 40);
  let outcome = String(body.outcome || 'unknown').slice(0, 20);
  if (!['likely', 'might', 'unlikely', 'open'].includes(outcome)) outcome = 'unknown';

  if (name.length < 2) {
    return res.status(400).json({ ok: false, error: 'Please enter your name.' });
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return res.status(400).json({ ok: false, error: 'That phone number doesn\u2019t look right.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address doesn\u2019t look right.' });
  }
  if (!PARISHES.includes(parish)) {
    return res.status(400).json({ ok: false, error: 'Please choose your parish.' });
  }

  let list = [];
  try { list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { /* first run */ }
  if (!Array.isArray(list)) list = [];
  list.push({ name, phone, email, parish, outcome, ts: new Date().toISOString() });
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Couldn\u2019t save that — please try again.' });
  }
  res.json({ ok: true });
});


/* ---- Private analytics: pageviews + conversion events. No third parties,
 * no cookies, no fingerprinting, no PII. Page + event + timestamp only. ---- */
const ANALYTICS_FILE = path.join(__dirname, 'data', 'analytics.jsonl');
app.post('/api/track', (req, res) => {
  const body = req.body || {};
  const page = String(body.page || '').slice(0, 120);
  let event = String(body.event || 'pageview').slice(0, 40);
  if (!/^[a-z0-9_]+$/.test(event)) event = 'pageview';
  if (!page.startsWith('/')) return res.status(400).json({ ok: false });
  const line = JSON.stringify({ ts: new Date().toISOString(), page, event,
    ua: String(req.headers['user-agent'] || '').slice(0, 120) }) + '\n';
  try { fs.appendFileSync(ANALYTICS_FILE, line); } catch (e) { /* best effort */ }
  res.json({ ok: true });
});
app.get('/api/stats', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ ok: false });
  let lines = [];
  try { lines = fs.readFileSync(ANALYTICS_FILE, 'utf8').split('\n').filter(Boolean); }
  catch (e) { /* no data yet */ }
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const pageviewsByPage = {}, eventsByType = {};
  let totalPageviews = 0;
  for (const ln of lines) {
    try {
      const r = JSON.parse(ln);
      if (new Date(r.ts).getTime() < cutoff) continue;
      eventsByType[r.event] = (eventsByType[r.event] || 0) + 1;
      if (r.event === 'pageview') {
        totalPageviews++;
        pageviewsByPage[r.page] = (pageviewsByPage[r.page] || 0) + 1;
      }
    } catch (e) { /* skip bad lines */ }
  }
  res.json({ ok: true, days: 30, totalPageviews, pageviewsByPage, eventsByType });
});

app.listen(PORT, () => console.log(`succession-checker listening on ${PORT}`));
