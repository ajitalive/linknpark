#!/usr/bin/env node
/**
 * Run pending migrations against Supabase.
 *
 * Usage (from api-server/ folder):
 *   node run-migrations.js
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from ../.env.development
 * Requires SUPABASE_ACCESS_TOKEN env var OR prompts you to add one.
 *
 * Get a Personal Access Token from:
 *   https://supabase.com/dashboard/account/tokens
 *
 * Then run:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node run-migrations.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Load .env.development ────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env.development');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL in .env.development');
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error(`
Missing SUPABASE_ACCESS_TOKEN.

1. Go to https://supabase.com/dashboard/account/tokens
2. Create a token named "migrations"
3. Run:  SUPABASE_ACCESS_TOKEN=sbp_xxxx node run-migrations.js
`);
  process.exit(1);
}

// Extract project ref from URL: https://xxxx.supabase.co → xxxx
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

// ── HTTP helper ──────────────────────────────────────────────────────────────
function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.supabase.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Run migrations ───────────────────────────────────────────────────────────
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

(async () => {
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Running ${files.length} migration(s)...\n`);

  let passed = 0, failed = 0;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const { status, body } = await post(
      `/v1/projects/${PROJECT_REF}/database/query`,
      { query: sql },
      ACCESS_TOKEN
    );

    if (status === 200 || status === 201) {
      console.log(`  ✓ ${file}`);
      passed++;
    } else {
      const msg = body?.message || body?.error || JSON.stringify(body);
      // Treat "already exists" as success — migrations are idempotent
      if (typeof msg === 'string' && (msg.includes('already exists') || msg.includes('IF NOT EXISTS'))) {
        console.log(`  ✓ ${file} (already applied)`);
        passed++;
      } else {
        console.error(`  ✗ ${file} [HTTP ${status}]: ${msg}`);
        failed++;
      }
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
