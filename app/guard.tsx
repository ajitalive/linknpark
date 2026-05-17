import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';
import { GUARD_VEHICLES } from '../constants/MockData';

const { width } = Dimensions.get('window');

const INCIDENT_TYPES = [
  { id: 'blocking_exit', icon: 'alert-circle', label: 'Blocking\nExit', color: Colors.high, bg: Colors.highBg, urgent: true },
  { id: 'wrong_parking', icon: 'warning', label: 'Wrong\nParking', color: Colors.medium, bg: Colors.mediumBg, urgent: false },
  { id: 'security_concern', icon: 'shield', label: 'Security\nConcern', color: Colors.critical, bg: Colors.criticalBg, urgent: true },
  { id: 'lights_on', icon: 'bulb', label: 'Lights\nOn', color: Colors.low, bg: Colors.lowBg, urgent: false },
  { id: 'visitor_arrived', icon: 'person-add', label: 'Visitor\nEntry', color: Colors.success, bg: Colors.successBg, urgent: false },
  { id: 'general', icon: 'notifications', label: 'General\nAlert', color: Colors.textSecondary, bg: Colors.surfaceSecondary, urgent: false },
];

type GuardMode = 'home' | 'scan' | 'vehicle' | 'incident' | 'done';

export default function GuardScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<GuardMode>('home');
  const [plate, setPlate] = useState('');
  const [found, setFound] = useState<typeof GUARD_VEHICLES[0] | null>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  function searchVehicle() {
    const v = GUARD_VEHICLES.find(
      g => g.plate.toLowerCase().includes(plate.toLowerCase())
    ) ?? GUARD_VEHICLES[0];
    setFound(v);
    setMode('vehicle');
  }

  function startContact(incType: string) {
    setSelectedIncident(incType);
    setMode('incident');
    setTimer(300); // 5 min countdown
    setTimerActive(true);
  }

  function resolveIncident() {
    setMode('done');
    setTimerActive(false);
  }

  function reset() {
    setMode('home');
    setPlate('');
    setFound(null);
    setSelectedIncident('');
    setTimer(0);
  }

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Guard Mode</Text>
          <Text style={styles.headerSub}>Green Park Society · Gate 1</Text>
        </View>
        <View style={styles.shiftBadge}>
          <View style={styles.shiftDot} />
          <Text style={styles.shiftText}>On Duty</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {mode === 'home' && (
          <GuardHome
            onScan={() => setMode('scan')}
            onManualSearch={() => setMode('scan')}
          />
        )}

        {mode === 'scan' && (
          <GuardScan
            plate={plate}
            onPlate={setPlate}
            onSearch={searchVehicle}
            onBack={() => setMode('home')}
          />
        )}

        {mode === 'vehicle' && found && (
          <GuardVehicleResult
            vehicle={found}
            onIncident={(type: string) => startContact(type)}
            onBack={() => setMode('scan')}
          />
        )}

        {mode === 'incident' && found && (
          <GuardIncidentActive
            vehicle={found}
            incidentType={selectedIncident}
            timer={timer}
            onResolve={resolveIncident}
            onEscalate={() => {}}
            onBack={() => setMode('vehicle')}
          />
        )}

        {mode === 'done' && (
          <GuardDone vehicle={found} onReset={reset} />
        )}
      </ScrollView>
    </View>
  );
}

