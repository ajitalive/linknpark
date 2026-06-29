import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/Colors';
import { Button } from '../components/ui';
import { getToken } from '../hooks/useAuth';
import { API_BASE } from '../hooks/usePushNotifications';

type Spot = {
  id: string; poi_name: string; label: string | null; type: string;
  vehicle_types: string; photo_url: string | null; lat: number; lng: number;
  upvotes: number; status: string; distance_km: number; you_voted: boolean;
};

const TYPES = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
  { id: 'street', label: 'Street' },
  { id: 'lot', label: 'Lot' },
  { id: 'other', label: 'Other' },
];

async function getCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export default function FindParkingScreen() {
  const insets = useSafeAreaInsets();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [votingId, setVotingId] = useState<string | null>(null);

  // add-spot modal
  const [modal, setModal] = useState(false);
  const [poi, setPoi] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('free');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setError('');
    try {
      const coords = await getCoords();
      if (!coords) { setError('Location permission is needed to find parking near you.'); setLoading(false); setRefreshing(false); return; }
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/parking/nearby?lat=${coords.lat}&lng=${coords.lng}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSpots(data.spots || []);
      else setError(data.error || 'Could not load parking spots.');
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  async function vote(spot: Spot) {
    setVotingId(spot.id);
    try {
      const coords = await getCoords();
      if (!coords) { Alert.alert('Location needed', 'Allow location so we can confirm you are at the spot.'); return; }
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/parking/spots/${spot.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(coords),
      });
      const data = await res.json();
      if (res.ok) {
        setSpots(prev => prev.map(s => s.id === spot.id ? { ...s, upvotes: data.upvotes, you_voted: true, status: data.status } : s));
      } else {
        Alert.alert('Could not verify', data.error || 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach the server.');
    } finally {
      setVotingId(null);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function submitSpot() {
    if (!poi.trim()) { Alert.alert('Missing', 'Please enter the place name (e.g. ISKCON Temple, Kharghar).'); return; }
    setSubmitting(true);
    try {
      const coords = await getCoords();
      if (!coords) { Alert.alert('Location needed', 'Stand at the parking spot and allow location so we record its exact position.'); setSubmitting(false); return; }
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/parking/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ poi_name: poi.trim(), label: label.trim() || null, type, ...coords }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Could not submit', data.error || 'Please try again.'); setSubmitting(false); return; }

      // optional photo
      if (photo && data.spot?.id) {
        const form = new FormData();
        const name = photo.uri.split('/').pop() || 'spot.jpg';
        const ext = /\.(\w+)$/.exec(name)?.[1] || 'jpg';
        form.append('photo', { uri: photo.uri, name, type: `image/${ext}` } as any);
        try {
          await fetch(`${API_BASE}/api/parking/spots/${data.spot.id}/photo`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
          });
        } catch {}
      }

      setModal(false);
      setPoi(''); setLabel(''); setType('free'); setPhoto(null);
      Alert.alert('Submitted 🎉', 'Thanks! Your spot is pending review. Once approved and verified by nearby users, it goes live.');
    } catch {
      Alert.alert('Error', 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Parking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        <Text style={styles.sub}>Verified parking spots near you, backed by the LinkNPark community.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{error}</Text>
            <Button label="Retry" onPress={() => { setLoading(true); load(); }} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        ) : spots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No verified spots near you yet.{'\n'}Be the first — add one below.</Text>
          </View>
        ) : (
          spots.map(s => (
            <View key={s.id} style={styles.card}>
              {s.photo_url ? <Image source={{ uri: s.photo_url }} style={styles.photo} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.poi}>{s.poi_name}</Text>
                    {s.status === 'community_verified' && (
                      <View style={styles.badge}><Ionicons name="shield-checkmark" size={11} color="#fff" /><Text style={styles.badgeTxt}>Community</Text></View>
                    )}
                  </View>
                  {s.label ? <Text style={styles.label}>{s.label}</Text> : null}
                  <Text style={styles.meta}>{s.distance_km} km · {s.type} · {s.vehicle_types}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.voteBtn, s.you_voted && styles.voteBtnDone]}
                    disabled={s.you_voted || votingId === s.id}
                    onPress={() => vote(s)}
                  >
                    {votingId === s.id
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : <Ionicons name={s.you_voted ? 'checkmark' : 'arrow-up'} size={18} color={s.you_voted ? Colors.success : Colors.primary} />}
                  </TouchableOpacity>
                  <Text style={styles.votes}>{s.upvotes}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add spot FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setModal(true)} activeOpacity={0.9}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabTxt}>Add a spot</Text>
      </TouchableOpacity>

      {/* Add spot modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Parking Spot</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>Stand at the spot — we record your exact GPS as its location.</Text>

              {photo ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}><Ionicons name="close-circle" size={24} color={Colors.critical} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                  <Ionicons name="camera" size={22} color={Colors.primary} />
                  <Text style={styles.photoBtnTxt}>Take a photo of the spot</Text>
                </TouchableOpacity>
              )}

              <View>
                <Text style={styles.fieldLabel}>Nearby place</Text>
                <TextInput style={styles.input} value={poi} onChangeText={setPoi} placeholder="e.g. ISKCON Temple, Kharghar" placeholderTextColor={Colors.textMuted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Free street parking behind the temple" placeholderTextColor={Colors.textMuted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.typeRow}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.typeChip, type === t.id && styles.typeChipActive]} onPress={() => setType(t.id)}>
                      <Text style={[styles.typeChipTxt, type === t.id && { color: Colors.primary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button label={submitting ? 'Submitting…' : 'Submit for review'} onPress={submitSpot} loading={submitting} size="lg" style={{ marginTop: 8 }} />
              <Text style={styles.disclaimer}>Submissions are reviewed before going live, then verified by nearby users.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, padding: 14, marginBottom: 12 },
  photo: { width: '100%', height: 120, borderRadius: 10, marginBottom: 10, resizeMode: 'cover' },
  poi: { fontSize: 15, fontWeight: '800', color: Colors.text },
  label: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  voteBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
  voteBtnDone: { borderColor: Colors.success, backgroundColor: `${Colors.success}18` },
  votes: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 4 },
  emptyCard: { alignItems: 'center', gap: 8, padding: 28, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, marginTop: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  fab: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '88%', borderWidth: 1, borderColor: Colors.divider },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  hint: { fontSize: 13, color: Colors.textSecondary },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider, borderRadius: 12, paddingHorizontal: 14, height: 50, color: Colors.text, fontSize: 15 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.divider, backgroundColor: Colors.surface },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  typeChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.divider, borderRadius: 14, padding: 18, backgroundColor: Colors.surface },
  photoBtnTxt: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  photoPreviewWrap: { position: 'relative', height: 140, borderRadius: 14, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
});
