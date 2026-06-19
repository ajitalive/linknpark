export const Colors = {
  // Brand Neon Green
  primary: '#2CFF05', 
  primaryLight: '#8BFF6B',
  primaryDark: '#1EAB04',
  primaryBg: '#E9FFDF',

  amber: '#F59E0B',
  amberLight: '#FCD34D',
  amberBg: '#FEF3C7',

  // Clean Light Theme Fundamentals
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',

  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  divider: '#E5E7EB',

  // Severity
  critical: '#EF4444',
  criticalBg: '#FEE2E2',
  high: '#F97316',
  highBg: '#FFEDD5',
  medium: '#EAB308',
  mediumBg: '#FEF9C3',
  low: '#0EA5E9',
  lowBg: '#E0F2FE',
  success: '#10B981',
  successBg: '#D1FAE5',

  // Status
  paused: '#6B7280',
  pausedBg: '#F3F4F6',

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
