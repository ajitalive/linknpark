'use strict';
/**
 * routes/auth.js
 * Auth routes: Email OTP, Truecaller, JWT middleware, profile
 *
 * Factory args:
 *   supabase              – Supabase client (may be null in local dev)
 *   jwt                   – jsonwebtoken module
 *   JWT_SECRET_RESOLVED   – resolved JWT secret
 *   otpStore              – fallback in-memory Map (used when supabase is null)
 *   resend                – Resend client (may be null)
 *   FROM_EMAIL            – sender address
 *   OTP_TTL_MS            – OTP lifetime in milliseconds
 */
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');

module.exports = function createAuthRouter({
  supabase,
  jwt,
  JWT_SECRET_RESOLVED,
  otpStore,
  resend,
  FROM_EMAIL,
  OTP_TTL_MS,
}) {
  const router = require('express').Router();

  // ── Helpers ──────────────────────────────────────────────────────────────

  function generateOTP() {
    return String(crypto.randomInt(100000, 1000000));
  }

  function otpEmail(code) {
    return `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#06090F;color:#fff;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:#2CFF05;color:#000;font-weight:900;padding:10px 20px;border-radius:10px;font-size:18px">LinkNPark</div>
      </div>
      <h1 style="font-size:22px;margin:0 0 12px">Your verification code</h1>
      <p style="color:#8899AA;font-size:15px;line-height:22px;margin:0 0 24px">
        Enter this code in the LinkNPark app to sign in. Code expires in 5 minutes.
      </p>
      <div style="background:#0F1419;border:1px solid #1E2A35;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#2CFF05;font-family:'SF Mono',monospace">${code}</div>
      </div>
      <p style="color:#4A5568;font-size:12px;line-height:18px;margin:0">
        If you didn't request this, you can safely ignore this email. Someone may have typed your address by mistake.
      </p>
    </div>
  `;
  }

  // ── Rate limiter: 10 OTP requests per hour per IP ─────────────────────────
  const otpRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many OTP requests from this IP. Please try again in an hour.' },
    handler: (req, res, next, options) => {
      console.warn(`[RATE-LIMIT] OTP rate limit hit for IP: ${req.ip}`);
      res.status(options.statusCode).json(options.message);
    },
  });

  // ── OTP store helpers (Supabase-backed with in-memory fallback) ───────────

  async function storeOTP(email, code, expiresAt) {
    if (!supabase) {
      // Fallback: in-memory Map
      console.warn('[OTP] Supabase not configured — using in-memory OTP store (dev only)');
      otpStore.set(email, { code, expiresAt: expiresAt.getTime(), attempts: 0 });
      return;
    }
    const { error } = await supabase.from('otps').upsert(
      { email, code, expires_at: expiresAt.toISOString(), attempts: 0 },
      { onConflict: 'email' }
    );
    if (error) throw new Error(`OTP store failed: ${error.message}`);
  }

  async function getOTP(email) {
    if (!supabase) {
      const entry = otpStore.get(email);
      if (!entry) return null;
      // Convert to a shape consistent with DB rows
      return { code: entry.code, expires_at: new Date(entry.expiresAt).toISOString(), attempts: entry.attempts };
    }
    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(`OTP lookup failed: ${error.message}`);
    return data; // null if not found or expired
  }

  async function incrementAttempts(email, currentAttempts) {
    if (!supabase) {
      const entry = otpStore.get(email);
      if (entry) entry.attempts = currentAttempts + 1;
      return;
    }
    await supabase.from('otps').update({ attempts: currentAttempts + 1 }).eq('email', email);
  }

  async function deleteOTP(email) {
    if (!supabase) {
      otpStore.delete(email);
      return;
    }
    await supabase.from('otps').delete().eq('email', email);
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  router.post('/api/auth/send-otp', otpRateLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    try {
      await storeOTP(normalizedEmail, code, expiresAt);
    } catch (err) {
      console.error('[OTP] Store error:', err.message);
      return res.status(500).json({ error: 'Failed to store OTP', detail: err.message });
    }

    console.log(`[OTP] Sent to ${normalizedEmail}: ${code}`);

    if (!resend) {
      return res.json({ ok: true, devCode: code, note: 'Resend not configured — using dev code' });
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: `${code} is your LinkNPark code`,
        html: otpEmail(code),
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('[OTP] Resend error:', err.message);
      res.status(500).json({ error: 'Failed to send email', detail: err.message });
    }
  });

  router.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email and code required' });
    const normalizedEmail = email.toLowerCase().trim();

    let entry;
    try {
      entry = await getOTP(normalizedEmail);
    } catch (err) {
      console.error('[OTP] Lookup error:', err.message);
      return res.status(500).json({ error: 'OTP lookup failed', detail: err.message });
    }

    if (!entry) return res.status(400).json({ error: 'No OTP requested — please send a new code' });

    // Check expiry (belt-and-suspenders: DB query already filters, but keep for in-memory path)
    if (new Date(entry.expires_at) < new Date()) {
      try { await deleteOTP(normalizedEmail); } catch(e) { console.error('deleteOTP error:', e); }
      return res.status(400).json({ error: 'Code expired — please request a new one' });
    }

    if (entry.attempts >= 5) {
      try { await deleteOTP(normalizedEmail); } catch(e) { console.error('deleteOTP error:', e); }
      return res.status(429).json({ error: 'Too many attempts — please request a new code' });
    }

    if (entry.code !== String(code).trim()) {
      try { await incrementAttempts(normalizedEmail, entry.attempts); } catch(e) { console.error('incrementAttempts error:', e); }
      return res.status(400).json({ error: 'Incorrect code', attemptsLeft: 5 - (entry.attempts + 1) });
    }

    try { await deleteOTP(normalizedEmail); } catch(e) { console.error('deleteOTP error:', e); }
    const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET_RESOLVED, { expiresIn: '90d' });
    console.log(`[AUTH] ${normalizedEmail} verified`);
    res.json({ ok: true, token, user: { email: normalizedEmail } });
  });

  router.post('/api/auth/truecaller', async (req, res) => {
    const { authorizationCode, codeVerifier } = req.body;
    const clientId = process.env.TRUECALLER_CLIENT_ID || 'ut7yqtyuuc6dwiyfjk1u_4hnlhuspwbhr-4qr0sp0pe';

    if (!authorizationCode || !codeVerifier) {
      return res.status(400).json({ error: 'Missing authorizationCode or codeVerifier' });
    }

    try {
      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('client_id', clientId);
      tokenParams.append('code', authorizationCode);
      tokenParams.append('code_verifier', codeVerifier);

      const tokenRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`);
      }

      const profileRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(`Profile fetch failed: ${profileData.error_description || profileData.error || profileRes.statusText}`);
      }

      const normalizedIdentity = String(profileData.phone_number).trim();
      if (!normalizedIdentity) {
        return res.status(400).json({ error: 'Truecaller profile did not return a phone number' });
      }

      const token = jwt.sign(
        { email: normalizedIdentity, name: profileData.name },
        JWT_SECRET_RESOLVED,
        { expiresIn: '90d' }
      );
      console.log(`[AUTH] Truecaller login verified for ${normalizedIdentity}`);
      res.json({ ok: true, token, user: { email: normalizedIdentity, name: profileData.name } });
    } catch (err) {
      console.error('[AUTH] Truecaller Error:', err.message);
      res.status(500).json({ error: 'Truecaller authentication failed', detail: err.message });
    }
  });

  // ── requireAuth middleware (exported so other routers can use it) ──────────
  function requireAuth(req, res, next) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      req.user = jwt.verify(token, JWT_SECRET_RESOLVED);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  router.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post('/api/auth/update', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const trimmedName = name.trim();

    if (supabase) {
      const { error } = await supabase
        .from('users')
        .update({ name: trimmedName })
        .eq('email', req.user.email);
      // Log but don't block — users table may not exist yet; name persists in JWT anyway
      if (error) console.warn('[AUTH] Could not persist name to DB:', error.message);
    }

    const updatedUser = { ...req.user, name: trimmedName };
    delete updatedUser.iat;
    delete updatedUser.exp;
    const token = jwt.sign(updatedUser, JWT_SECRET_RESOLVED, { expiresIn: '90d' });
    res.json({ ok: true, token, user: updatedUser });
  });

  return { router, requireAuth };
};
