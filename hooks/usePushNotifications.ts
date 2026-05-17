import { useEffect, useRef, useCallback } from 'react';

export const API_BASE = 'https://linknpark.onrender.com';
const WS_URL = 'wss://athletic-generosity-production-a534.up.railway.app';
const PROTOTYPE_STICKER_CODE = 'STK-2025-AB1234';

export type ReportPayload = {
  reportId: string;
  reason: string;
  reasonLabel: string;
  message: string | null;
  ts: number;
};

type OnReportCallback = (report: ReportPayload) => void;

export function useReportSocket(onReport: OnReportCallback) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    console.log('[WS] Connecting to', WS_URL);
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      console.log('[WS] ✅ Connected');
      socket.send(JSON.stringify({ type: 'subscribe', stickerCode: PROTOTYPE_STICKER_CODE }));
      // Also register vehicle info
      fetch(`${API_BASE}/api/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stickerCode: PROTOTYPE_STICKER_CODE,
          vehicleInfo: {
            type: 'car', color: 'Silver',
            make: 'Honda City', platePartial: 'MH 12 ██ ████',
          },
        }),
      }).catch(() => {});
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_report') {
          console.log('[WS] 🔔 New report:', msg.reportId);
          onReportRef.current(msg);
        }
      } catch {}
    };

    socket.onerror = (e) => {
      console.log('[WS] Connection error — check API server and WiFi');
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected — retrying in 5s');
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);
}
