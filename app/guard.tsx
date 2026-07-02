import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Animated, Easing, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { API_BASE as API_URL } from '../hooks/usePushNotifications';
import { getToken } from '../hooks/useAuth';
import { confirmAction } from '../components/confirm';

const { width } = Dimensions.get('window');

// Dark theme specific colors
const GuardColors = {
  bg: '#0B0F19',
  surface: 'rgba(20, 26, 40, 0.7)',
  surfaceLight: 'rgba(30, 40, 60, 0.8)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  primary: '#00F0FF', // Cyan neon
  primaryDark: '#007A8A',
  secondary: '#8B5CF6', // Purple neon
  critical: '#FF2A55',
  warning: '#F59E0B',
  success: '#10B981',
};

const INCIDENT_TYPES = [
  { id: 'blocking_exit', icon: 'alert-circle', label: 'Blocking\nExit', color: GuardColors.warning, urgent: true },
  { id: 'wrong_parking', icon: 'warning', label: 'Wrong\nParking', color: GuardColors.secondary, urgent: false },
  { id: 'security_concern', icon: 'shield', label: 'Security\nConcern', color: GuardColors.critical, urgent: true },
  { id: 'lights_on', icon: 'bulb', label: 'Lights\nOn', color: GuardColors.primary, urgent: false },
  { id: 'visitor_arrived', icon: 'person-add', label: 'Visitor\nEntry', color: GuardColors.success, urgent: false },
  { id: 'general', icon: 'notifications', label: 'General\nAlert', color: GuardColors.textSecondary, urgent: false },
];

type GuardMode = 'home' | 'scan' | 'vehicle' | 'incident' | 'done';

