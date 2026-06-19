import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator, Pressable
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';

// ── Badge ──────────────────────────────────────────────
interface BadgeProps { label: string; color: string; bg: string; size?: 'sm' | 'md' }
export function Badge({ label, color, bg, size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color }, size === 'sm' && styles.badgeTextSm]}>{label}</Text>
    </View>
  );
}

// ── Status Dot ─────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? Colors.success
    : status === 'paused' ? Colors.paused
    : status === 'open' ? Colors.medium
    : status === 'resolved' ? Colors.success
    : Colors.critical;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

// ── Chip ───────────────────────────────────────────────
interface ChipProps { label: string; active?: boolean; onPress?: () => void }
export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Card ───────────────────────────────────────────────
interface CardProps { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }
export function Card({ children, style, onPress }: CardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (onPress) {
    return (
      <Pressable 
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <Animated.View style={[styles.card, style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Button ─────────────────────────────────────────────
interface BtnProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}
export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon }: BtnProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const btnStyle = [
    styles.btn,
    variant === 'primary' && styles.btnPrimary,
    variant === 'secondary' && styles.btnSecondary,
    variant === 'ghost' && styles.btnGhost,
    variant === 'danger' && styles.btnDanger,
    size === 'sm' && styles.btnSm,
    size === 'lg' && styles.btnLg,
    (disabled || loading) && styles.btnDisabled,
    style,
  ];
  const textStyle = [
    styles.btnText,
    variant === 'primary' && { color: '#111111' },
    variant === 'secondary' && styles.btnTextSecondary,
    variant === 'ghost' && styles.btnTextGhost,
    variant === 'danger' && styles.btnTextDanger,
    size === 'sm' && styles.btnTextSm,
  ];

  return (
    <Pressable 
      disabled={disabled || loading}
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => {
        if (variant === 'primary' || variant === 'danger') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
    >
      <Animated.View style={[btnStyle, animatedStyle]}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#111111' : Colors.primary} size="small" />
        ) : (
          <View style={styles.btnInner}>
            {icon && <View style={styles.btnIcon}>{icon}</View>}
            <Text style={textStyle}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Section Header ─────────────────────────────────────
interface SectionHeaderProps { title: string; action?: string; onAction?: () => void }
export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Empty State ────────────────────────────────────────
interface EmptyStateProps { icon: string; title: string; subtitle: string; action?: string; onAction?: () => void }
export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {action && <Button label={action} onPress={onAction} style={{ marginTop: 16 }} />}
    </View>
  );
}

// ── Divider ────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── Row ────────────────────────────────────────────────
interface RowProps { children: React.ReactNode; style?: ViewStyle; align?: 'center' | 'flex-start' | 'flex-end' | 'space-between' }
export function Row({ children, style, align = 'center' }: RowProps) {
  return <View style={[styles.row, { alignItems: align as any, justifyContent: align === 'space-between' ? 'space-between' : 'flex-start' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, justifyContent: 'center', alignItems: 'center' },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextSm: { fontSize: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary, marginRight: 10,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.divider,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  btn: {
    height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.surfaceSecondary },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.criticalBg },
  btnSm: { height: 40, borderRadius: 10, paddingHorizontal: 16 },
  btnLg: { height: 60, borderRadius: 16 },
  btnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnIcon: { marginRight: 8 },
  btnText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  btnTextSecondary: { color: Colors.text },
  btnTextGhost: { color: Colors.textSecondary },
  btnTextDanger: { color: Colors.critical },
  btnTextSm: { fontSize: 14, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
  sectionAction: { fontSize: 15, fontWeight: '500', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 10, textAlign: 'center', letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
