import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui';

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setResendTimer(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  function handleChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
    }
  }

  async function verify() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    router.replace('/(auth)/sticker-code');
  }

  const filled = otp.filter(Boolean).length === OTP_LENGTH;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 16 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={[styles.container, { paddingTop: insets.top + 72 }]}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses" size={36} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.sub}>
          We sent a 6-digit OTP to{'\n'}
          <Text style={styles.phone}>+91 {phone}</Text>
        </Text>

        {/* OTP Input */}
        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(0).map((_, i) => (
            <TextInput
              key={i}
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : {}]}
              value={otp[i]}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textContentType="oneTimeCode"
            />
          ))}
        </View>

        {/* Test mode hint */}
        <TouchableOpacity
          style={styles.testHint}
          onPress={() => {
            const test = ['1','2','3','4','5','6'];
            setOtp(test);
            inputs.current[5]?.blur();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="flask" size={13} color={Colors.amber} />
          <Text style={styles.testHintText}>Prototype mode — tap to fill test OTP: 123456</Text>
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive it? </Text>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
          ) : (
            <TouchableOpacity onPress={() => setResendTimer(30)}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          label="Verify & Continue"
          onPress={verify}
          loading={loading}
          disabled={!filled}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <View style={styles.hint}>
          <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
          <Text style={styles.hintText}>Your number is always kept private</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn: { position: 'absolute', left: 24, zIndex: 10 },
  container: { flex: 1, paddingHorizontal: 28 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, marginBottom: 36 },
  phone: { fontWeight: '700', color: Colors.text },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.divider,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: Colors.text,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  resendText: { fontSize: 14, color: Colors.textSecondary },
  resendTimer: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  resendLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  hintText: { fontSize: 12, color: Colors.textMuted },
  testHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.amberBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  testHintText: { fontSize: 12, color: '#92400E', fontWeight: '500', flex: 1 },
});
