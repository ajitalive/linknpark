import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createSticker } from '../hooks/useApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import { Button, Card } from '../components/ui';
import { API_BASE } from '../hooks/usePushNotifications';

const SCANNER_BASE = API_BASE.replace(':3001', ':8082');

const STEPS = ['Scan', 'Details', 'Backup Contact', 'Done'];
const TAG_TYPES = [
  { id: 'vehicle', icon: 'car', label: 'Vehicle' },
  { id: 'keychain', icon: 'key', label: 'Keychain' },
  { id: 'pet', icon: 'paw', label: 'Pet Tag' },
  { id: 'doorbell', icon: 'home', label: 'Doorbell' },
  { id: 'other', icon: 'cube', label: 'Other' },
];
const VEHICLE_TYPES = [
  { id: 'car', icon: 'car', label: 'Car' },
  { id: 'bike', icon: 'bicycle', label: 'Bike' },
  { id: 'truck', icon: 'bus', label: 'Truck/Bus' },
  { id: 'scooty', icon: 'bicycle', label: 'Scooty' },
  { id: 'auto', icon: 'car-sport', label: 'Auto' },
  { id: 'other', icon: 'cube', label: 'Other' },
];

export default function ActivateScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const [step, setStep] = useState(0);
  const [stickerCode, setStickerCode] = useState('');

  useEffect(() => {
    if (params.code) {
      setStickerCode(params.code);
      setStep(1);
    }
  }, [params.code]);
  const [tagType, setTagType] = useState('vehicle');
  const [tagTitle, setTagTitle] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [regNo, setRegNo] = useState('');
  const [color, setColor] = useState('');
  const [parkingSlot, setParkingSlot] = useState('');
  const [society, setSociety] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (step === 0) {
      if (!stickerCode) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (tagType === 'vehicle') {
        if (!vehicleType || !regNo) {
          Alert.alert('Missing info', 'Please select a vehicle type and enter registration number.');
          return;
        }
        if (!society.trim() || !parkingSlot.trim()) {
          Alert.alert('Missing info', 'Please enter your society name and parking number so guards can identify your vehicle.');
          return;
        }
      } else {
        if (!tagTitle) {
          Alert.alert('Missing info', 'Please give this tag a title (e.g. "My House Keys").');
          return;
        }
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setLoading(true);
      try {
        await createSticker({
          code: stickerCode.toUpperCase(),
          vehicle_type: tagType === 'vehicle' ? vehicleType : 'other',
          registration: tagType === 'vehicle' ? regNo.toUpperCase().replace(/\s+/g, '') : 'N/A',
          color: color || undefined,
          parking_slot: tagType === 'vehicle' && parkingSlot ? parkingSlot.toUpperCase().replace(/\s+/g, '') : undefined,
          society: tagType === 'vehicle' ? society.trim() : undefined,
          backup_phone: backupPhone || undefined,
          vehicle_name: undefined,
          tag_type: tagType,
          tag_title: tagTitle || undefined,
        });
        setStep(3);
      } catch (e: any) {
        Alert.alert('Could not activate', e?.message || 'Please try again');
      } finally {
        setLoading(false);
      }
      return;
    }
    router.replace('/(tabs)/stickers');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activate Sticker</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
              i < step && styles.progressDotDone,
            ]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[styles.progressDotText, i <= step && { color: '#fff' }]}>{i + 1}</Text>
              }
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.progressLine, i < step && styles.progressLineDone]} />
            )}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && <StepScan code={stickerCode} onCode={setStickerCode} />}
        {step === 1 && (
          <StepVehicle
            tagType={tagType} onTagType={setTagType}
            tagTitle={tagTitle} onTagTitle={setTagTitle}
            vehicleType={vehicleType} onType={setVehicleType}
            regNo={regNo} onReg={setRegNo}
            color={color} onColor={setColor}
            parkingSlot={parkingSlot} onParkingSlot={setParkingSlot}
            society={society} onSociety={setSociety}
          />
        )}
        {step === 2 && <StepBackup phone={backupPhone} onPhone={setBackupPhone} />}
        {step === 3 && <StepDone sticker={stickerCode} reg={regNo} />}

        <Button
          label={step === STEPS.length - 1 ? 'Go to My Stickers' : 'Continue'}
          onPress={handleNext}
          loading={loading}
          disabled={step === 0 && !stickerCode}
          size="lg"
          style={{ marginTop: 24 }}
        />
        {step === 2 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleNext}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepScan({ code, onCode }: any) {
  return (
    <View>
      <Text style={styles.stepTitle}>Find your sticker code</Text>
      <Text style={styles.stepSub}>Scan the QR code on your sticker or enter the 12-digit code printed on the back.</Text>

      <TouchableOpacity
        style={styles.scanBox}
        onPress={() => router.push({ pathname: '/scan', params: { returnTo: '/activate' } })}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={40} color={Colors.primary} />
        <Text style={styles.scanBoxTitle}>Scan QR Code</Text>
        <Text style={styles.scanBoxSub}>Tap to open camera</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divLine} />
        <Text style={styles.divText}>or enter manually</Text>
        <View style={styles.divLine} />
      </View>

      <TextInput
        style={styles.codeInput}
        placeholder="e.g. STK-2024-AB1234"
        placeholderTextColor={Colors.textMuted}
        value={code}
        onChangeText={onCode}
        autoCapitalize="characters"
        maxLength={20}
      />

      {code.length > 0 && (
        <View style={styles.foundCard}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.foundText}>Sticker found! Batch: Jan 2025</Text>
        </View>
      )}
    </View>
  );
}

