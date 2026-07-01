'use strict';

const express = require('express');

/**
 * Document Vault — AI field extraction.
 *
 *   POST /api/vault/extract   (multipart: image)
 *
 * Reads an Indian vehicle document (RC / insurance / PUC / licence) with a
 * vision model and returns structured fields so the app can pre-fill the
 * "Add Document" form instead of the user typing everything by hand.
 *
 * The image is processed in-memory for a single request and never stored.
 *
 * Vision is behind a provider seam with two adapters, chosen by AI_PROVIDER:
 *
 *   cloudflare  (default when configured) — Cloudflare Workers AI, open-source
 *               vision models, free daily allowance, auto-scaling.
 *     Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_TOKEN
 *          CF_AI_MODEL (optional; default '@cf/meta/llama-3.2-11b-vision-instruct')
 *
 *   openrouter  (fallback) — OpenRouter chat/completions with a vision model.
 *     Env: OPENROUTER_API_KEY, OPENROUTER_MODEL (optional)
 *
 * AI_PROVIDER (optional) forces a provider; otherwise Cloudflare is used when
 * its creds are present, else OpenRouter.
 */
module.exports = function vaultRoutes({ upload, requireAuth }) {
  const router = express.Router();
  // Only logged-in users may scan — protects the free AI quota from anonymous abuse.
  const auth = requireAuth || ((req, res, next) => next());

  // ── Provider config ─────────────────────────────────────────────────────────
  const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const CF_AI_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || '';
  const CF_MODEL = process.env.CF_AI_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct';

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  const OR_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

  const cfConfigured = !!(CF_ACCOUNT_ID && CF_AI_TOKEN);
  const orConfigured = !!OPENROUTER_API_KEY;
  const PROVIDER = (process.env.AI_PROVIDER || (cfConfigured ? 'cloudflare' : 'openrouter')).toLowerCase();

  const PROMPT = [
    'You are reading a single Indian vehicle document. Identify which document it is',
    'and extract its key fields. Respond with ONLY a JSON object, no prose, shaped exactly:',
    '{',
    '  "docType": one of "rc" | "insurance" | "puc" | "license" | "other",',
    '  "vehicleName": the vehicle REGISTRATION / number-plate (e.g. "AP04AT2025", "MH43BK9214"). ALWAYS use the plate whenever any registration number is visible — never the address. Only if there is genuinely no plate, fall back to the owner name, else "",',
    '  "docNumber": the document\'s identifying number — insurance policy number, PUC certificate number, driving licence number, or for an RC the registration number — else "",',
    '  "expiry": expiry / valid-until date formatted "DD MMM YYYY" (e.g. "15 Jan 2027") if present, else "",',
    '  "notes": one short line of any other useful detail (make/model, fuel, owner), else ""',
    '}',
    'If the image is not a readable document, return all fields empty with docType "other".',
  ].join('\n');

  // ── Adapter: Cloudflare Workers AI ──────────────────────────────────────────
  // Vision models take { image: <array of bytes>, prompt, max_tokens }.
  async function cloudflareExtract(buffer) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;
    const t0 = Date.now();
    console.log('[VAULT] → Cloudflare Workers AI (model=%s, bytes=%d)', CF_MODEL, buffer.length);
    const aiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_AI_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: PROMPT,
        image: [...new Uint8Array(buffer)],
        max_tokens: 1024,
      }),
    });
    console.log('[VAULT] ← Cloudflare responded %d in %dms', aiRes.status, Date.now() - t0);
    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      return { ok: false, status: aiRes.status, detail };
    }
    const data = await aiRes.json();
    // Different vision models put the text under different keys; be tolerant.
    const r = data && data.result ? data.result : {};
    const text = (r.response || r.description || r.text || '').trim();
    return { ok: true, text };
  }

  // ── Adapter: OpenRouter ─────────────────────────────────────────────────────
  async function openRouterExtract(buffer, mediaType) {
    const dataUrl = `data:${mediaType};base64,${buffer.toString('base64')}`;
    const t0 = Date.now();
    console.log('[VAULT] → OpenRouter (model=%s, bytes=%d)', OR_MODEL, dataUrl.length);
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://linknpark.in',
        'X-Title': 'LinkNPark Document Vault',
      },
      body: JSON.stringify({
        model: OR_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    console.log('[VAULT] ← OpenRouter responded %d in %dms', aiRes.status, Date.now() - t0);
    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      return { ok: false, status: aiRes.status, detail };
    }
    const data = await aiRes.json();
    const msg = data.choices?.[0]?.message || {};
    return { ok: true, text: ((msg.content || msg.reasoning || '')).trim() };
  }

  // Seam: one interface, two adapters. Retry once on an empty reply.
  async function extract(buffer, mediaType) {
    const run = () => (PROVIDER === 'openrouter'
      ? openRouterExtract(buffer, mediaType)
      : cloudflareExtract(buffer));
    let result = await run();
    if (result.ok && !result.text) result = await run();
    return result;
  }

  // Provider-agnostic: pull the JSON object out of the model's text reply.
  function parseFields(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const fields = JSON.parse(match[0]);
    return {
      docType: typeof fields.docType === 'string' ? fields.docType : 'other',
      vehicleName: String(fields.vehicleName || '').trim(),
      docNumber: String(fields.docNumber || '').trim(),
      expiry: String(fields.expiry || '').trim(),
      notes: String(fields.notes || '').trim(),
    };
  }

  const noUpload = (req, res, next) => next();

  router.post('/api/vault/extract', auth, upload ? upload.single('image') : noUpload, async (req, res) => {
    if (PROVIDER === 'cloudflare' ? !cfConfigured : !orConfigured) {
      return res.status(503).json({ error: `Document scanning is not configured (provider=${PROVIDER}).` });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'image file required' });
    }

    const mediaType = req.file.mimetype && req.file.mimetype.startsWith('image/')
      ? req.file.mimetype
      : 'image/jpeg';

    try {
      const result = await extract(req.file.buffer, mediaType);
      if (!result.ok) {
        console.error('[VAULT] %s error %s %s', PROVIDER, result.status, (result.detail || '').slice(0, 300));
        return res.status(502).json({ error: 'Could not read the document. Please try again or enter manually.' });
      }
      const fields = parseFields(result.text);
      if (!fields) {
        console.warn('[VAULT] no JSON in reply. provider=%s raw=%j', PROVIDER, (result.text || '').slice(0, 600));
        return res.status(422).json({ error: 'Could not extract fields. Please enter manually.' });
      }
      return res.json(fields);
    } catch (e) {
      console.error('[VAULT] extract failed', e.message);
      return res.status(500).json({ error: 'Scan failed. Please try again or enter manually.' });
    }
  });

  return { router };
};
