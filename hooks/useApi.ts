import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from './usePushNotifications';
import { getToken } from './useAuth';
import { cache, clearApiCache } from './apiCache';

export { clearApiCache };

const STALE_MS = 30_000; // re-fetch only if data is older than 30 seconds

const stickerListeners = new Set<() => void>();
const incidentListeners = new Set<() => void>();

function notifyStickers() { stickerListeners.forEach(fn => fn()); }
function notifyIncidents() { incidentListeners.forEach(fn => fn()); }

// Warm up the Render server before auth requests fire
let _pinged = false;
export function warmupServer() {
  if (_pinged) return;
  _pinged = true;
  fetch(`${API_BASE}/health`).catch(() => {});
}

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
  tag_type: string;
  tag_title: string | null;
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
  photo_url: string | null;
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
  if (!cache.token) cache.token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cache.token ? { Authorization: `Bearer ${cache.token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) cache.token = null;
    throw new Error(data.error || `Request failed (${res.status})`);
  }
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
  tag_type?: string;
  tag_title?: string;
  parking_slot?: string;
  society?: string;
}): Promise<Sticker> {
  // The production backend expects plate_number and vehicle_color
  const payload = {
    ...input,
    plate_number: input.registration,
    vehicle_color: input.color,
  };
  const d = await authFetch('/api/stickers', { method: 'POST', body: JSON.stringify(payload) });
  
  let resultSticker = d.sticker;
  if (input.backup_phone) {
    resultSticker = await updateSticker(d.sticker.id, { backup_phone: input.backup_phone });
  }
  
  if (Array.isArray(cache.stickers)) {
    cache.stickers = [resultSticker, ...cache.stickers];
    cache.stickersFetchedAt = 0; // Force network fetch next time
    notifyStickers();
  }
  
  return resultSticker;
}

export async function updateSticker(id: string, patch: Partial<Sticker>): Promise<Sticker> {
  const d = await authFetch(`/api/stickers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return d.sticker;
}

export async function deleteSticker(id: string): Promise<void> {
  await authFetch(`/api/stickers/${id}`, { method: 'DELETE' });
  if (Array.isArray(cache.stickers)) {
    cache.stickers = cache.stickers.filter((s: any) => s.id !== id);
    cache.stickersFetchedAt = 0;
    notifyStickers();
  }
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
  const [stickers, setStickers] = useState<Sticker[]>((cache.stickers as Sticker[]) ?? []);
  const [loading, setLoading] = useState(cache.stickers === null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Broadcast listener — other hook instances push updates here
  useEffect(() => {
    mounted.current = true;
    const notify = () => {
      if (mounted.current && cache.stickers) setStickers([...(cache.stickers as Sticker[])]);
    };
    stickerListeners.add(notify);
    return () => { mounted.current = false; stickerListeners.delete(notify); };
  }, []);

  // Stable refresh — always fetches, safe to use as useFocusEffect dependency
  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listStickers();
      cache.stickers = data;
      cache.stickersFetchedAt = Date.now();
      if (mounted.current) setStickers(data);
      notifyStickers();
    } catch (e: any) {
      if (mounted.current) setError(e?.message || 'Failed to load');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []); // empty deps → same reference every render, no infinite loops

  // On mount: only fetch if cache is empty or stale
  useEffect(() => {
    const isStale = Date.now() - cache.stickersFetchedAt > STALE_MS;
    if (cache.stickers === null || isStale) refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { stickers, loading, error, refresh };
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>((cache.incidents as Incident[]) ?? []);
  const [loading, setLoading] = useState(cache.incidents === null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const notify = () => {
      if (mounted.current && cache.incidents) setIncidents([...(cache.incidents as Incident[])]);
    };
    incidentListeners.add(notify);
    return () => { mounted.current = false; incidentListeners.delete(notify); };
  }, []);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listIncidents();
      cache.incidents = data;
      cache.incidentsFetchedAt = Date.now();
      if (mounted.current) setIncidents(data);
      notifyIncidents();
    } catch (e: any) {
      if (mounted.current) setError(e?.message || 'Failed to load');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []); // stable reference

  useEffect(() => {
    const isStale = Date.now() - cache.incidentsFetchedAt > STALE_MS;
    if (cache.incidents === null || isStale) refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setIncidentsLocal = useCallback((updater: (prev: Incident[]) => Incident[]) => {
    const next = updater((cache.incidents as Incident[]) ?? []);
    cache.incidents = next;
    cache.incidentsFetchedAt = Date.now();
    setIncidents(next);
    notifyIncidents();
  }, []);

  return { incidents, loading, error, refresh, setIncidents: setIncidentsLocal };
}
