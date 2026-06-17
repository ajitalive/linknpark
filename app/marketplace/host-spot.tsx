import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HostSpotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [address, setAddress] = useState('');
  const [spotType, setSpotType] = useState('Covered');
  const [price, setPrice] = useState('');

  const handlePublish = () => {
    if (!address || !price) {
      Alert.alert("Missing Details", "Please fill in all required fields.");
      return;
    }
    Alert.alert("Success!", "Your parking spot has been listed on the LinkNPark marketplace.", [
      { text: "Awesome", onPress: () => router.back() }
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host a Spot</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.heroBox}>
          <Ionicons name="car-sport" size={40} color={Colors.primary} />
          <Text style={styles.heroTitle}>Turn your empty space into passive income.</Text>
        </View>

        {/* Form */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Where is your spot located?</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 12th Main Road, Indiranagar"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>What type of spot is it?</Text>
          <View style={styles.typeSelector}>
            {['Covered', 'Open', 'Gated'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, spotType === type && styles.typeChipActive]}
                onPress={() => setSpotType(type)}
              >
                <Text style={[styles.typeChipText, spotType === type && styles.typeChipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Hourly Rate (₹)</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="50"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={styles.feeInfo}>
            <Ionicons name="information-circle" size={16} color={Colors.textMuted} />
            <Text style={styles.feeText}>LinkNPark takes a 10% platform fee from your earnings. Drivers pay the convenience fee.</Text>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
          <Text style={styles.publishBtnText}>Publish Listing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 24,
  },
  heroBox: {
    backgroundColor: '#EEF2FF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  formGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  typeChipTextActive: {
    color: Colors.bg,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  feeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  publishBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  publishBtnText: {
    color: Colors.bg,
    fontWeight: '800',
    fontSize: 16,
  },
});
