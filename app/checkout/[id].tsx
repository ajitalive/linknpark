import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { PRODUCTS } from '../../constants/Products';

export default function CheckoutScreen() {
  const { id, variant } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handlePlaceOrder = () => {
    Alert.alert(
      'Online Payments Coming Soon',
      'Our payment system is being set up. To order now, please contact us on WhatsApp and we will process your order manually.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'WhatsApp Us',
          onPress: () => {
            const msg = encodeURIComponent(`Hi! I'd like to order: ${product.name} (₹${product.price})`);
            require('react-native').Linking.openURL(`https://wa.me/919999999999?text=${msg}`);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: Colors.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/store')} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Payment coming soon banner */}
        <View style={[styles.reminderBanner, { borderColor: Colors.primary, backgroundColor: Colors.primaryBg }]}>
          <Ionicons name="construct" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reminderTitle, { color: Colors.primary }]}>Online Payments Coming Soon</Text>
            <Text style={styles.reminderText}>Tap "Place Order" to reach us on WhatsApp and we'll process your order personally.</Text>
          </View>
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            {variant && <Text style={styles.productVariant}>Variant: {variant}</Text>}
            <Text style={styles.productPrice}>₹{product.price}</Text>
          </View>
        </View>

        {/* Shipping Form */}
        <Text style={styles.sectionTitle}>Shipping Details</Text>
        <View style={styles.formCard}>
          
          <Text style={styles.label}>Full Name *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Rahul Kumar" 
            value={form.name}
            onChangeText={(t) => updateForm('name', t)}
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="+91 98765 43210" 
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(t) => updateForm('phone', t)}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="rahul@example.com" 
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => updateForm('email', t)}
          />

          <Text style={styles.label}>Delivery Address (Flat, Street) *</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="A-101, Green Park Society..." 
            multiline
            numberOfLines={3}
            value={form.address}
            onChangeText={(t) => updateForm('address', t)}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>City *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Mumbai"
                value={form.city}
                onChangeText={(t) => updateForm('city', t)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Pincode *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="400001" 
                keyboardType="number-pad"
                maxLength={6}
                value={form.pincode}
                onChangeText={(t) => updateForm('pincode', t)}
              />
            </View>
          </View>

        </View>

        {/* Price Breakdown */}
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>₹{product.price}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Shipping</Text>
            <Text style={[styles.breakdownValue, { color: Colors.success }]}>FREE</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{product.price}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.placeOrderText}>Order via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  reminderBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.amberBg,
    borderWidth: 1,
    borderColor: Colors.amberLight,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.amber,
    marginBottom: 2,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 12,
    gap: 12,
    marginBottom: 24,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
