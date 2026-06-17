import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator,
} from 'react-native';
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
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
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
    variant === 'secondary' && styles.btnTextSecondary,
    variant === 'ghost' && styles.btnTextGhost,
    variant === 'danger' && styles.btnTextDanger,
    size === 'sm' && styles.btnTextSm,
  ];
  return (
    <TouchableOpacity style={btnStyle} onPress={onPress} activeOpacity={0.8} disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon && <View style={styles.btnIcon}>{icon}</View>}
          <Text style={textStyle}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
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
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextSm: { fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, marginRight: 8,
    borderWidth: 1, borderColor: Colors.divider,
  },
  chipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.divider,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 2,
  },
  btn: {
    height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primary },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.criticalBg, borderWidth: 1, borderColor: Colors.critical },
  btnSm: { height: 36, borderRadius: 10, paddingHorizontal: 14 },
  btnLg: { height: 56, borderRadius: 14 },
  btnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnIcon: { marginRight: 8 },
  btnText: { fontSize: 15, fontWeight: '700', color: Colors.bg }, // Dark text for primary buttons
  btnTextSecondary: { color: Colors.primary },
  btnTextGhost: { color: Colors.primary },
  btnTextDanger: { color: Colors.critical },
  btnTextSm: { fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionAction: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
