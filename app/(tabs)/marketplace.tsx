import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/ParkingMap';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Dummy Data for Map
export const PARKING_SPOTS = [
  { id: '1', title: 'Covered Spot - Koramangala', price: 50, lat: 12.9352, lng: 77.6245, image: 'https://images.unsplash.com/photo-1590496793907-9685cb524f22?q=80&w=600&auto=format&fit=crop', verified: true, type: 'Covered' },
  { id: '2', title: 'Open Driveway - Indiranagar', price: 40, lat: 12.9784, lng: 77.6408, image: 'https://images.unsplash.com/photo-1604063155787-8fbdf30302b1?q=80&w=600&auto=format&fit=crop', verified: true, type: 'Open' },
  { id: '3', title: 'Gated Basement - HSR Layout', price: 60, lat: 12.9121, lng: 77.6446, image: 'https://images.unsplash.com/photo-1573024840243-228ea1eb3cb9?q=80&w=600&auto=format&fit=crop', verified: false, type: 'Gated' },
  { id: '4', title: 'Residential Garage - Jayanagar', price: 45, lat: 12.9299, lng: 77.5834, image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?q=80&w=600&auto=format&fit=crop', verified: true, type: 'Covered' },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showList, setShowList] = useState(false);

  // Initial region centered roughly on Bangalore
  const initialRegion = {
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  const renderSpotCard = ({ item }: { item: typeof PARKING_SPOTS[0] }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/marketplace/spot/${item.id}`)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{item.price}/hr</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.badgeRow}>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {PARKING_SPOTS.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            onPress={() => router.push(`/marketplace/spot/${spot.id}`)}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>₹{spot.price}</Text>
              <View style={styles.markerTail} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header Overlay */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <Text style={styles.searchText}>Search parking in Bengaluru...</Text>
        </View>
      </View>

      {/* Map/List Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={styles.toggleBtn} 
          onPress={() => setShowList(!showList)}
        >
          <Ionicons name={showList ? "map" : "list"} size={20} color={Colors.bg} />
          <Text style={styles.toggleBtnText}>{showList ? "Show Map" : "List View"}</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Action Button (Host a Spot) */}
      {!showList && (
        <TouchableOpacity 
          style={[styles.fab, { bottom: insets.bottom + 20 }]} 
          onPress={() => router.push('/marketplace/host-spot')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
          <Text style={styles.fabText}>Host your spot</Text>
        </TouchableOpacity>
      )}

      {/* List Overlay (Bottom Sheet simulation) */}
      {showList && (
        <View style={[styles.listContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{PARKING_SPOTS.length} spots available nearby</Text>
          </View>
          <FlatList
            data={PARKING_SPOTS}
            keyExtractor={item => item.id}
            renderItem={renderSpotCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  searchText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  markerContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    alignItems: 'center',
  },
  markerText: {
    color: Colors.bg,
    fontWeight: '900',
    fontSize: 14,
  },
  markerTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    position: 'absolute',
    bottom: -5,
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    zIndex: 10,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleBtnText: {
    color: Colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  listContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 140,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  listHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.bg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.divider,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  priceBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    color: Colors.bg,
    fontWeight: '900',
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  typeText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
