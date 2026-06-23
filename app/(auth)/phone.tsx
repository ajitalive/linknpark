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
import { sendOTP, truecallerLogin, warmUpServer } from '../../hooks/useAuth';
import { API_BASE } from '../../hooks/usePushNotifications';
import { initializeAsync, verifyUserAsync, TruecallerErrorCodes } from "expo-truecaller";

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const [truecallerUsable, setTruecallerUsable] = useState(false);
  const [truecallerLoading, setTruecallerLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  React.useEffect(() => {
    // Pre-warm the Render server so it's ready when user taps login
    warmUpServer();

    (async () => {
      try {
        const { isUsable } = await initializeAsync({
          consentMode: "bottomsheet",
          heading: "logInTo",
          theme: "dark",
        });
        setTruecallerUsable(isUsable);
      } catch (e) {
        console.log('Truecaller init error:', e);
      }
    })();
  }, []);

  async function handleTruecaller() {
    try {
      setTruecallerLoading(true);
      const { authorizationCode, codeVerifier } = await verifyUserAsync();
      
      const result = await truecallerLogin(authorizationCode, codeVerifier);
      setTruecallerLoading(false);
      
      if (!result.ok) {
        Alert.alert('Truecaller Error', `${result.error}\n\nEndpoint: ${API_BASE}`);
        return;
      }
      
      router.replace('/(tabs)');
    } catch (e: any) {
      setTruecallerLoading(false);
      if (e.code !== TruecallerErrorCodes.USER_CANCELLED) {
        Alert.alert('Error', `${e.message || 'Truecaller login failed'}\n\nEndpoint: ${API_BASE}`);
      }
    }
  }

  async function handleSendOTP() {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    try {
      setOtpLoading(true);
      const result = await sendOTP(email);
      setOtpLoading(false);
      if (!result.ok) {
        Alert.alert('Error', result.error || 'Failed to send OTP');
        return;
      }
      if (result.devCode) {
        Alert.alert('Dev Mode', `Use verification code: ${result.devCode}`);
      }
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } catch (e: any) {
      setOtpLoading(false);
      Alert.alert('Error', e.message || 'Network error');
    }
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
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="qr-code" size={36} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>LinkNPark</Text>
          <Text style={styles.headerSub}>Smart Vehicle Identity</Text>
        </LinearGradient>

        <View style={styles.form}>
          {truecallerUsable && !showEmailLogin ? (
            <View style={styles.truecallerContainer}>
              <Text style={styles.formTitle}>Welcome to LinkNPark</Text>
              <Text style={styles.formSub}>Fast, secure 1-Tap Login</Text>
              <Button
                label="1-Tap Login with Truecaller"
                onPress={handleTruecaller}
                loading={truecallerLoading}
                size="lg"
                style={{ backgroundColor: '#0087FF', marginTop: 12 }}
              />
              <TouchableOpacity
                onPress={() => setShowEmailLogin(true)}
                style={{ marginTop: 24, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 15 }}>
                  Or sign in with Email OTP
                </Text>
              </TouchableOpacity>
              <Text style={styles.terms}>
                By continuing you agree to our{' '}
                <Text style={styles.link}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.truecallerContainer}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSub}>Enter your email to receive an OTP code</Text>
              
              <View style={styles.emailRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Button
                label="Send Verification Code"
                onPress={handleSendOTP}
                loading={otpLoading}
                size="lg"
                style={{ marginTop: 20 }}
              />

              {truecallerUsable && (
                <TouchableOpacity
                  onPress={() => setShowEmailLogin(false)}
                  style={{ marginTop: 24, alignItems: 'center' }}
                >
                  <Text style={{ color: Colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
                    Back to Truecaller Login
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  truecallerContainer: {
    width: '100%',
  },
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