function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function GuardScreen() {
  const insets = useSafeAreaInsets();
  const { code: scannedCode } = useLocalSearchParams<{ code?: string }>();
  const [mode, setMode] = useState<GuardMode>('home');
  const [plate, setPlate] = useState('');
  const [found, setFound] = useState<any>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const incidentStartRef = useRef<number | null>(null);

  const [stats, setStats] = useState<{ incidentsToday: number; vehicles: number; openIncidents: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function fetchStats() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/guard/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setRecent(data.recent || []);
      }
    } catch (e) {
      console.error('guard stats error', e);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  // Count the response timer down once per second while an incident is active
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
      if (incidentStartRef.current) {
        setElapsedSec(Math.floor((Date.now() - incidentStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  // Fade animation for mode transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (nextMode: GuardMode) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setMode(nextMode);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  async function runSearch(query: string) {
    const q = query.trim().toUpperCase();
    if (q.length < 4) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/guard/vehicle?query=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.vehicle) {
        setFound(data.vehicle);
        animateTransition('vehicle');
      } else {
        Alert.alert('Not found', data.error || 'No registered vehicle matches that plate or code.');
      }
    } catch (e) {
      Alert.alert('Connection error', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function searchVehicle() {
    runSearch(plate);
  }

  // If we returned from the QR scanner with a sticker code, look it up directly
  useEffect(() => {
    if (scannedCode) {
      setPlate(scannedCode.toUpperCase());
      runSearch(scannedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedCode]);

  async function startContact(incType: string) {
    setSelectedIncident(incType);
    animateTransition('incident');
    setTimer(300); // 5 min countdown
    setElapsedSec(0);
    incidentStartRef.current = Date.now();
    setTimerActive(true);

    if (found?.code) {
      try {
        const token = await getToken();
        await fetch(`${API_URL}/api/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            stickerCode: found.code,
            reason: incType,
            reasonLabel: INCIDENT_TYPES.find(t => t.id === incType)?.label.replace('\n', ' ') || 'Security Incident',
            message: 'A security guard has raised an alert for your vehicle.'
          })
        });
      } catch (e) {
        console.error('Failed to report', e);
      }
    }
  }

  function escalateIncident() {
    if (!found?.code) return;
    confirmAction({
      title: 'Escalate alert?',
      message: 'This re-sends a high-priority notification to the owner.',
      confirmLabel: 'Escalate',
      destructive: true,
      onConfirm: async () => {
            try {
              const token = await getToken();
              await fetch(`${API_URL}/api/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  stickerCode: found.code,
                  reason: selectedIncident || 'security_concern',
                  reasonLabel: 'URGENT — Guard escalation',
                  message: 'URGENT: The security guard has escalated this alert. Please respond immediately.'
                })
              });
              Alert.alert('Escalated', 'A high-priority alert was sent to the owner.');
            } catch (e) {
              Alert.alert('Error', 'Could not escalate. Please try again.');
            }
          },
    });
  }

  function resolveIncident() {
    setTimerActive(false);
    animateTransition('done');
  }

  function reset() {
    animateTransition('home');
    setPlate('');
    setFound(null);
    setSelectedIncident('');
    setTimer(0);
    setElapsedSec(0);
    incidentStartRef.current = null;
    fetchStats();
  }

  return (
    <View style={{ flex: 1, backgroundColor: GuardColors.bg }}>
      {/* Dynamic Header */}
      <LinearGradient
        colors={[GuardColors.bg, 'transparent']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={GuardColors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>TERMINAL</Text>
          <Text style={styles.headerSub}>Green Park Society · Gate 1</Text>
        </View>
        <View style={styles.shiftBadge}>
          <View style={styles.shiftDot} />
          <Text style={styles.shiftText}>ACTIVE</Text>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {mode === 'home' && (
          <GuardHome
            onScan={() => animateTransition('scan')}
            stats={stats}
            recent={recent}
          />
        )}

        {mode === 'scan' && (
          <GuardScan
            plate={plate}
            onPlate={setPlate}
            onSearch={searchVehicle}
            onOpenScanner={() => router.push('/scan?returnTo=/guard' as any)}
            onBack={() => animateTransition('home')}
            loading={loading}
          />
        )}

        {mode === 'vehicle' && found && (
          <GuardVehicleResult
            vehicle={found}
            onIncident={(type: string) => startContact(type)}
            onBack={() => animateTransition('scan')}
          />
        )}

        {mode === 'incident' && found && (
          <GuardIncidentActive
            vehicle={found}
            incidentType={selectedIncident}
            timer={timer}
            onResolve={resolveIncident}
            onEscalate={escalateIncident}
            onBack={() => { setTimerActive(false); animateTransition('vehicle'); }}
          />
        )}

        {mode === 'done' && (
          <GuardDone vehicle={found} elapsedSec={elapsedSec} onReset={reset} />
        )}
      </Animated.ScrollView>
    </View>
  );
}

// ----------------------------------------------------
// COMPONENTS
// ----------------------------------------------------

function GuardHome({ onScan, stats, recent }: { onScan: () => void; stats: any; recent: any[] }) {
  // Breathing animation for main button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View>
      <Text style={styles.modeTitle}>Quick Actions</Text>

      {/* Main scan button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={styles.bigScanBtn} onPress={onScan} activeOpacity={0.85}>
          <LinearGradient 
            colors={[GuardColors.secondary, GuardColors.primary]} 
            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
            style={styles.bigScanGradient}
          >
            <View style={styles.bigScanIcon}>
              <Ionicons name="scan" size={48} color="#fff" />
            </View>
            <Text style={styles.bigScanTitle}>Scan Vehicle Sticker</Text>
            <Text style={styles.bigScanSub}>Tap to open camera or enter plate</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Stats row with Glassmorphism */}
      <View style={styles.statsRow}>
        <StatBox value={stats ? String(stats.incidentsToday) : '—'} label1="Today" color={GuardColors.warning} />
        <StatBox value={stats ? String(stats.vehicles) : '—'} label1="Vehicles" color={GuardColors.primary} />
        <StatBox value={stats ? String(stats.openIncidents) : '—'} label1="Open" color={GuardColors.success} />
      </View>

      {/* Recent activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recent && recent.length > 0 ? (
        <View style={styles.glassCard}>
          {recent.map((r, i) => (
            <View key={r.id} style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: GuardColors.border, paddingTop: 12, marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: GuardColors.text, fontWeight: '700', fontSize: 14 }}>{r.plate}</Text>
                <Text style={{ color: GuardColors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {String(r.reason || '').replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: r.status === 'resolved' ? GuardColors.success : GuardColors.warning, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  {r.status || 'open'}
                </Text>
                <Text style={{ color: GuardColors.textSecondary, fontSize: 11, marginTop: 2 }}>{guardTimeAgo(r.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.glassCard}>
          <Text style={{ color: GuardColors.textSecondary, textAlign: 'center', padding: 20 }}>No activity yet. Scanned vehicles and alerts will appear here.</Text>
        </View>
      )}
    </View>
  );
}

function guardTimeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function GuardScan({ plate, onPlate, onSearch, onOpenScanner, onBack, loading }: any) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60] // Moves up and down within the box
  });

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={GuardColors.primary} />
        <Text style={styles.backRowText}>Return</Text>
      </TouchableOpacity>

      <Text style={styles.modeTitle}>Vehicle Query</Text>

      {/* Animated Camera Box */}
      <TouchableOpacity style={styles.cameraScanBox} onPress={onOpenScanner} activeOpacity={0.8}>
        <Ionicons name="qr-code-outline" size={48} color={GuardColors.textSecondary} />
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
        <Text style={styles.cameraScanTitle}>Tap to open Scanner</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>MANUAL ENTRY</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.plateInput}
        placeholder="PLATE, SLOT (B2-17) OR CODE"
        placeholderTextColor={GuardColors.textSecondary}
        value={plate}
        onChangeText={onPlate}
        autoCapitalize="characters"
        autoFocus
      />

      <TouchableOpacity 
        style={[styles.glowButton, (plate.length < 4 || loading) && styles.glowButtonDisabled]} 
        onPress={onSearch}
        disabled={plate.length < 4 || loading}
      >
        <Text style={styles.glowButtonText}>{loading ? "SEARCHING..." : "QUERY DATABASE"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function GuardVehicleResult({ vehicle, onIncident, onBack }: any) {
  const isRepeat = vehicle.incidents > 1;

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={GuardColors.primary} />
        <Text style={styles.backRowText}>New Query</Text>
      </TouchableOpacity>

      {/* Vehicle found glass card */}
      <View style={[styles.glassCard, { borderLeftWidth: 4, borderLeftColor: GuardColors.primary }]}>
        <View style={styles.foundRow}>
          <View style={styles.foundIcon}>
            <Ionicons name="car-sport" size={28} color={GuardColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.foundPlate}>{vehicle.plate}</Text>
            <Text style={styles.foundType}>{vehicle.color} Car</Text>
          </View>
          {isRepeat && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatText}>REPEAT</Text>
            </View>
          )}
        </View>
        <View style={styles.foundDetails}>
          {vehicle.parkingSlot && (
            <FoundDetail icon="grid-outline" label="Assigned Slot" value={vehicle.parkingSlot} />
          )}
          <FoundDetail icon="person-outline" label="Resident" value={vehicle.resident} />
          <FoundDetail icon="alert-circle-outline" label="History" value={`${vehicle.incidents} ${vehicle.incidents === 1 ? 'Incident' : 'Incidents'}`} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Select Action</Text>
      <View style={styles.incidentGrid}>
        {INCIDENT_TYPES.map((t, index) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.incCard, { borderColor: t.urgent ? t.color : GuardColors.border }]}
            onPress={() => onIncident(t.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[GuardColors.surface, GuardColors.surfaceLight]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
            />
            {t.urgent && <View style={[styles.urgentDot, { backgroundColor: t.color }]} />}
            <Ionicons name={t.icon as any} size={28} color={t.color} />
            <Text style={styles.incLabel}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function GuardIncidentActive({ vehicle, timer, onResolve, onEscalate, onBack }: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={GuardColors.primary} />
        <Text style={styles.backRowText}>Abort</Text>
      </TouchableOpacity>

      {/* Active timer */}
      <Animated.View style={[styles.timerCard, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient 
          colors={['#4C0000', '#1A0000']} 
          start={{x:0, y:0}} end={{x:1, y:1}}
          style={styles.timerGradient}
        >
          <Text style={styles.timerLabel}>AWAITING OWNER RESPONSE</Text>
          <Text style={styles.timerValue}>{formatTime(timer)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="warning" size={14} color={GuardColors.critical} />
            <Text style={styles.timerSub}>{timer > 0 ? 'Tap Escalate if no response' : 'No response — escalate now'}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.glassCard}>
        <View style={styles.statusItem}>
          <Ionicons name="checkmark-done" size={22} color={GuardColors.success} />
          <Text style={styles.statusText}>Push notification sent to owner</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="notifications-outline" size={22} color={GuardColors.success} />
          <Text style={styles.statusText}>Owner alerted on their phone</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEscalate}>
          <Ionicons name="flame" size={20} color={GuardColors.critical} />
          <Text style={[styles.actionLabel, { color: GuardColors.critical }]}>Escalate</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.glowButton} onPress={onResolve}>
        <Text style={styles.glowButtonText}>RESOLVE INCIDENT</Text>
      </TouchableOpacity>
    </View>
  );
}

function GuardDone({ vehicle, elapsedSec, onReset }: any) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 40 }}>
      <View style={styles.doneIconWrap}>
        <Ionicons name="shield-checkmark" size={80} color={GuardColors.primary} />
      </View>
      <Text style={styles.doneTitle}>INCIDENT CLOSED</Text>
      <Text style={styles.doneSub}>
        Vehicle {vehicle?.plate ?? 'Unknown'} cleared.
      </Text>

      <View style={[styles.glassCard, { width: '100%', marginTop: 30 }]}>
        <View style={styles.logRow}>
          <Text style={styles.logLabel}>TIMESTAMP</Text>
          <Text style={styles.logValue}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.logRow}>
          <Text style={styles.logLabel}>RESOLUTION</Text>
          <Text style={styles.logValue}>{formatDuration(elapsedSec || 0)}</Text>
        </View>
        <View style={[styles.logRow, { borderTopWidth: 1, borderTopColor: GuardColors.border, paddingTop: 16, marginTop: 8 }]}>
          <Text style={styles.logLabel}>KARMA</Text>
          <Text style={[styles.logValue, { color: GuardColors.success }]}>+50 POINTS</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.glowButton, { width: '100%', marginTop: 30 }]} onPress={onReset}>
        <Text style={styles.glowButtonText}>NEXT VEHICLE</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatBox({ value, label1, color }: any) {
  return (
    <View style={[styles.glassCard, styles.statBox, { borderTopWidth: 2, borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label1.toUpperCase()}</Text>
    </View>
  );
}

function FoundDetail({ icon, label, value }: any) {
  return (
    <View style={styles.foundDetail}>
      <Ionicons name={icon} size={16} color={GuardColors.textSecondary} />
      <Text style={styles.foundDetailLabel}>{label}</Text>
      <Text style={styles.foundDetailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: GuardColors.primary, letterSpacing: 2 },
  headerSub: { fontSize: 11, color: GuardColors.textSecondary, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' },
  shiftBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  shiftDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GuardColors.success, shadowColor: GuardColors.success, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
  shiftText: { fontSize: 10, fontWeight: '800', color: GuardColors.success, letterSpacing: 1 },
  
  modeTitle: { fontSize: 16, fontWeight: '800', color: GuardColors.text, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: GuardColors.textSecondary, marginBottom: 12, marginTop: 24, letterSpacing: 1, textTransform: 'uppercase' },
  
  glassCard: { backgroundColor: GuardColors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: GuardColors.border },
  
  bigScanBtn: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, shadowColor: GuardColors.primary, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  bigScanGradient: { padding: 36, alignItems: 'center', gap: 12 },
  bigScanIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bigScanTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bigScanSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  statValue: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, color: GuardColors.textSecondary, fontWeight: '700', letterSpacing: 1 },
  
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backRowText: { fontSize: 13, fontWeight: '800', color: GuardColors.primary, letterSpacing: 1, textTransform: 'uppercase' },
  
  cameraScanBox: { height: 180, backgroundColor: 'rgba(0, 240, 255, 0.05)', borderRadius: 20, borderWidth: 2, borderColor: GuardColors.primaryDark, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24, overflow: 'hidden', position: 'relative' },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: GuardColors.primary, shadowColor: GuardColors.primary, shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
  cameraScanTitle: { fontSize: 12, fontWeight: '800', color: GuardColors.primary, letterSpacing: 1 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: GuardColors.border },
  orText: { fontSize: 11, color: GuardColors.textSecondary, fontWeight: '800', letterSpacing: 2 },
  
  plateInput: { height: 60, backgroundColor: GuardColors.surfaceLight, borderRadius: 16, borderWidth: 1, borderColor: GuardColors.border, paddingHorizontal: 20, fontSize: 18, fontWeight: '900', color: GuardColors.text, textAlign: 'center', letterSpacing: 3, marginBottom: 24 },
  
  glowButton: { backgroundColor: GuardColors.primary, borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: GuardColors.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  glowButtonDisabled: { backgroundColor: GuardColors.surfaceLight, shadowOpacity: 0, elevation: 0 },
  glowButtonText: { color: GuardColors.bg, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  foundIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(0, 240, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.2)' },
  foundPlate: { fontSize: 24, fontWeight: '900', color: GuardColors.text, letterSpacing: 2 },
  foundType: { fontSize: 13, color: GuardColors.textSecondary, marginTop: 4, letterSpacing: 0.5 },
  repeatBadge: { backgroundColor: 'rgba(255, 42, 85, 0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: GuardColors.critical },
  repeatText: { fontSize: 10, fontWeight: '900', color: GuardColors.critical, letterSpacing: 1 },
  
  foundDetails: { gap: 12, marginTop: 8 },
  foundDetail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foundDetailLabel: { fontSize: 12, color: GuardColors.textSecondary, width: 80, fontWeight: '600', letterSpacing: 0.5 },
  foundDetailValue: { fontSize: 13, fontWeight: '800', color: GuardColors.text, letterSpacing: 0.5 },
  
  incidentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  incCard: { width: (width - 52) / 2, height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 16, gap: 10, position: 'relative', overflow: 'hidden', borderWidth: 1 },
  urgentDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.8, shadowRadius: 4 },
  incLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center', color: GuardColors.text, letterSpacing: 0.5 },
  
  timerCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 42, 85, 0.3)' },
  timerGradient: { padding: 32, alignItems: 'center', gap: 10 },
  timerLabel: { fontSize: 12, color: GuardColors.critical, fontWeight: '800', letterSpacing: 2 },
  timerValue: { fontSize: 64, fontWeight: '900', color: '#fff', letterSpacing: 4, textShadowColor: 'rgba(255, 42, 85, 0.8)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 20 },
  timerSub: { fontSize: 11, color: GuardColors.textSecondary, letterSpacing: 0.5 },
  
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  statusText: { fontSize: 13, color: GuardColors.text, fontWeight: '600', letterSpacing: 0.5 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginVertical: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: GuardColors.surface, borderWidth: 1, borderColor: GuardColors.border },
  actionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  
  doneIconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0, 240, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: GuardColors.primary, shadowOpacity: 0.5, shadowRadius: 30 },
  doneTitle: { fontSize: 28, fontWeight: '900', color: GuardColors.text, marginBottom: 12, letterSpacing: 2 },
  doneSub: { fontSize: 14, color: GuardColors.textSecondary, textAlign: 'center', letterSpacing: 0.5 },
  
  logRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  logLabel: { fontSize: 10, color: GuardColors.textSecondary, fontWeight: '800', letterSpacing: 1 },
  logValue: { fontSize: 12, color: GuardColors.text, fontWeight: '800', letterSpacing: 1 },
});
