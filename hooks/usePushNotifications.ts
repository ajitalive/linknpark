import { useEffect, useRef, useCallback } from 'react';

export const API_BASE = 'https://linknpark.onrender.com';
const WS_URL = 'wss://linknpark.onrender.com';
const PROTOTYPE_STICKER_CODE = 'STK-2025-AB1234';

export type ReportPayload = {
  reportId: string;
  reason: string;
  reasonLabel: string;
  message: string | null;
  ts: number;
};

type OnReportCallback = (report: ReportPayload) => void;
type OnConnectCallback = (connected: boolean) => void;

export function useReportSocket(onReport: OnReportCallback, onConnect?: OnConnectCallback) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReportRef = useRef(onReport);
  const onConnectRef = useRef(onConnect);
  onReportRef.current = onReport;
  onConnectRef.current = onConnect;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      onConnectRef.current?.(true);
      socket.send(JSON.stringify({ type: 'subscribe', stickerCode: PROTOTYPE_STICKER_CODE }));
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
          onReportRef.current(msg);
        }
      } catch {}
    };

    socket.onerror = () => {
      onConnectRef.current?.(false);
    };

    socket.onclose = () => {
      onConnectRef.current?.(false);
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
