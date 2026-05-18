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

const STEPS = ['Scan', 'Vehicle', 'Backup Contact', 'Done'];
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
  const [vehicleType, setVehicleType] = useState('');
  const [regNo, setRegNo] = useState('');
  const [color, setColor] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (step === 0) {
      if (!stickerCode) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!vehicleType || !regNo) {
        Alert.alert('Missing info', 'Please select a vehicle type and enter registration number.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setLoading(true);
      try {
        await createSticker({
          code: stickerCode.toUpperCase(),
          vehicle_type: vehicleType,
          registration: regNo.toUpperCase().replace(/\s+/g, ''),
          color: color || undefined,
          backup_phone: backupPhone || undefined,
          vehicle_name: undefined,
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
            vehicleType={vehicleType} onType={setVehicleType}
            regNo={regNo} onReg={setRegNo}
            color={color} onColor={setColor}
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
          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(3)}>
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

function StepVehicle({ vehicleType, onType, regNo, onReg, color, onColor }: any) {
  return (
    <View>
      <Text style={styles.stepTitle}>Tell us about your vehicle</Text>
      <Text style={styles.stepSub}>This helps scanners identify your vehicle quickly.</Text>

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
              color={Colors.primary}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: Colors.surface },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceSecondary, borderWidth: 2, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  progressDotText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  progressLine: { width: 32, height: 2, backgroundColor: Colors.divider, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: Colors.success },
  stepLabel: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary, fontWeight: '600', backgroundColor: Colors.surface, paddingBottom: 12 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  stepSub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  scanBox: { height: 180, backgroundColor: Colors.primaryBg, borderRadius: 16, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBoxTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  scanBoxSub: { fontSize: 13, color: Colors.primary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  divText: { marginHorizontal: 12, fontSize: 13, color: Colors.textMuted },
  codeInput: { height: 52, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider, paddingHorizontal: 16, fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: 1 },
  foundCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.successBg, borderRadius: 10, padding: 12, marginTop: 10 },
  foundText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.3 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  typeCard: { width: '30%', paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.divider },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  typeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  input: { height: 52, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider, paddingHorizontal: 16, fontSize: 15, color: Colors.text, marginBottom: 4 },
  backupIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20, alignSelf: 'center' },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  codeBox: { height: 52, paddingHorizontal: 16, backgroundColor: Colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider, justifyContent: 'center' },
  codeBoxText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  doneIcon: { marginBottom: 16 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  doneSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
  doneActions: { flexDirection: 'row', gap: 24, marginTop: 20 },
  doneAction: { alignItems: 'center', gap: 6 },
  doneActionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  skipBtn: { alignItems: 'center', marginTop: 14 },
  skipText: { fontSize: 14, color: Colors.textSecondary },
});