function StepVehicle({ tagType, onTagType, tagTitle, onTagTitle, vehicleType, onType, regNo, onReg, color, onColor, parkingSlot, onParkingSlot, society, onSociety }: any) {
  return (
    <View>
      <Text style={styles.stepTitle}>Tell us about your tag</Text>
      <Text style={styles.stepSub}>What item are you putting this sticker on?</Text>

      <Text style={styles.fieldLabel}>Tag Type</Text>
      <View style={styles.typeGrid}>
        {TAG_TYPES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.typeCard, tagType === t.id && styles.typeCardActive]}
            onPress={() => onTagType(t.id)}
          >
            <Ionicons name={t.icon as any} size={24} color={tagType === t.id ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.typeLabel, tagType === t.id && { color: Colors.primary, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tagType === 'vehicle' ? (
        <View>
          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.typeGrid}>
            {VEHICLE_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeCard, vehicleType === t.id && styles.typeCardActive]}
                onPress={() => onType(t.id)}
              >
                <Ionicons name={t.icon as any} size={24} color={vehicleType === t.id ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.typeLabel, vehicleType === t.id && { color: Colors.primary, fontWeight: '700' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Registration Number</Text>
          <TextInput
            style={styles.input}
            placeholder="MH12AB1234"
            placeholderTextColor={Colors.textMuted}
            value={regNo}
            onChangeText={onReg}
            autoCapitalize="characters"
          />

          <Text style={styles.fieldLabel}>Vehicle Color</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. White, Silver, Red"
            placeholderTextColor={Colors.textMuted}
            value={color}
            onChangeText={onColor}
          />

          <Text style={styles.fieldLabel}>Society / Building Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Casa Bella, Palava"
            placeholderTextColor={Colors.textMuted}
            value={society}
            onChangeText={onSociety}
          />

          <Text style={styles.fieldLabel}>Parking Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. B2-17"
            placeholderTextColor={Colors.textMuted}
            value={parkingSlot}
            onChangeText={onParkingSlot}
            autoCapitalize="characters"
          />
          <Text style={styles.fieldHint}>Guards and your society office use these to identify and protect your vehicle</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.fieldLabel}>Tag Name</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g. "My House Keys" or "Fluffy"'
            placeholderTextColor={Colors.textMuted}
            value={tagTitle}
            onChangeText={onTagTitle}
          />
        </View>
      )}
    </View>
  );
}

