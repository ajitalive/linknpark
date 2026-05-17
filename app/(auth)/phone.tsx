import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui';
import { sendOTP } from '../../hooks/useAuth';

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSendOTP() {
    if (!isValid) return;
    setLoading(true);
    const result = await sendOTP(email);
    setLoading(false);

    if (!result.ok) {
      Alert.alert('Could not send code', result.error || 'Please try again');
      return;
    }

    if (result.devCode) {
      Alert.alert('Dev mode', `OTP not sent via email (Resend not configured).\n\nUse code: ${result.devCode}`);
    }

    router.push({ pathname: '/(auth)/otp', params: { email } });
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

        <View style={styles.form}>
          <Text style={styles.formTitle}>Enter your email</Text>
          <Text style={styles.formSub}>We'll send a 6-digit code to verify it's you</Text>

          <View style={styles.emailRow}>
            <Ionicons name="mail" size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.emailInput}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              autoFocus
            />
          </View>

          <Button
            label="Send Code"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!isValid}
            size="lg"
            style={{ marginTop: 28 }}
          />

          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          <View style={styles.hint}>
            <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
            <Text style={styles.hintText}>Your email is kept private and never shared</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
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
  emailRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.divider,
    paddingHorizontal: 16, height: 56,
  },
  emailInput: {
    flex: 1, height: '100%',
    fontSize: 16, fontWeight: '500', color: Colors.text,
  },
  terms: {
    fontSize: 12, color: Colors.textMuted,
    textAlign: 'center', marginTop: 16, lineHeight: 18,
  },
  link: { color: Colors.primary, fontWeight: '600' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
  hintText: { fontSize: 12, color: Colors.textMuted },
});
