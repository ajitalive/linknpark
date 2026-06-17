import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32; // 16px padding on each side
const BANNER_HEIGHT = 160;

const PROMO_DATA = [
  {
    id: '1',
    title: 'Secure Your Bike Today!',
    subtitle: 'Get 50% OFF on the new Smart Pet & Bike Tag bundle.',
    image: 'https://images.unsplash.com/photo-1558981420-c532902e58b4?w=800&q=80',
    colors: ['#00F0FF', '#007A8A'] as const,
    route: '/(tabs)/store',
    cta: 'Shop Now',
  },
  {
    id: '2',
    title: 'Guardian Network Active',
    subtitle: 'Add up to 5 emergency contacts to your Medical SOS profile.',
    image: null,
    colors: ['#8B5CF6', '#4C1D95'] as const,
    route: '/guardian-network',
    cta: 'Set Up Now',
  },
  {
    id: '3',
    title: 'Never Pay Overstay Fines',
    subtitle: 'Try our new smart Parking Timer and get alerted before your time is up.',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80',
    colors: ['#F59E0B', '#B45309'] as const,
    route: '/parking-timer',
    cta: 'Try It',
  },
];

export function MarketingBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const currentIndexRef = useRef(0);

  // Auto-scroll logic
  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= PROMO_DATA.length) {
        nextIndex = 0;
      }
      flatListRef.current?.scrollToOffset({ 
        offset: nextIndex * width, // use width so it snaps to the actual window width bounds
        animated: true 
      });
      currentIndexRef.current = nextIndex;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
      currentIndexRef.current = viewableItems[0].index;
    }
  }).current;

  const renderItem = ({ item }: { item: typeof PROMO_DATA[0] }) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => item.route && router.push(item.route as any)}
        style={styles.cardContainer}
      >
        <LinearGradient
          colors={item.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {item.image && (
            <Image 
              source={{ uri: item.image }} 
              style={styles.backgroundImage} 
              blurRadius={2}
            />
          )}
          <View style={styles.overlay} />
          
          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{item.cta}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PROMO_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 0 }} // Keep zero to prevent offset issues with pagination
      />
      
      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {PROMO_DATA.map((_, index) => {
          const inputRange = [(index - 1) * BANNER_WIDTH, index * BANNER_WIDTH, (index + 1) * BANNER_WIDTH];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, opacity }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  cardContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginHorizontal: 16, // adds exactly 16px to match main layout padding
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardGradient: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '85%',
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaText: {
    color: '#111',
    fontWeight: '700',
    fontSize: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 4,
  },
});
