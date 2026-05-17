import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card, SectionHeader, Button } from '../../components/ui';
import { MOCK_DOCUMENTS } from '../../constants/MockData';

const DOC_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  rc: { icon: 'card', color: Colors.primary, bg: Colors.primaryBg },
  insurance: { icon: 'shield-checkmark', color: Colors.success, bg: Colors.successBg },
  puc: { icon: 'leaf', color: '#059669', bg: '#D1FAE5' },
  license: { icon: 'person-circle', color: Colors.amber, bg: Colors.amberBg },
  other: { icon: 'document', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
};

const ACCESS_LABELS: Record<string, string> = {
  private: 'Private',
  emergency_contacts: 'Emergency Contacts',
  org_admin: 'Society Admin',
  anyone: 'Anyone',
};

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const expiringCount = MOCK_DOCUMENTS.filter(d => d.status === 'expiring').length;

  const grouped = MOCK_DOCUMENTS.reduce<Record<string, typeof MOCK_DOCUMENTS>>((acc, doc) => {
    if (!acc[doc.vehicleName]) acc[doc.vehicleName] = [];
    acc[doc.vehicleName].push(doc);
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Document Vault</Text>
            <Text style={styles.subtitle}>{MOCK_DOCUMENTS.length} documents · End-to-end encrypted</Text>
          </View>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Expiry warning */}
        {expiringCount > 0 && (
          <View style={styles.expiryBanner}>
            <Ionicons name="warning" size={16} color={Colors.amber} />
            <Text style={styles.expiryText}>{expiringCount} documents expiring soon — tap to renew</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Security info card */}
        <Card style={{ backgroundColor: Colors.primaryBg, shadowOpacity: 0, marginBottom: 20 }}>
          <View style={styles.secRow}>
            <View style={[styles.secIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secTitle}>Privacy Protected</Text>
              <Text style={styles.secSub}>Documents are encrypted. Only you control who can see them.</Text>
            </View>
          </View>
        </Card>

        {Object.entries(grouped).map(([vehicleName, docs]) => (
          <View key={vehicleName} style={styles.vehicleGroup}>
            <SectionHeader title={vehicleName} />
            {docs.map(doc => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </View>
        ))}

        <Button
          label="Upload New Document"
          variant="secondary"
          size="lg"
          icon={<Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

function DocCard({ doc }: { doc: typeof MOCK_DOCUMENTS[0] }) {
  const meta = DOC_ICONS[doc.type] ?? DOC_ICONS.other;
  const isExpiring = doc.status === 'expiring';
  const isExpired = doc.daysLeft <= 0;

  const expiryColor = isExpired ? Colors.critical : isExpiring ? Colors.amber : Colors.success;
  const expiryBg = isExpired ? Colors.criticalBg : isExpiring ? Colors.amberBg : Colors.successBg;
  const expiryLabel = isExpired ? 'Expired' : isExpiring ? `${doc.daysLeft}d left` : 'Valid';

  return (
    <TouchableOpacity style={styles.docCard} activeOpacity={0.75}>
      <View style={styles.docTop}>
        <View style={[styles.docIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docLabel}>{doc.label}</Text>
          <Text style={styles.docExpiry}>Expires: {doc.expiry}</Text>
        </View>
        <View style={[styles.expiryBadge, { backgroundColor: expiryBg }]}>
          <Text style={[styles.expiryBadgeText, { color: expiryColor }]}>{expiryLabel}</Text>
        </View>
      </View>

      <View style={styles.docMeta}>
        <View style={styles.accessRow}>
          <Ionicons name="eye-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.accessText}>{ACCESS_LABELS[doc.access]}</Text>
        </View>
        <View style={styles.docActions}>
          <TouchableOpacity style={styles.docAction}>
            <Ionicons name="eye-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.docAction}>
            <Ionicons name="share-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.docAction}>
            <Ionicons name="settings-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isExpiring && (
        <View style={styles.renewBanner}>
          <Ionicons name="refresh" size={13} color={Colors.amber} />
          <Text style={styles.renewText}>Renew before {doc.expiry}</Text>
          <TouchableOpacity>
            <Text style={styles.renewLink}>Renew Now →</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  expiryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.amberBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  expiryText: { fontSize: 13, fontWeight: '600', color: Colors.amber, flex: 1 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  secIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  secSub: { fontSize: 12, color: Colors.primary, opacity: 0.8, lineHeight: 17 },
  vehicleGroup: { marginBottom: 16 },
  docCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  docIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  docExpiry: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  expiryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  expiryBadgeText: { fontSize: 12, fontWeight: '700' },
  docMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 10 },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accessText: { fontSize: 12, color: Colors.textMuted },
  docActions: { flexDirection: 'row', gap: 14 },
  docAction: { padding: 4 },
  renewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.amberBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  renewText: { fontSize: 12, color: Colors.amber, flex: 1 },
  renewLink: { fontSize: 12, fontWeight: '700', color: Colors.amber },
});
