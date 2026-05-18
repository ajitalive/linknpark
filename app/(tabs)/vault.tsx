import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/Colors';
import { Card, Button } from '../../components/ui';

const STORE_KEY = 'vault_documents_v1';

const DOC_TYPES = [
  { id: 'rc', label: 'RC Book', icon: 'card', color: Colors.primary, bg: Colors.primaryBg },
  { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark', color: Colors.success, bg: Colors.successBg },
  { id: 'puc', label: 'PUC Certificate', icon: 'leaf', color: '#059669', bg: '#D1FAE5' },
  { id: 'license', label: "Driver's License", icon: 'person-circle', color: Colors.amber, bg: Colors.amberBg },
  { id: 'other', label: 'Other Document', icon: 'document', color: Colors.textSecondary, bg: Colors.surfaceSecondary },
];

type Doc = {
  id: string;
  type: string;
  label: string;
  vehicleName: string;
  docNumber: string;
  expiry: string;
  notes: string;
  addedAt: string;
};

async function loadDocs(): Promise<Doc[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveDocs(docs: Doc[]) {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(docs));
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState(DOC_TYPES[0]);
  const [form, setForm] = useState({ vehicleName: '', docNumber: '', expiry: '', notes: '' });

  useEffect(() => {
    loadDocs().then(setDocs);
  }, []);

  async function handleAdd() {
    if (!form.vehicleName.trim() || !form.docNumber.trim()) {
      Alert.alert('Required', 'Vehicle name and document number are required.');
      return;
    }
    const newDoc: Doc = {
      id: Date.now().toString(),
      type: selectedType.id,
      label: selectedType.label,
      vehicleName: form.vehicleName.trim(),
      docNumber: form.docNumber.trim(),
      expiry: form.expiry.trim(),
      notes: form.notes.trim(),
      addedAt: new Date().toISOString(),
    };
    const updated = [...docs, newDoc];
    setDocs(updated);
    await saveDocs(updated);
    setForm({ vehicleName: '', docNumber: '', expiry: '', notes: '' });
    setSelectedType(DOC_TYPES[0]);
    setShowAdd(false);
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Document', 'Remove this document from vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = docs.filter(d => d.id !== id);
          setDocs(updated);
          await saveDocs(updated);
        },
      },
    ]);
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    if (!acc[d.vehicleName]) acc[d.vehicleName] = [];
    acc[d.vehicleName].push(d);
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Document Vault</Text>
            <Text style={styles.subtitle}>{docs.length} document{docs.length !== 1 ? 's' : ''} · Stored securely on device</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: Colors.primaryBg, shadowOpacity: 0, marginBottom: 20 }}>
          <View style={styles.secRow}>
            <View style={[styles.secIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secTitle}>Encrypted on Device</Text>
              <Text style={styles.secSub}>Documents are saved in your device's secure enclave. They never leave your phone.</Text>
            </View>
          </View>
        </Card>

        {docs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtext}>Add your RC, insurance, PUC and other vehicle documents for quick access.</Text>
            <Button
              label="Add First Document"
              onPress={() => setShowAdd(true)}
              icon={<Ionicons name="add" size={18} color="#fff" />}
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          Object.entries(grouped).map(([vehicle, vehicleDocs]) => (
            <View key={vehicle} style={{ marginBottom: 20 }}>
              <Text style={styles.groupLabel}>{vehicle}</Text>
              {vehicleDocs.map(doc => {
                const meta = DOC_TYPES.find(t => t.id === doc.type) ?? DOC_TYPES[4];
                return (
                  <Card key={doc.id}>
                    <View style={styles.docRow}>
                      <View style={[styles.docIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docLabel}>{doc.label}</Text>
                        <Text style={styles.docNumber}>{doc.docNumber}</Text>
                        {doc.expiry ? <Text style={styles.docExpiry}>Expires: {doc.expiry}</Text> : null}
                        {doc.notes ? <Text style={styles.docNotes}>{doc.notes}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(doc.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Document Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Document</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={styles.fieldLabel}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DOC_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeChip, selectedType.id === t.id && { backgroundColor: Colors.primaryBg, borderColor: Colors.primary }]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Ionicons name={t.icon as any} size={16} color={selectedType.id === t.id ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.typeChipText, selectedType.id === t.id && { color: Colors.primary }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Vehicle Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Car, KA01AB1234"
              placeholderTextColor={Colors.textMuted}
              value={form.vehicleName}
              onChangeText={v => setForm(f => ({ ...f, vehicleName: v }))}
            />

            <Text style={styles.fieldLabel}>Document Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MH01 20230012345"
              placeholderTextColor={Colors.textMuted}
              value={form.docNumber}
              onChangeText={v => setForm(f => ({ ...f, docNumber: v }))}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15 Jan 2026"
              placeholderTextColor={Colors.textMuted}
              value={form.expiry}
              onChangeText={v => setForm(f => ({ ...f, expiry: v }))}
            />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Any additional notes..."
              placeholderTextColor={Colors.textMuted}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              multiline
            />

            <Button label="Save Document" size="lg" onPress={handleAdd} icon={<Ionicons name="checkmark" size={18} color="#fff" />} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  secIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  secSub: { fontSize: 12, color: Colors.primary, opacity: 0.8, lineHeight: 17 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  docIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  docNumber: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  docExpiry: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  docNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { padding: 4 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.divider, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.divider },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});