function GuardHome({ onScan, onManualSearch }: any) {
  return (
    <View>
      <Text style={styles.modeTitle}>Quick Actions</Text>

      {/* Main scan button */}
      <TouchableOpacity style={styles.bigScanBtn} onPress={onScan} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.bigScanGradient}>
          <View style={styles.bigScanIcon}>
            <Ionicons name="qr-code" size={48} color="#fff" />
          </View>
          <Text style={styles.bigScanTitle}>Scan Vehicle Sticker</Text>
          <Text style={styles.bigScanSub}>Tap to open camera or enter plate</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Today stats */}
      <View style={styles.statsRow}>
        <StatBox value="7" label1="Incidents" label2="Today" color={Colors.high} />
        <StatBox value="23" label1="Vehicles" label2="Logged" color={Colors.primary} />
        <StatBox value="2" label1="Visitors" label2="Active" color={Colors.success} />
      </View>

      {/* Recent incidents */}
      <Text style={styles.sectionTitle}>Recent Incidents</Text>
      {GUARD_VEHICLES.slice(0, 2).map((v, i) => (
        <View key={i} style={styles.recentCard}>
          <View style={styles.recentIcon}>
            <Ionicons name="warning" size={16} color={Colors.high} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recentPlate}>{v.plate} · {v.flat}, {v.tower}</Text>
            <Text style={styles.recentInfo}>{v.resident} · {i === 0 ? '23 min ago' : '1hr 12 min ago'}</Text>
          </View>
          <View style={[styles.recentStatus, { backgroundColor: i === 0 ? Colors.highBg : Colors.successBg }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: i === 0 ? Colors.high : Colors.success }}>
              {i === 0 ? 'Open' : 'Resolved'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function GuardScan({ plate, onPlate, onSearch, onBack }: any) {
  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backRowText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.modeTitle}>Find Vehicle</Text>

      <TouchableOpacity style={styles.cameraScanBox} activeOpacity={0.85}>
        <Ionicons name="camera" size={36} color={Colors.primary} />
        <Text style={styles.cameraScanTitle}>Scan QR Sticker</Text>
        <Text style={styles.cameraScanSub}>Point at vehicle sticker</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>— or enter plate number —</Text>

      <TextInput
        style={styles.plateInput}
        placeholder="e.g. MH12AB1234"
        placeholderTextColor={Colors.textMuted}
        value={plate}
        onChangeText={onPlate}
        autoCapitalize="characters"
        autoFocus
      />

      <Button
        label="Find Vehicle"
        onPress={onSearch}
        disabled={plate.length < 4}
        size="lg"
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

function GuardVehicleResult({ vehicle, onIncident, onBack }: any) {
  const isRepeat = vehicle.incidents > 1;

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backRowText}>Back to Search</Text>
      </TouchableOpacity>

      {/* Vehicle found card */}
      <Card style={{ borderLeftWidth: 4, borderLeftColor: Colors.primary }}>
        <View style={styles.foundRow}>
          <View style={styles.foundIcon}>
            <Ionicons name="car" size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.foundPlate}>{vehicle.plate}</Text>
            <Text style={styles.foundType}>{vehicle.color} Car</Text>
          </View>
          {isRepeat && (
            <View style={styles.repeatBadge}>
              <Ionicons name="warning" size={12} color={Colors.high} />
              <Text style={styles.repeatText}>Repeat</Text>
            </View>
          )}
        </View>
        <View style={styles.foundDetails}>
          <FoundDetail icon="home" label="Flat" value={`${vehicle.flat}, ${vehicle.tower}`} />
          <FoundDetail icon="person" label="Resident" value={vehicle.resident} />
          <FoundDetail icon="alert-circle" label="Past Incidents" value={String(vehicle.incidents)} />
        </View>
      </Card>

      {/* Incident type selection */}
      <Text style={styles.sectionTitle}>Select Incident Type</Text>
      <View style={styles.incidentGrid}>
        {INCIDENT_TYPES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.incCard, { backgroundColor: t.bg }, t.urgent && styles.incCardUrgent]}
            onPress={() => onIncident(t.id)}
            activeOpacity={0.8}
          >
            {t.urgent && <View style={styles.urgentDot} />}
            <Ionicons name={t.icon as any} size={26} color={t.color} />
            <Text style={[styles.incLabel, { color: t.color }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function GuardIncidentActive({ vehicle, incidentType, timer, onResolve, onEscalate, onBack }: any) {
  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backRowText}>Back</Text>
      </TouchableOpacity>

      {/* Active timer */}
      <View style={styles.timerCard}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.timerGradient}>
          <Text style={styles.timerLabel}>Waiting for Owner</Text>
          <Text style={styles.timerValue}>{timer > 0 ? '4:52' : '0:00'}</Text>
          <Text style={styles.timerSub}>Auto-escalate if no response</Text>
        </LinearGradient>
      </View>

      {/* Vehicle info */}
      <Card>
        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 }}>Incident: {vehicle.plate}</Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{vehicle.flat}, {vehicle.tower} · {vehicle.resident}</Text>
      </Card>

      {/* Status */}
      <Card>
        <View style={styles.statusItem}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.statusText}>Owner notified via WhatsApp</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.statusText}>SMS fallback sent</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="time" size={20} color={Colors.amber} />
          <Text style={[styles.statusText, { color: Colors.amber }]}>Backup contact alert in 5 min</Text>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryBg }]}>
          <Ionicons name="call" size={20} color={Colors.primary} />
          <Text style={[styles.actionLabel, { color: Colors.primary }]}>Masked Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.highBg }]} onPress={onEscalate}>
          <Ionicons name="arrow-up-circle" size={20} color={Colors.high} />
          <Text style={[styles.actionLabel, { color: Colors.high }]}>Escalate</Text>
        </TouchableOpacity>
      </View>

      <Button
        label="Mark Incident Resolved"
        onPress={onResolve}
        size="lg"
        icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

