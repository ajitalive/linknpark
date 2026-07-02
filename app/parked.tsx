import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/ParkingMap';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

const STORAGE_KEY = 'parked_spot_v1';

type Spot = {
  lat: number | null;
  lng: number | null;
  photo: string | null;
  note: string;
  savedAt: number;
};

async function saveSpot(spot: Spot | null) {
  const val = spot ? JSON.stringify(spot) : '';
  if (Platform.OS === 'web') {
    if (val) localStorage.setItem(STORAGE_KEY, val);
    else localStorage.removeItem(STORAGE_KEY);
  } else {
    if (val) await SecureStore.setItemAsync(STORAGE_KEY, val);
    else await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
  }
}

async function loadSpot(): Promise<Spot | null> {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Spot;
  } catch {
    return null;
  }
}

function timeAgo(ms: number) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ParkedScreen() {
  const insets = useSafeAreaInsets();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadSpot().then(s => { setSpot(s); setLoaded(true); });
  }, []);

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Allow camera access to attach a photo of your spot.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function handleSave() {
    setSaving(true);
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch (e) {
      console.log('Location error:', e);
    }

    const newSpot: Spot = { lat, lng, photo, note: note.trim(), savedAt: Date.now() };
    await saveSpot(newSpot);
    setSpot(newSpot);
    setSaving(false);
  }

  async function doClear() {
    await saveSpot(null);
    setSpot(null);
    setNote('');
    setPhoto(null);
  }

  async function handleClear() {
    // RN Web's Alert.alert ignores button callbacks — use the browser confirm there.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Found your car? This will clear the saved parking spot.')) {
        await doClear();
      }
      return;
    }
    Alert.alert('Found your car?', 'This will clear the saved parking spot.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: doClear },
    ]);
  }

  function openDirections() {
    if (spot?.lat == null || spot?.lng == null) return;
    const url = `https://maps.google.com/?q=${spot.lat},${spot.lng}`;
    Linking.openURL(url);
  }

  const hasGps = spot?.lat != null && spot?.lng != null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="car-sport" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Find My Car</Text>
          <Text style={styles.headerSub}>Save where you parked, find it later</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!loaded ? null : spot ? (
          // ── SAVED STATE: Find my car ──
          <>
            <Card>
              <View style={styles.savedRow}>
                <View style={styles.savedDot} />
                <Text style={styles.savedLabel}>Parked {timeAgo(spot.savedAt)}</Text>
              </View>

              {spot.photo && (
                <Image source={{ uri: spot.photo }} style={styles.photo} resizeMode="cover" />
              )}

              {!!spot.note && (
                <View style={styles.noteBox}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.noteText}>{spot.note}</Text>
                </View>
              )}

              {hasGps ? (
                <>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: spot.lat!,
                      longitude: spot.lng!,
                      latitudeDelta: 0.003,
                      longitudeDelta: 0.003,
                    }}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    showsUserLocation
                  >
                    <Marker coordinate={{ latitude: spot.lat!, longitude: spot.lng! }}>
                      <View style={styles.markerContainer}>
                        <Ionicons name="car" size={16} color="#fff" />
                        <View style={styles.markerTail} />
                      </View>
                    </Marker>
                  </MapView>
                  <Button label="Directions" size="lg" onPress={openDirections} icon={<Ionicons name="navigate" size={18} color="#fff" />} />
                </>
              ) : (
                <View style={styles.noGps}>
                  <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.noGpsText}>No GPS saved — rely on your photo &amp; note above.</Text>
                </View>
              )}
            </Card>

            <View style={{ height: 12 }} />
            <Button label="I found my car" variant="danger" size="lg" onPress={handleClear} icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />} />
          </>
        ) : (
          // ── EMPTY STATE: Save spot ──
          <>
            <Card>
              <Text style={styles.sectionLabel}>Mark your spot</Text>
              <Text style={styles.helper}>
                Tap save to drop a GPS pin. Add a photo and a note — these are what actually help in a basement where GPS is weak.
              </Text>

              {photo ? (
                <View>
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                  <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
                    <Ionicons name="camera-reverse" size={16} color={Colors.primary} />
                    <Text style={styles.retakeText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={22} color={Colors.primary} />
                  <Text style={styles.photoBtnText}>Add a photo</Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.input}
                placeholder="Note — e.g. Level 2, pillar B7, near lift"
                placeholderTextColor={Colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </Card>

            <View style={{ height: 12 }} />
            <Button label="I parked here" size="lg" loading={saving} onPress={handleSave} icon={<Ionicons name="pin" size={18} color="#fff" />} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, backgroundColor: Colors.bg },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.divider },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  helper: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },

  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.divider, backgroundColor: Colors.surfaceSecondary, marginBottom: 14 },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  photo: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12, backgroundColor: Colors.surfaceSecondary },
  retakeBtn: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  retakeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  input: { borderWidth: 1, borderColor: Colors.divider, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, minHeight: 56, backgroundColor: Colors.surfaceSecondary, textAlignVertical: 'top' },

  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  savedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  savedLabel: { fontSize: 15, fontWeight: '800', color: Colors.text },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryBg, padding: 12, borderRadius: 10, marginBottom: 12 },
  noteText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },

  map: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  markerContainer: { backgroundColor: Colors.primary, padding: 8, borderRadius: 20, alignItems: 'center' },
  markerTail: { position: 'absolute', bottom: -5, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.primary },

  noGps: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noGpsText: { flex: 1, fontSize: 13, color: Colors.textMuted },
});
