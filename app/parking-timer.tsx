import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

const PRESETS = [15, 30, 60, 90, 120];

export default function ParkingTimerScreen() {
  const insets = useSafeAreaInsets();
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function startTimer() {
    const seconds = selectedMinutes * 60;
    setRemaining(seconds);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          Alert.alert('Parking Timer', 'Your parking time is up! Time to move your vehicle.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(0);
  }

  function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const progress = running ? remaining / (selectedMinutes * 60) : 1;
  const isLow = running && remaining < 300;
  const timerColor = isLow ? Colors.critical : Colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="time" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Parking Timer</Text>
          <Text style={styles.headerSub}>Get alerted before your time runs out</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.timerDisplay}>
            <View style={[styles.timerCircle, { borderColor: timerColor }]}>
              <Text style={[styles.timerText, { color: timerColor }]}>
                {running ? formatTime(remaining) : `${selectedMinutes}m`}
              </Text>
              <Text style={styles.timerSubText}>{running ? (isLow ? 'Almost up!' : 'remaining') : 'selected'}</Text>
            </View>
          </View>

          {!running && (
            <>
              <Text style={styles.presetsLabel}>Quick Select</Text>
              <View style={styles.presets}>
                {PRESETS.map(mins => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.presetBtn, selectedMinutes === mins && styles.presetBtnActive]}
                    onPress={() => setSelectedMinutes(mins)}
                  >
                    <Text style={[styles.presetText, selectedMinutes === mins && styles.presetTextActive]}>
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {running ? (
            <Button label="Stop Timer" variant="danger" size="lg" onPress={stopTimer} icon={<Ionicons name="stop-circle" size={18} color="#fff" />} />
          ) : (
            <Button label="Start Timer" size="lg" onPress={startTimer} icon={<Ionicons name="play-circle" size={18} color="#fff" />} />
          )}
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Alert Settings</Text>
          <InfoRow icon="notifications" color={Colors.amber} label="5-minute warning" desc="Alert when 5 minutes remain" />
          <InfoRow icon="notifications" color={Colors.critical} label="Time's up alert" desc="Notification + sound when timer ends" />
          <InfoRow icon="vibrate" color={Colors.primary} label="Vibration" desc="Vibrate on all alerts" />
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Tips</Text>
          <Text style={styles.tipText}>• Paid parking zones in India typically allow 1-2 hour slots</Text>
          <Text style={styles.tipText}>• Set the timer 5 minutes shorter than actual limit to avoid fines</Text>
          <Text style={styles.tipText}>• Timer runs in background — you'll receive a push notification</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, color, label, desc }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  timerDisplay: { alignItems: 'center', paddingVertical: 16 },
  timerCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, alignItems: 'center', justifyContent: 'center', gap: 4 },
  timerText: { fontSize: 36, fontWeight: '800' },
  timerSubText: { fontSize: 12, color: Colors.textMuted },
  presetsLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textAlign: 'center', marginBottom: 10, textTransform: 'uppercase' },
  presets: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.divider },
  presetBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  presetText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  presetTextActive: { color: Colors.primary },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  infoDesc: { fontSize: 12, color: Colors.textSecondary },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
});
