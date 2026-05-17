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

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOTP() {
    if (phone.length < 10) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    router.push({ pathname: '/(auth)/otp', params: { phone } });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="qr-code" size={36} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>LinkNPark</Text>
          <Text style={styles.headerSub}>Smart Vehicle Identity</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Enter your mobile number</Text>
          <Text style={styles.formSub}>We'll send you a 6-digit OTP to verify</Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryFlag}>🇮🇳</Text>
              <Text style={styles.countryText}>+91</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="98765 43210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          <Button
            label="Send OTP"
            onPress={sendOTP}
            loading={loading}
            disabled={phone.length < 10}
            size="lg"
            style={{ marginTop: 28 }}
          />

          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingBottom: 40,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 24 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  form: { flex: 1, padding: 28 },
  formTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  formSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.divider,
  },
  countryFlag: { fontSize: 20 },
  countryText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phoneInput: {
    flex: 1, height: 52, backgroundColor: Colors.surface,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 18, fontWeight: '500', color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider,
    letterSpacing: 1,
  },
  terms: {
    fontSize: 12, color: Colors.textMuted,
    textAlign: 'center', marginTop: 16, lineHeight: 18,
  },
  link: { color: Colors.primary, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  dividerText: { marginHorizontal: 16, color: Colors.textMuted, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 12, gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.divider,
  },
  googleText: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
