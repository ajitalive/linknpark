import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';
import { confirmAction } from '../components/confirm';

const CONTACTS_KEY = 'emergency_contacts_v1';

type Contact = { id: string; name: string; phone: string; relation: string };

async function loadContacts(): Promise<Contact[]> {
  try {
    const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function persistContacts(contacts: Contact[]) {
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
}

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('');

  useEffect(() => {
    loadContacts().then(c => { setContacts(c); setLoadingContacts(false); });
  }, []);

  async function handleAdd() {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Required', 'Name and phone number are required.');
      return;
    }
    const contact: Contact = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone: newPhone.trim(),
      relation: newRelation.trim() || 'Contact',
    };
    const updated = [...contacts, contact];
    setContacts(updated);
    await persistContacts(updated);
    setNewName(''); setNewPhone(''); setNewRelation('');
    setAdding(false);
  }

  function handleDelete(id: string) {
    confirmAction({
      title: 'Remove Contact',
      message: 'Remove this emergency contact?',
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: async () => {
        const updated = contacts.filter(c => c.id !== id);
        setContacts(updated);
        await persistContacts(updated);
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.critical, '#FF6B6B']}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="people" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.headerSub}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.infoText}>
          These contacts are notified when you trigger SOS. They receive your location and a distress message.
        </Text>

        {loadingContacts && (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
        )}

        {contacts.map(contact => (
          <Card key={contact.id}>
            <View style={styles.contactRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
                <View style={styles.relationBadge}>
                  <Text style={styles.relationText}>{contact.relation}</Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                  <Ionicons name="call" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.criticalBg }]} onPress={() => handleDelete(contact.id)}>
                  <Ionicons name="trash" size={18} color={Colors.critical} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        {adding ? (
          <Card>
            <Text style={styles.sectionLabel}>New Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor={Colors.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Relation (e.g. Spouse, Parent)"
              placeholderTextColor={Colors.textMuted}
              value={newRelation}
              onChangeText={setNewRelation}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button label="Add Contact" onPress={handleAdd} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : (
          <Button
            label="Add Emergency Contact"
            onPress={() => setAdding(true)}
            icon={<Ionicons name="add" size={18} color="#fff" />}
            size="lg"
          />
        )}

        {contacts.length === 0 && !adding && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySub}>Add people who should be alerted in emergencies.</Text>
          </View>
        )}
      </ScrollView>
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
  infoText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12, paddingHorizontal: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  contactName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  contactPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  relationBadge: { marginTop: 4, backgroundColor: Colors.surfaceSecondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  relationText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  contactActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  input: { backgroundColor: Colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, marginBottom: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: Colors.divider },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
