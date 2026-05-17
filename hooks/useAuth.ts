import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './usePushNotifications';

const TOKEN_KEY = 'linknpark_auth_token';
const USER_KEY = 'linknpark_auth_user';

export type AuthUser = { email: string };

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAuth(token: string, user: AuthUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function sendOTP(email: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send OTP' };
    return { ok: true, devCode: data.devCode };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export async function verifyOTP(email: string, code: string): Promise<{ ok: boolean; error?: string; token?: string; user?: AuthUser }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Invalid code' };
    await saveAuth(data.token, data.user);
    return { ok: true, token: data.token, user: data.user };
  } catch (e: any) {
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
    setUser(null);
  }, []);

  return { user, loading, signOut, setUser };
}
