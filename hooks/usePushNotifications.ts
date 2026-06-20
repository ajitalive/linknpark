import { useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

const getApiBase = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:5500';
    return 'http://localhost:5500';
  }
  return 'https://linknpark.onrender.com';
};

export const API_BASE: string = getApiBase();

const WS_URL = API_BASE.replace(/^http/, 'ws');

export type ReportPayload = {
  reportId: string;
  reason: string;
  reasonLabel: string;
  message: string | null;
  stickerCode?: string;
  ts: number;
};

type OnReportCallback = (report: ReportPayload) => void;
type OnConnectCallback = (connected: boolean) => void;

export function useReportSocket(
  onReport: OnReportCallback,
  onConnect?: OnConnectCallback,
  stickerCodes: string[] = [],
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReportRef = useRef(onReport);
  const onConnectRef = useRef(onConnect);
  const codesRef = useRef(stickerCodes);
  onReportRef.current = onReport;
  onConnectRef.current = onConnect;
  codesRef.current = stickerCodes;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      onConnectRef.current?.(true);
      const codes = codesRef.current.length > 0
        ? codesRef.current
        : ['STK-2025-AB1234'];
      codes.forEach(code => {
        socket.send(JSON.stringify({ type: 'subscribe', stickerCode: code }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_report') {
          onReportRef.current(msg);
        }
      } catch {}
    };

    socket.onerror = () => onConnectRef.current?.(false);
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

  // Re-subscribe when sticker codes change
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      stickerCodes.forEach(code => {
        ws.current!.send(JSON.stringify({ type: 'subscribe', stickerCode: code }));
      });
    }
  }, [stickerCodes.join(',')]);
}
