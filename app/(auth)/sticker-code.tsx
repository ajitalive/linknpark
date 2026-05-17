import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui';

// Mock valid codes for prototype
const VALID_CODES = ['STK-2025-AB1234', 'STK-2025-XY5678', 'STK-2025-MH0001', 'TEST123'];

export default function StickerCodeScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);

  function handleChange(val: string) {
    setCode(val.toUpperCase());
    setError('');
    setFound(false);
  }

  async function activate() {
    const trimmed = code.trim();
    if (!trimmed) { setError('Please enter your sticker code'); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);

    if (VALID_CODES.includes(trimmed)) {
      setFound(true);
      await new Promise(r => setTimeout(r, 800));
      router.replace('/(tabs)');
    } else {
      setError('Code not found. Check the sticker and try again.');
    }
  }

  function skip() {
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={['#3B2FF5', '#6B5FFF']}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="qr-code" size={44} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Enter Your Sticker Code</Text>
          <Text style={styles.headerSub}>
            Find the unique code printed on the back of your LinkNPark sticker
          </Text>
        </LinearGradient>

        <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>

          {/* Where to find it */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="pricetag" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.infoText}>
                The code is printed on the <Text style={styles.bold}>backing paper</Text> of your sticker (e.g. STK-2025-AB1234)
              </Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
              </View>
              <Text style={styles.infoText}>
                Each code is <Text style={styles.bold}>unique and one-time</Text> — it gets linked to your account permanently
              </Text>
            </View>
          </View>

          {/* Code input */}
          <Text style={styles.label}>Sticker Code</Text>
          <View style={[
            styles.inputWrap,
            error ? styles.inputError : {},
            found ? styles.inputSuccess : {},
          ]}>
            <Ionicons
              name={found ? 'checkmark-circle' : 'barcode-outline'}
              size={20}
              color={found ? Colors.success : Colors.textMuted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={handleChange}
              placeholder="e.g. STK-2025-AB1234"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={activate}
            />
            {code.length > 0 && !found && (
              <TouchableOpacity onPress={() => { setCode(''); setError(''); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={Colors.critical} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {found ? (
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.successText}>Sticker found! Setting up your account…</Text>
            </View>
          ) : null}

          {/* Test hint */}
          <View style={styles.testHint}>
            <Ionicons name="flask" size={13} color={Colors.amber} />
            <Text style={styles.testHintText}>
              Prototype — try: <Text style={styles.testCode} onPress={() => setCode('STK-2025-AB1234')}>STK-2025-AB1234</Text>
            </Text>
          </View>

          <Button
            label={found ? 'Activating…' : 'Activate Sticker'}
            onPress={activate}
            loading={loading}
            disabled={code.trim().length === 0 || found}
            size="lg"
            style={{ marginTop: 8 }}
          />

          {/* Skip for prototype testing */}
          <TouchableOpacity style={styles.skipRow} onPress={skip}>
            <Text style={styles.skipText}>Skip for now (testing only)</Text>
          </TouchableOpacity>

          {/* Already have account */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.orderBtn} onPress={() => {}}>
            <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
            <Text style={styles.orderText}>Order LinkNPark stickers</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 28, paddingBottom: 36, alignItems: 'center',
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 10,
  },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', lineHeight: 22,
  },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  infoIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  bold: { fontWeight: '700', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, height: 56, marginBottom: 8,
  },
  inputError: { borderColor: Colors.critical },
  inputSuccess: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  input: {
    flex: 1, fontSize: 16, fontWeight: '700',
    color: Colors.text, letterSpacing: 1,
  },
  errorRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 },
  errorText: { fontSize: 13, color: Colors.critical },
  successRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 },
  successText: { fontSize: 13, color: Colors.success, fontWeight: '500' },
  testHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.amberBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  testHintText: { fontSize: 12, color: '#92400E', flex: 1 },
  testCode: { fontWeight: '700', color: Colors.primary, textDecorationLine: 'underline' },
  skipRow: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: Colors.textMuted },
  orderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  orderText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
