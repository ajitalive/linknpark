import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { PRODUCTS } from '../../constants/Products';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0]; // fallback
  
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]);
  const [showFullDesc, setShowFullDesc] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/store')} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerBrand}>LinkNPark</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="person-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={typeof product.image === 'string' ? { uri: product.image } : product.image} style={styles.mainImage} />
        </View>

        <View style={styles.contentContainer}>
          {/* Title & Reviews */}
          <Text style={styles.productTitle}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{product.rating}</Text>
              <Ionicons name="star" size={12} color="#fff" />
            </View>
            <Text style={styles.reviewsText}>{product.reviewsCount} ratings & reviews</Text>
          </View>

          {/* Pricing */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
            )}
            {product.discount && (
              <Text style={styles.discountText}>{product.discount} off</Text>
            )}
          </View>

          {/* Variants */}
          {product.variants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Variant</Text>
              <View style={styles.variantRow}>
                {product.variants.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.variantPill, selectedVariant === v && styles.variantPillActive]}
                    onPress={() => setSelectedVariant(v)}
                  >
                    <Text style={[styles.variantText, selectedVariant === v && styles.variantTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Features Grid */}
          <View style={styles.section}>
            <View style={styles.featuresGrid}>
              {product.features.map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon as any} size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsCard}>
              {product.specs.map((s, i) => (
                <View key={i} style={[styles.specRow, i !== product.specs.length - 1 && styles.specDivider]}>
                  <Text style={styles.specLabel}>{s.label}</Text>
                  <Text style={styles.specValue}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description / Bullet Points */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Offers</Text>
            <View style={styles.bulletsContainer}>
              {(showFullDesc ? product.bulletPoints : product.bulletPoints.slice(0, 3)).map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
            {product.bulletPoints.length > 3 && (
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} style={{ marginTop: 8 }}>
                <Text style={styles.showMoreText}>{showFullDesc ? 'Show Less ∧' : 'Show More ∨'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Reviews */}
          {product.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {product.reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{r.user.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.reviewUser}>{r.user}</Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Ionicons key={star} name="star" size={12} color={star <= r.rating ? Colors.amber : Colors.divider} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewTitle}>{r.title}</Text>
                  <Text style={styles.reviewText}>{r.text}</Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Sticky Bottom Buy Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.buyButton}
          onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: product.id, variant: selectedVariant } })}
        >
          <Text style={styles.buyButtonText}>BUY NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: Colors.surfaceSecondary,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 26,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  reviewsText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  originalPrice: {
    fontSize: 16,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  variantRow: {
    flexDirection: 'row',
    gap: 12,
  },
  variantPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  variantPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  variantText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  variantTextActive: {
    color: Colors.primary,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    rowGap: 20,
  },
  featureItem: {
    width: '33.33%',
    alignItems: 'center',
  },
  featureIconWrap: {
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  specsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  specRow: {
    flexDirection: 'row',
    padding: 14,
  },
  specDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  specLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  specValue: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bulletsContainer: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  bulletText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  showMoreText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  buyButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