function GuardDone({ vehicle, onReset }: any) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 24 }}>
      <View style={styles.doneIcon}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>
      <Text style={styles.doneTitle}>Incident Resolved!</Text>
      <Text style={styles.doneSub}>
        {vehicle?.plate ?? 'Vehicle'} · {vehicle?.flat} · Logged to shift report
      </Text>

      <Card style={{ width: '100%', marginTop: 24 }}>
        <View style={styles.logRow}>
          <Ionicons name="document-text" size={16} color={Colors.primary} />
          <Text style={{ fontSize: 14, color: Colors.text, flex: 1 }}>Incident logged at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.logRow}>
          <Ionicons name="time" size={16} color={Colors.success} />
          <Text style={{ fontSize: 14, color: Colors.text, flex: 1 }}>Resolution time: 4m 52s</Text>
        </View>
      </Card>

      <Button label="Handle Next Vehicle" onPress={onReset} size="lg" style={{ marginTop: 20, width: '100%' }} />
    </View>
  );
}

function StatBox({ value, label1, label2, color }: any) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label1}</Text>
      {label2 ? <Text style={styles.statLabel}>{label2}</Text> : null}
    </View>
  );
}

function FoundDetail({ icon, label, value }: any) {
  return (
    <View style={styles.foundDetail}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={styles.foundDetailLabel}>{label}:</Text>
      <Text style={styles.foundDetailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 20 },
  backBtn: { paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  shiftBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  shiftDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  shiftText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  modeTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  bigScanBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  bigScanGradient: { padding: 32, alignItems: 'center', gap: 10 },
  bigScanIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bigScanTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  bigScanSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 15, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  recentIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.highBg, alignItems: 'center', justifyContent: 'center' },
  recentPlate: { fontSize: 14, fontWeight: '700', color: Colors.text },
  recentInfo: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  recentStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backRowText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  cameraScanBox: { height: 160, backgroundColor: Colors.primaryBg, borderRadius: 16, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  cameraScanTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  cameraScanSub: { fontSize: 13, color: Colors.primary },
  orText: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  plateInput: { height: 56, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.divider, paddingHorizontal: 20, fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', letterSpacing: 2 },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  foundIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  foundPlate: { fontSize: 20, fontWeight: '800', color: Colors.text },
  foundType: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  repeatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.highBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  repeatText: { fontSize: 11, fontWeight: '700', color: Colors.high },
  foundDetails: { gap: 8 },
  foundDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foundDetailLabel: { fontSize: 13, color: Colors.textMuted, width: 90 },
  foundDetailValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  incidentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  incCard: { width: (width - 52) / 3, alignItems: 'center', borderRadius: 14, paddingVertical: 14, gap: 6, position: 'relative' },
  incCardUrgent: { borderWidth: 2, borderColor: 'transparent' },
  urgentDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.critical },
  incLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  timerCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  timerGradient: { padding: 28, alignItems: 'center', gap: 6 },
  timerLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  timerValue: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  timerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  statusText: { fontSize: 14, color: Colors.text },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionLabel: { fontSize: 14, fontWeight: '700' },
  doneIcon: { marginBottom: 12 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  doneSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
});
