import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Card, Button, Badge } from '../../components/ui';
import { IncidentIcon } from '../../components/IncidentIcon';
import { MOCK_INCIDENTS } from '../../constants/MockData';

const TIMELINE = [
  { event: 'Incident reported', time: '14 min ago', icon: 'flag', done: true },
  { event: 'Push notification sent', time: '14 min ago', icon: 'notifications', done: true },
  { event: 'WhatsApp message sent', time: '13 min ago', icon: 'logo-whatsapp', done: true },
  { event: 'Backup contact alerted', time: '4 min ago', icon: 'person', done: true },
  { event: 'Society admin escalation', time: 'Pending', icon: 'arrow-up-circle', done: false },
];

export default function IncidentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const incident = MOCK_INCIDENTS.find(i => i.id === id) ?? MOCK_INCIDENTS[0];
  const meta = IncidentColors[incident.type];
  const isOpen = incident.status === 'open';
  const [message, setMessage] = useState('');
  const [resolved, setResolved] = useState(!isOpen);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={[meta?.color ?? Colors.primary, `${meta?.color ?? Colors.primary}CC`]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <IncidentIcon type={incident.type} size={28} />
          <Text style={styles.headerTitle}>{meta?.label}</Text>
          <Text style={styles.headerVehicle}>{incident.registration} · {incident.stickerName}</Text>
          <Badge
            label={resolved ? 'RESOLVED' : incident.severity.toUpperCase()}
            color={resolved ? Colors.success : meta?.color}
            bg="rgba(255,255,255,0.25)"
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanner message */}
        <Card>
          <View style={styles.scannerRow}>
            <View style={styles.scannerAvatar}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scannerName}>{incident.reportedBy}</Text>
              <Text style={styles.scannerTime}>{incident.reportedAgo}</Text>
            </View>
            <View style={[styles.locPin, incident.hasPhoto && { backgroundColor: Colors.primaryBg }]}>
              <Ionicons name="location" size={14} color={incident.hasPhoto ? Colors.primary : Colors.textMuted} />
            </View>
          </View>
          <Text style={styles.scannerMsg}>{incident.message}</Text>
          {incident.hasPhoto && (
            <View style={styles.photoBanner}>
              <Ionicons name="image" size={16} color={Colors.primary} />
              <Text style={styles.photoText}>1 photo attached · Tap to view</Text>
            </View>
          )}
        </Card>

        {/* Quick actions */}
        {!resolved && (
          <View style={styles.quickActions}>
            <QuickAction icon="call-outline" label="Masked Call" color={Colors.primary} bg={Colors.primaryBg} />
            <QuickAction icon="chatbubble-outline" label="Chat" color={Colors.primary} bg={Colors.primaryBg} />
            <QuickAction icon="logo-whatsapp" label="WhatsApp" color="#25D366" bg="#F0FDF4" />
            <QuickAction icon="arrow-up-circle-outline" label="Escalate" color={Colors.high} bg={Colors.highBg} />
          </View>
        )}

        {/* Escalation status */}
        <Card>
          <Text style={styles.sectionLabel}>Escalation Status</Text>
          {TIMELINE.map((t, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={[styles.timelineDot, t.done && styles.timelineDotDone]}>
                <Ionicons name={t.icon as any} size={12} color={t.done ? '#fff' : Colors.textMuted} />
              </View>
              {i < TIMELINE.length - 1 && (
                <View style={[styles.timelineLine, t.done && styles.timelineLineDone]} />
              )}
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineEvent, !t.done && { color: Colors.textMuted }]}>{t.event}</Text>
                <Text style={styles.timelineTime}>{t.time}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Chat thread */}
        <Card>
          <Text style={styles.sectionLabel}>Message Thread</Text>
          <View style={styles.chatBubble}>
            <Text style={styles.chatText}>{incident.message}</Text>
            <Text style={styles.chatTime}>Scanner · {incident.reportedAgo}</Text>
          </View>
          <View style={[styles.chatBubble, styles.chatBubbleOwner]}>
            <Text style={[styles.chatText, { color: '#fff' }]}>On my way, will move the car in 5 minutes.</Text>
            <Text style={[styles.chatTime, { color: 'rgba(255,255,255,0.7)', textAlign: 'right' }]}>You · 10 min ago</Text>
          </View>

          {!resolved && (
            <View style={styles.chatInput}>
              <TextInput
                style={styles.chatField}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textMuted}
                value={message}
                onChangeText={setMessage}
              />
              <TouchableOpacity style={styles.sendBtn}>
                <Ionicons name="send" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Resolve */}
        {!resolved ? (
          <Button
            label="Mark as Resolved"
            onPress={() => setResolved(true)}
            size="lg"
            icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
          />
        ) : (
          <Card style={{ backgroundColor: Colors.successBg, shadowOpacity: 0 }}>
            <View style={styles.resolvedCard}>
              <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
              <View>
                <Text style={styles.resolvedTitle}>Incident Resolved</Text>
                <Text style={styles.resolvedSub}>Closed · {incident.reportedAgo}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Danger */}
        {!resolved && (
          <TouchableOpacity style={styles.spamBtn}>
            <Ionicons name="flag-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.spamText}>Report as spam or abuse</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, color, bg }: any) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} activeOpacity={0.75}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerVehicle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  scannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scannerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  scannerName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  scannerTime: { fontSize: 12, color: Colors.textMuted },
  locPin: { padding: 6, borderRadius: 8 },
  scannerMsg: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  photoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: Colors.primaryBg, borderRadius: 8, padding: 10 },
  photoText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickAction: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 12, gap: 4 },
  quickLabel: { fontSize: 11, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 },
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 40 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceSecondary, borderWidth: 2, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timelineDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  timelineLine: { position: 'absolute', left: 13, top: 30, width: 2, height: 20, backgroundColor: Colors.divider },
  timelineLineDone: { backgroundColor: Colors.success },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineEvent: { fontSize: 14, fontWeight: '600', color: Colors.text },
  timelineTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chatBubble: { backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 10, maxWidth: '85%' },
  chatBubbleOwner: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  chatText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  chatTime: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  chatInput: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  chatField: { flex: 1, height: 44, backgroundColor: Colors.surfaceSecondary, borderRadius: 22, paddingHorizontal: 16, fontSize: 14, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resolvedTitle: { fontSize: 16, fontWeight: '700', color: Colors.success },
  resolvedSub: { fontSize: 13, color: Colors.success },
  spamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  spamText: { fontSize: 13, color: Colors.textMuted },
});
