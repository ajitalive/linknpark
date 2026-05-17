export const Colors = {
  primary: '#3B2FF5',
  primaryLight: '#6B5FFF',
  primaryDark: '#2518C4',
  primaryBg: '#EEF2FF',

  amber: '#F59E0B',
  amberLight: '#FCD34D',
  amberBg: '#FFFBEB',

  bg: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F3F7',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: '#E5E7EB',

  // Severity
  critical: '#DC2626',
  criticalBg: '#FEF2F2',
  high: '#EA580C',
  highBg: '#FFF7ED',
  medium: '#D97706',
  mediumBg: '#FFFBEB',
  low: '#0891B2',
  lowBg: '#ECFEFF',
  success: '#16A34A',
  successBg: '#F0FDF4',

  // Status
  paused: '#9CA3AF',
  pausedBg: '#F9FAFB',

  white: '#FFFFFF',
  black: '#000000',
};

export const IncidentColors: Record<string, { color: string; bg: string; label: string }> = {
  wrong_parking: { color: Colors.medium, bg: Colors.mediumBg, label: 'Wrong Parking' },
  blocking_exit: { color: Colors.high, bg: Colors.highBg, label: 'Blocking Exit' },
  towing_risk: { color: Colors.high, bg: Colors.highBg, label: 'Towing Risk' },
  emergency: { color: Colors.critical, bg: Colors.criticalBg, label: 'Emergency' },
  accident: { color: Colors.critical, bg: Colors.criticalBg, label: 'Accident' },
  lights_on: { color: Colors.low, bg: Colors.lowBg, label: 'Lights On' },
  window_open: { color: Colors.low, bg: Colors.lowBg, label: 'Window Open' },
  security_concern: { color: Colors.critical, bg: Colors.criticalBg, label: 'Security Concern' },
  lost_found: { color: Colors.primary, bg: Colors.primaryBg, label: 'Lost & Found' },
  visitor_arrived: { color: Colors.success, bg: Colors.successBg, label: 'Visitor Arrived' },
  general: { color: Colors.textSecondary, bg: Colors.surfaceSecondary, label: 'General Alert' },
};
