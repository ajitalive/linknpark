'use strict';

const express = require('express');

/**
 * Document Vault — AI field extraction (via OpenRouter).
 *
 *   POST /api/vault/extract   (multipart: image)
 *
 * Reads an Indian vehicle document (RC / insurance / PUC / licence) with a
 * vision model and returns structured fields so the app can pre-fill the
 * "Add Document" form instead of the user typing everything by hand.
 *
 * The image is processed in-memory for a single request and never stored.
 *
 * Env:
 *   OPENROUTER_API_KEY   (required)
 *   OPENROUTER_MODEL     (optional; default 'openai/gpt-4o-mini' — cheap + vision)
 */
module.exports = function vaultRoutes({ upload }) {
  const router = express.Router();

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  // Must be a VISION-capable model. Free options:
  //   nvidia/nemotron-nano-12b-v2-vl:free  (document intelligence — primary)
  //   google/gemma-4-31b-it:free           (multimodal — fallback)
  const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

  const noUpload = (req, res, next) => next();

  router.post('/api/vault/extract', upload ? upload.single('image') : noUpload, async (req, res) => {
    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'Document scanning is not configured (OPENROUTER_API_KEY missing).' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'image file required' });
    }

    const mediaType = req.file.mimetype && req.file.mimetype.startsWith('image/')
      ? req.file.mimetype
      : 'image/jpeg';
    const dataUrl = `data:${mediaType};base64,${req.file.buffer.toString('base64')}`;

    const prompt = [
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

    // Free vision models occasionally return empty content, so allow one retry.
    async function callModel() {
      console.log('[VAULT] → OpenRouter request (model=%s, bytes=%d)', MODEL, dataUrl.length);
      const t0 = Date.now();
      const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'content-type': 'application/json',
          'HTTP-Referer': 'https://linknpark.in',
          'X-Title': 'LinkNPark Document Vault',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          // No response_format: many free models reject it. We extract JSON from the
          // text reply instead (see the regex below), which works on any model.
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
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
      // Some reasoning models leave `content` empty and put the answer in `reasoning`.
      return { ok: true, text: ((msg.content || msg.reasoning || '')).trim() };
    }

    try {
      let result = await callModel();
      if (result.ok && !result.text) result = await callModel(); // one retry on empty

      if (!result.ok) {
        console.error('[VAULT] OpenRouter error', result.status, (result.detail || '').slice(0, 300));
        return res.status(502).json({ error: 'Could not read the document. Please try again or enter manually.' });
      }

      const text = result.text;
      // Pull the JSON object out of the response, tolerating markdown fences/prose.
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        console.warn('[VAULT] no JSON in model reply. model=%s raw=%j', MODEL, text.slice(0, 600));
        return res.status(422).json({ error: 'Could not extract fields. Please enter manually.' });
      }
      const fields = JSON.parse(match[0]);

      return res.json({
        docType: typeof fields.docType === 'string' ? fields.docType : 'other',
        vehicleName: String(fields.vehicleName || '').trim(),
        docNumber: String(fields.docNumber || '').trim(),
        expiry: String(fields.expiry || '').trim(),
        notes: String(fields.notes || '').trim(),
      });
    } catch (e) {
      console.error('[VAULT] extract failed', e.message);
      return res.status(500).json({ error: 'Scan failed. Please try again or enter manually.' });
    }
  });

  return { router };
};