function StepBackup({ phone, onPhone }: any) {
  return (
    <View>
      <View style={styles.backupIcon}>
        <Ionicons name="people" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Add a backup contact</Text>
      <Text style={styles.stepSub}>If you don't respond in 10 minutes, we'll alert this person. They'll never see the caller's number.</Text>

      <Text style={styles.fieldLabel}>Backup Contact Phone</Text>
      <View style={styles.phoneRow}>
        <View style={styles.codeBox}>
          <Text style={styles.codeBoxText}>+91</Text>
        </View>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="98765 43210"
          placeholderTextColor={Colors.textMuted}
          value={phone}
          onChangeText={onPhone}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      <Card style={{ marginTop: 20, backgroundColor: Colors.primaryBg, shadowOpacity: 0 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={{ fontSize: 13, color: Colors.primary, flex: 1, lineHeight: 19 }}>
            Your contact will receive a confirmation message. They can opt out any time.
          </Text>
        </View>
      </Card>
    </View>
  );
}

function StepDone({ sticker, reg }: any) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 24 }}>
      <View style={styles.doneIcon}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>
      <Text style={styles.doneTitle}>Sticker is Live!</Text>
      <Text style={styles.doneSub}>
        Anyone who scans your sticker can now contact you anonymously. Your number stays private.
      </Text>
      <Card style={{ width: '100%', marginTop: 24 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ padding: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: Colors.divider }}>
            <QRCode
              value={`${SCANNER_BASE}?code=${(sticker || 'STK-2025-AB1234').toUpperCase()}`}
              size={150}
              color="#000000"
              backgroundColor="#fff"
            />
          </View>
          <Text style={{ fontSize: 13, color: Colors.textMuted, fontFamily: 'monospace', letterSpacing: 1 }}>{(sticker || 'STK-2025-AB1234').toUpperCase()}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }}>{reg || 'MH12AB1234'}</Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
            Screenshot or print this QR and stick it on your vehicle
          </Text>
        </View>
      </Card>
      <View style={styles.doneActions}>
        <TouchableOpacity style={styles.doneAction}>
          <Ionicons name="share-outline" size={20} color={Colors.primary} />
          <Text style={styles.doneActionText}>Share Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneAction}>
          <Ionicons name="radio-outline" size={20} color={Colors.primary} />
          <Text style={styles.doneActionText}>Write NFC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.bg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 22 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, backgroundColor: Colors.bg },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceSecondary, borderWidth: 2, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  progressDotText: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  progressLine: { width: 40, height: 2, backgroundColor: Colors.divider, marginHorizontal: 8 },
  progressLineDone: { backgroundColor: Colors.success },
  stepLabel: { textAlign: 'center', fontSize: 13, color: Colors.textSecondary, fontWeight: '700', backgroundColor: Colors.bg, paddingBottom: 16 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, marginBottom: 12, letterSpacing: -0.5 },
  stepSub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, marginBottom: 32 },
  scanBox: { height: 200, backgroundColor: 'rgba(215, 255, 0, 0.05)', borderRadius: 24, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12 },
  scanBoxTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  scanBoxSub: { fontSize: 14, color: Colors.primary, opacity: 0.8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  divText: { marginHorizontal: 16, fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  codeInput: { height: 60, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: 1.5 },
  foundCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(52, 199, 89, 0.1)', borderRadius: 16, padding: 16, marginTop: 16 },
  foundText: { fontSize: 15, fontWeight: '700', color: Colors.success },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, marginBottom: 12, marginTop: 24, textTransform: 'uppercase', letterSpacing: 1 },
  fieldHint: { fontSize: 12, color: Colors.textMuted, marginTop: 8, lineHeight: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  typeCard: { width: '31%', paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'transparent' },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(215, 255, 0, 0.05)' },
  typeLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  input: { height: 60, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, paddingHorizontal: 20, fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  backupIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(215, 255, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center' },
  phoneRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  codeBox: { height: 60, paddingHorizontal: 20, backgroundColor: Colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, justifyContent: 'center' },
  codeBoxText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  doneIcon: { marginBottom: 24 },
  doneTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, marginBottom: 12, letterSpacing: -0.5 },
  doneSub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  doneActions: { flexDirection: 'row', gap: 24, marginTop: 32 },
  doneAction: { alignItems: 'center', gap: 8 },
  doneActionText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  skipBtn: { alignItems: 'center', marginTop: 20 },
  skipText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
});
