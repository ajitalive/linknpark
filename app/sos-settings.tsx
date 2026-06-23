import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

const CONTACTS_KEY = 'emergency_contacts_v1';
type Contact = { id: string; name: string; phone: string; relation: string };

export default function SOSSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [autoAlert, setAutoAlert] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [alertContacts, setAlertContacts] = useState(true);
  const [sosWord, setSosWord] = useState('HELP');

  async function handleTestSOS() {
    Alert.alert(
      'Trigger SOS',
      'This will prepare an emergency message to send to your contacts. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', style: 'destructive', onPress: executeSOS },
      ],
    );
  }

  async function executeSOS() {
    try {
      const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
      const contacts: Contact[] = raw ? JSON.parse(raw) : [];

      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'Please add emergency contacts first.');
        return;
      }

      const phoneNumbers = contacts.map(c => c.phone);
      let locationLink = '';

      if (shareLocation) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            locationLink = `\nMy location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
          } catch (e) {
            console.log('Location error:', e);
          }
        }
      }

      const message = `🚨 I need help! This is an emergency alert from LinkNPark.${locationLink}\nPlease contact me or call emergency services immediately.`;

      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(phoneNumbers, message);
      } else {
        // Fallback for simulators or unsupported devices
        const phoneList = Platform.OS === 'ios' ? phoneNumbers.join(',') : phoneNumbers.join(';');
        const url = `sms:${phoneList}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('SOS Error:', error);
      Alert.alert('Error', 'Could not trigger SOS properly.');
    }
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
            <Ionicons name="medical" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>SOS Settings</Text>
          <Text style={styles.headerSub}>Emergency alert configuration</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionLabel}>SOS Trigger Word</Text>
          <Text style={styles.sectionDesc}>Say or type this word to activate SOS mode instantly.</Text>
          <View style={styles.sosWordRow}>
            <View style={styles.sosWordBox}>
              <Text style={styles.sosWordText}>{sosWord}</Text>
            </View>
            <Text style={styles.sosWordNote}>Tap and hold the SOS button for 3 seconds to activate</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Alert Settings</Text>
          <ToggleRow
            icon="notifications"
            color={Colors.critical}
            label="Auto-Alert Contacts"
            desc="Automatically notify emergency contacts when SOS activates"
            value={alertContacts}
            onToggle={setAlertContacts}
          />
          <ToggleRow
            icon="location"
            color={Colors.success}
            label="Share Live Location"
            desc="Send your GPS location to contacts during SOS"
            value={shareLocation}
            onToggle={setShareLocation}
          />
          <ToggleRow
            icon="volume-high"
            color={Colors.amber}
            label="Sound Alarm"
            desc="Play loud alarm sound when SOS is triggered"
            value={autoAlert}
            onToggle={setAutoAlert}
          />
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>SOS Message</Text>
          <Text style={styles.sectionDesc}>
            This message is sent to your emergency contacts along with your location when SOS activates.
          </Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              🚨 I need help! This is an emergency alert from LinkNPark. My last known location is attached. Please contact me or call emergency services immediately.
            </Text>
          </View>
        </Card>

        <Button
          label="Test SOS Alert"
          variant="danger"
          size="lg"
          onPress={handleTestSOS}
          icon={<Ionicons name="medical" size={18} color="#fff" />}
        />

        <TouchableOpacity style={styles.contactsLink} onPress={() => router.push('/emergency-contacts' as any)}>
          <Ionicons name="people" size={16} color={Colors.primary} />
          <Text style={styles.contactsLinkText}>Manage Emergency Contacts →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ icon, color, label, desc, value, onToggle }: any) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: Colors.primary, false: Colors.divider }}
        thumbColor="#fff"
      />
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
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  sosWordRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sosWordBox: { backgroundColor: Colors.criticalBg, borderRadius: 12, borderWidth: 2, borderColor: Colors.critical, paddingHorizontal: 20, paddingVertical: 12 },
  sosWordText: { fontSize: 22, fontWeight: '900', color: Colors.critical, letterSpacing: 4 },
  sosWordNote: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  toggleDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  messageBox: { backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 14 },
  messageText: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  contactsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 16 },
  contactsLinkText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
