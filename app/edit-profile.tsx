import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Button } from '../components/ui';
import { useAuth, saveAuth } from '../hooks/useAuth';
import { API_BASE } from '../hooks/usePushNotifications';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setLoading(true);
    try {
      // Import getToken dynamically or using existing auth state if needed.
      // We will use the existing token from SecureStore.
      const { getToken } = require('../hooks/useAuth');
      const token = await getToken();
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE}/api/auth/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
        signal: controller.signal,
      });
      clearTimeout(id);

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to update profile');
        return;
      }

      await saveAuth(data.token, data.user);
      setUser(data.user);
      
      setSaved(true);
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/more');
        }
      }, 1000);

    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Network error');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/more');
          }
        }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
        </View>

        <Button
          label={saved ? "Saved!" : "Save Changes"}
          onPress={handleSave}
          loading={loading && !saved}
          style={[{ marginTop: 32 }, saved ? { backgroundColor: Colors.success } : undefined]}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  form: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Colors.text,
  },
});
