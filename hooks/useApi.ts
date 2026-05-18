import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from './usePushNotifications';
import { getToken } from './useAuth';

export type Sticker = {
  id: string;
  code: string;
  owner_email: string;
  vehicle_type: string;
  vehicle_name: string | null;
  registration: string;
  color: string | null;
  status: string;
  backup_phone: string | null;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
};

export type Incident = {
  id: string;
  sticker_code: string;
  reason: string;
  reason_label: string;
  message: string | null;
  reporter_phone: string | null;
  has_photo: boolean;
  severity: string;
  status: string;
  reported_at: string;
  resolved_at: string | null;
  stickers?: {
    vehicle_name: string | null;
    registration: string;
    vehicle_type: string;
  };
};

async function authFetch(path: string, init?: RequestInit) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ===== Stickers =====
export async function listStickers(): Promise<Sticker[]> {
  const d = await authFetch('/api/stickers');
  return d.stickers || [];
}

export async function createSticker(input: {
  code: string;
  vehicle_type: string;
  vehicle_name?: string;
  registration: string;
  color?: string;
  backup_phone?: string;
}): Promise<Sticker> {
  const d = await authFetch('/api/stickers', { method: 'POST', body: JSON.stringify(input) });
  return d.sticker;
}

export async function updateSticker(id: string, patch: Partial<Sticker>): Promise<Sticker> {
  const d = await authFetch(`/api/stickers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return d.sticker;
}

export async function deleteSticker(id: string): Promise<void> {
  await authFetch(`/api/stickers/${id}`, { method: 'DELETE' });
}

// ===== Incidents =====
export async function listIncidents(): Promise<Incident[]> {
  const d = await authFetch('/api/incidents');
  return d.incidents || [];
}

export async function resolveIncident(id: string, status: 'resolved' | 'dismissed' = 'resolved'): Promise<Incident> {
  const d = await authFetch(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  return d.incident;
}

// ===== Hooks =====
export function useStickers() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStickers(await listStickers());
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stickers, loading, error, refresh };
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIncidents(await listIncidents());
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { incidents, loading, error, refresh, setIncidents };
}
