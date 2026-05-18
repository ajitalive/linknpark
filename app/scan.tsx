import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Button } from '../components/ui';

const STICKER_CODE_REGEX = /STK-\d{4}-[A-Z]{2}\d{4}/i;

function extractCode(raw: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const codeParam = url.searchParams.get('code');
    if (codeParam) return codeParam.toUpperCase();
  } catch {}
  const match = raw.match(STICKER_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const lastScanRef = useRef<number>(0);

  function handleBarcodeScanned({ data }: { data: string }) {
    const now = Date.now();
    if (scanned || now - lastScanRef.current < 1500) return;
    lastScanRef.current = now;

    const code = extractCode(data);
    if (!code) return;

    setScanned(true);
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }

    router.replace({
      pathname: (returnTo as any) || '/activate',
      params: { code },
    });
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg, padding: 32 }]}>
        <View style={styles.permIcon}>
          <Ionicons name="camera" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          LinkNPark uses your camera to scan sticker QR codes during activation.
          Your photos and video are never stored or sent anywhere.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Allow Camera" onPress={requestPermission} size="lg" style={{ marginTop: 24, width: '100%' }} />
        ) : (
          <Button label="Open Settings" onPress={() => Linking.openSettings()} size="lg" style={{ marginTop: 24, width: '100%' }} />
        )}
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Scan Sticker QR</Text>
        <TouchableOpacity onPress={() => setTorchOn(v => !v)} style={styles.iconBtn}>
          <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      <View style={[styles.hintBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hintCard}>
          <Ionicons name="qr-code" size={18} color={Colors.primary} />
          <Text style={styles.hintText}>
            Point camera at the QR code on your sticker
          </Text>
        </View>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => router.replace({ pathname: '/activate', params: { manual: '1' } })}
        >
          <Text style={styles.manualText}>Enter code manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  permTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  permSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  cancelLink: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', ...StyleSheet.absoluteFillObject },
  frame: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#2CFF05' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },

  hintBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 24, gap: 14,
  },
  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 18,
  },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  manualBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  manualText: { color: '#fff', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
