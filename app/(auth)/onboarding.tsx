import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'qr-code',
    title: 'Smart Sticker,\nSafe Vehicle',
    subtitle: 'Anyone can contact you in an emergency — without knowing your phone number.',
    bg: ['#3B2FF5', '#6B5FFF'] as [string, string],
  },
  {
    icon: 'shield-checkmark',
    title: 'Privacy First,\nAlways',
    subtitle: 'Your number stays hidden. We handle masked calls, WhatsApp alerts, and SMS — all anonymously.',
    bg: ['#1D4ED8', '#3B82F6'] as [string, string],
  },
  {
    icon: 'people',
    title: 'Society & Fleet\nReady',
    subtitle: 'Guards, admins, and fleet managers get full incident workflows. Not just a sticker — an OS.',
    bg: ['#7C3AED', '#A78BFA'] as [string, string],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function goNext() {
    if (active < SLIDES.length - 1) {
      const next = active + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setActive(next);
    } else {
      router.push('/(auth)/phone');
    }
  }

  function skip() {
    router.push('/(auth)/phone');
  }

  const slide = SLIDES[active];

  return (
    <View style={styles.root}>
      <LinearGradient colors={slide.bg} style={StyleSheet.absoluteFill} />

      {/* Skip */}
      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + 16 }]}
        onPress={skip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon as any} size={72} color="rgba(255,255,255,0.95)" />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom area */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {active === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipBtn: { position: 'absolute', right: 24, zIndex: 10 },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingTop: 60,
  },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 34, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 42, marginBottom: 20,
  },
  subtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 26,
  },
  bottom: { paddingHorizontal: 32, paddingTop: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#fff', width: 24 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', height: 56, borderRadius: 16,
  },
  nextText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
