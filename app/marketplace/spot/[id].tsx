import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PARKING_SPOTS } from '../../(tabs)/marketplace';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const spot = PARKING_SPOTS.find(s => s.id === id);

  if (!spot) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Spot not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBook = () => {
    Alert.alert(
      "Confirm Booking",
      `Are you sure you want to book this spot for ₹${spot.price}/hr?\n\nConvenience Fee: ₹2.50\nTotal: ₹${spot.price + 2.50}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pay & Book", onPress: () => {
          Alert.alert("Success", "Spot booked successfully!");
          router.back();
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: spot.image }} style={styles.heroImage} />
          <TouchableOpacity 
            style={[styles.backIconBtn, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{spot.title}</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>₹{spot.price}/hr</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {spot.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>LinkNPark Verified Host</Text>
              </View>
            )}
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{spot.type} Spot</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this spot</Text>
          <Text style={styles.descText}>
            A very secure and spacious {spot.type.toLowerCase()} parking spot located in the heart of the city. 
            Perfect for daily office commuters or weekend shoppers. The spot is monitored by CCTV and is easily accessible.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Rules</Text>
          <View style={styles.ruleItem}>
            <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.ruleText}>No overnight parking (Ends at 11 PM)</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="car-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.ruleText}>Fits hatchbacks, sedans, and compact SUVs</Text>
          </View>

        </View>
      </ScrollView>

      {/* Checkout Footer */}
      <View style={[styles.checkoutFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.priceCalc}>
          <Text style={styles.calcLabel}>Spot Rate:</Text>
          <Text style={styles.calcValue}>₹{spot.price}.00</Text>
        </View>
        <View style={styles.priceCalc}>
          <Text style={styles.calcLabel}>Convenience Fee:</Text>
          <Text style={styles.calcValue}>₹2.50</Text>
        </View>
        <View style={[styles.priceCalc, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.divider }]}>
          <Text style={styles.calcTotalLabel}>Total per hour</Text>
          <Text style={styles.calcTotalValue}>₹{spot.price + 2.50}</Text>
        </View>

        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Text style={styles.bookBtnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.bg} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  backBtnText: {
    fontWeight: '600',
  },
  heroWrap: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backIconBtn: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
  },
  priceBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: {
    color: Colors.bg,
    fontWeight: '900',
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  typeBadge: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  typeText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  descText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textMuted,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  checkoutFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  priceCalc: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  calcTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  calcTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  bookBtn: {
    backgroundColor: Colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 20,
  },
  bookBtnText: {
    color: Colors.bg,
    fontWeight: '800',
    fontSize: 16,
  },
});
