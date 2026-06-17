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
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.bg },
  headerTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  headerSub: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  scrollContent: { paddingBottom: 100 },
  banner: { height: 200, marginHorizontal: 16, marginTop: 12, borderRadius: 24, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 24 },
  bannerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 6, fontWeight: '500' },
  filters: { marginTop: 24, marginBottom: 20 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: Colors.surface, borderWidth: 1, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  filterText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },
  productCard: { width: PRODUCT_WIDTH, padding: 0, overflow: 'hidden', borderRadius: 28 },
  imageWrap: { width: '100%', height: 160, backgroundColor: Colors.surfaceSecondary },
  productImage: { width: '100%', height: '100%' },
  discountBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  discountText: { color: Colors.bg, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  productInfo: { padding: 16 },
  productName: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 6, lineHeight: 20 },
  productDesc: { fontSize: 12, color: Colors.textMuted, marginBottom: 16, lineHeight: 18, height: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  price: { fontSize: 18, fontWeight: '900', color: Colors.text },
  originalPrice: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textDecorationLine: 'line-through' },
  buyBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  buyBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '800' }
});
