import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE } from './usePushNotifications';
import { clearApiCache } from './apiCache';

const TOKEN_KEY = 'linknpark_auth_token';
const USER_KEY = 'linknpark_auth_user';

export type AuthUser = { email: string; name?: string; };

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = Platform.OS === 'web' 
    ? localStorage.getItem(USER_KEY) 
    : await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAuth(token: string, user: AuthUser) {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearAuth() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function sendOTP(email: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }, 55_000);
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send OTP' };
    return { ok: true, devCode: data.devCode };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Server took too long. Please try again.' };
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export async function verifyOTP(email: string, code: string): Promise<{ ok: boolean; error?: string; token?: string; user?: AuthUser }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    }, 55_000);
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Invalid code' };
    await saveAuth(data.token, data.user);
    return { ok: true, token: data.token, user: data.user };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Server took too long. Please try again.' };
    return { ok: false, error: e?.message || 'Network error' };
  }
}
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function warmUpServer(): Promise<void> {
  try {
    await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 55_000);
  } catch (_) {
    // Ignore — we just want to wake Render up; main request handles real errors
  }
}

export async function truecallerLogin(authorizationCode: string, codeVerifier: string): Promise<{ ok: boolean; error?: string; token?: string; user?: AuthUser }> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/auth/truecaller`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode, codeVerifier }),
      },
      55_000, // 55-second timeout — longer than Render cold-start
    );
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Truecaller login failed' };
    await saveAuth(data.token, data.user);
    return { ok: true, token: data.token, user: data.user };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, error: 'Server took too long to respond. Please try again.' };
    }
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getStoredUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    clearApiCache();
    setUser(null);
  }, []);

  return { user, loading, signOut, setUser };
}
