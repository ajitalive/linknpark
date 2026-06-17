import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Card } from '../../components/ui';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

import { PRODUCTS } from '../../constants/Products';

export default function StoreScreen() {
  const insets = useSafeAreaInsets();

  function handleBuy(product: any) {
    router.push(`/product/${product.id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>LinkNPark Store <Text style={{color: Colors.primary}}>●</Text></Text>
        <Text style={styles.headerSub}>Premium Tags, Cards & Stickers</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' }} style={styles.bannerImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Unlock Smart Identity</Text>
            <Text style={styles.bannerSub}>Get 50% off your first NFC card.</Text>
          </LinearGradient>
        </View>

        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {['All', 'Stickers', 'Cards', 'Tags', 'Accessories'].map((cat, i) => (
              <TouchableOpacity key={cat} style={[styles.filterChip, i === 0 && styles.filterChipActive]}>
                <Text style={[styles.filterText, i === 0 && styles.filterTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.grid}>
          {PRODUCTS.map(p => (
            <TouchableOpacity key={p.id} activeOpacity={0.8} onPress={() => handleBuy(p)}>
              <Card style={styles.productCard}>
                <View style={styles.imageWrap}>
                  <Image source={typeof p.image === 'string' ? { uri: p.image } : p.image} style={styles.productImage} />
                  {p.discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{p.discount} OFF</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.productDesc} numberOfLines={2}>{p.desc}</Text>
                  
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{p.price}</Text>
                    {p.originalPrice && (
                      <Text style={styles.originalPrice}>₹{p.originalPrice}</Text>
                    )}
                  </View>
                  
                  <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(p)}>
                    <Text style={styles.buyBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: Colors.bg },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  scrollContent: { paddingBottom: 40 },
  banner: { height: 180, marginHorizontal: 16, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 16 },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  filters: { marginTop: 24, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },
  productCard: { width: PRODUCT_WIDTH, padding: 0, overflow: 'hidden' },
  imageWrap: { width: '100%', height: 140, backgroundColor: Colors.surfaceSecondary },
  productImage: { width: '100%', height: '100%' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.critical, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4, lineHeight: 18 },
  productDesc: { fontSize: 11, color: Colors.textMuted, marginBottom: 12, lineHeight: 16, height: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  price: { fontSize: 16, fontWeight: '800', color: Colors.text },
  originalPrice: { fontSize: 12, fontWeight: '500', color: Colors.textMuted, textDecorationLine: 'line-through' },
  buyBtn: { backgroundColor: Colors.primaryBg, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  buyBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' }
});
