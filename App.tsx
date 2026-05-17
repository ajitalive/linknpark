import { StatusBar } from 'expo-status-bar';
import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Modal, Vibration, Animated, Pressable, Linking,
} from 'react-native';
import { useReportSocket, ReportPayload, API_BASE } from './hooks/usePushNotifications';

const STICKER_CODE = 'STK-2025-AB1234';

const REASON_ICONS: Record<string, string> = {
  wrong_parking: '🚫',
  accident: '⚠️',
  emergency: '🆘',
  lights_on: '💡',
  blocking: '🚧',
  other: '💬',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <View style={[styles.badge, connected ? styles.badgeOn : styles.badgeOff]}>
      <View style={[styles.badgeDot, connected ? styles.dotOn : styles.dotOff]} />
      <Text style={[styles.badgeText, connected ? styles.badgeTextOn : styles.badgeTextOff]}>
        {connected ? 'Live' : 'Connecting…'}
      </Text>
    </View>
  );
}

function ReportCard({ report, onPress }: { report: ReportPayload; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.reportIcon}>{REASON_ICONS[report.reason] ?? '📢'}</Text>
      <View style={styles.reportMeta}>
        <Text style={styles.reportLabel}>{report.reasonLabel}</Text>
        {report.message ? (
          <Text style={styles.reportMessage} numberOfLines={1}>{report.message}</Text>
        ) : null}
      </View>
      <Text style={styles.reportTime}>{timeAgo(report.ts)}</Text>
    </TouchableOpacity>
  );
}

function ReportModal({ report, onClose }: { report: ReportPayload | null; onClose: () => void }) {
  if (!report) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetIcon}>{REASON_ICONS[report.reason] ?? '📢'}</Text>
          <Text style={styles.sheetTitle}>{report.reasonLabel}</Text>
          <Text style={styles.sheetId}>Report #{report.reportId.slice(-6).toUpperCase()}</Text>
          {report.message ? (
            <View style={styles.sheetMsgBox}>
              <Text style={styles.sheetMsgLabel}>Message from reporter</Text>
              <Text style={styles.sheetMsg}>"{report.message}"</Text>
            </View>
          ) : (
            <View style={styles.sheetMsgBox}>
              <Text style={styles.sheetMsgLabel}>No additional message</Text>
            </View>
          )}
          <Text style={styles.sheetTime}>{new Date(report.ts).toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.sheetBtn} onPress={onClose}>
            <Text style={styles.sheetBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [reports, setReports] = useState<ReportPayload[]>([]);
  const [selected, setSelected] = useState<ReportPayload | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const handleReport = useCallback((report: ReportPayload) => {
    setReports(prev => [report, ...prev].slice(0, 50));
    setNewAlert(true);
    setSelected(report);
    Vibration.vibrate([0, 200, 100, 200]);
    triggerPulse();
  }, [triggerPulse]);

  useReportSocket(handleReport, setConnected);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>LinkNPark</Text>
          <Text style={styles.brandSub}>Vehicle Alert System</Text>
        </View>
        <ConnectionBadge connected={connected} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Sticker card */}
        <Animated.View style={[styles.stickerCard, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.stickerCardTop}>
            <View>
              <Text style={styles.stickerLabel}>Your Sticker</Text>
              <Text style={styles.stickerCode}>{STICKER_CODE}</Text>
            </View>
            <View style={styles.stickerQrPlaceholder}>
              <Text style={styles.stickerQrText}>QR</Text>
            </View>
          </View>
          <View style={styles.stickerCardBottom}>
            <Text style={styles.vehicleInfo}>🚗  Honda City  •  Silver  •  MH 12 ██ ████</Text>
          </View>
        </Animated.View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{reports.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statNum}>
              {reports.filter(r => Date.now() - r.ts < 86400000).length}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{connected ? '🟢' : '🔴'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Quick action */}
        <TouchableOpacity
          style={styles.scannerLink}
          onPress={() => Linking.openURL(`https://scan.linknpark.in?code=${STICKER_CODE}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.scannerLinkIcon}>🔗</Text>
          <View>
            <Text style={styles.scannerLinkTitle}>Test Your Sticker</Text>
            <Text style={styles.scannerLinkSub}>Open scan.linknpark.in in browser</Text>
          </View>
          <Text style={styles.scannerLinkArrow}>›</Text>
        </TouchableOpacity>

        {/* Alerts list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Alerts {newAlert && reports.length > 0 ? `(${reports.length})` : ''}
          </Text>
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySub}>You'll be notified instantly when someone scans your sticker</Text>
            </View>
          ) : (
            reports.map(r => (
              <ReportCard key={r.reportId} report={r} onPress={() => setSelected(r)} />
            ))
          )}
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          {[
            { step: '1', text: 'Stick your LinkNPark sticker on your vehicle' },
            { step: '2', text: 'Someone scans the QR code with their phone camera' },
            { step: '3', text: 'They select a reason and send a report' },
            { step: '4', text: 'You get an instant alert on this app' },
          ].map(item => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{item.step}</Text>
              </View>
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <ReportModal report={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const C = {
  bg: '#06090F',
  card: '#0F1419',
  card2: '#131A24',
  green: '#2CFF05',
  indigo: '#3B2FF5',
  border: '#1E2A35',
  textPrimary: '#FFFFFF',
  textSecondary: '#8899AA',
  textMuted: '#4A5568',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
  },
  brand: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeOn: { backgroundColor: 'rgba(44,255,5,0.12)', borderWidth: 1, borderColor: 'rgba(44,255,5,0.3)' },
  badgeOff: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: C.green },
  dotOff: { backgroundColor: C.textMuted },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextOn: { color: C.green },
  badgeTextOff: { color: C.textSecondary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  stickerCard: {
    backgroundColor: C.green, borderRadius: 16, padding: 20, marginBottom: 16,
  },
  stickerCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  stickerLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  stickerCode: { fontSize: 20, fontWeight: '900', color: '#000', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  stickerQrPlaceholder: {
    width: 52, height: 52, backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  stickerQrText: { fontSize: 12, fontWeight: '800', color: 'rgba(0,0,0,0.4)' },
  stickerCardBottom: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.12)', paddingTop: 12 },
  vehicleInfo: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.7)' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: C.card, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statBoxMid: { borderColor: 'rgba(59,47,245,0.3)', backgroundColor: 'rgba(59,47,245,0.08)' },
  statNum: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },

  scannerLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 24,
  },
  scannerLinkIcon: { fontSize: 20 },
  scannerLinkTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  scannerLinkSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  scannerLinkArrow: { marginLeft: 'auto', fontSize: 22, color: C.textMuted },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  reportIcon: { fontSize: 24 },
  reportMeta: { flex: 1 },
  reportLabel: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  reportMessage: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  reportTime: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  howItWorks: { marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(59,47,245,0.2)', borderWidth: 1, borderColor: C.indigo,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 12, fontWeight: '800', color: C.indigo },
  stepText: { fontSize: 14, color: C.textSecondary, lineHeight: 20, flex: 1, paddingTop: 4 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: 'center',
    borderTopWidth: 1, borderColor: C.border,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 24 },
  sheetIcon: { fontSize: 48, marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  sheetId: { fontSize: 12, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 20 },
  sheetMsgBox: {
    width: '100%', backgroundColor: C.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  sheetMsgLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  sheetMsg: { fontSize: 15, color: C.textPrimary, lineHeight: 22, fontStyle: 'italic' },
  sheetTime: { fontSize: 12, color: C.textMuted, marginBottom: 24 },
  sheetBtn: {
    width: '100%', backgroundColor: C.indigo, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  sheetBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
