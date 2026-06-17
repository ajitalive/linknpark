export const Colors = {
  // Brand Neon Green
  primary: '#CCFF00', 
  primaryLight: '#D9FF33',
  primaryDark: '#A3CC00',
  primaryBg: '#1A2000',

  amber: '#F59E0B',
  amberLight: '#FCD34D',
  amberBg: '#332305',

  // Dark Theme Fundamentals
  bg: '#09090B',
  surface: '#18181B',
  surfaceSecondary: '#27272A',

  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  divider: '#27272A',

  // Severity
  critical: '#EF4444',
  criticalBg: '#3F1616',
  high: '#F97316',
  highBg: '#3D1C08',
  medium: '#EAB308',
  mediumBg: '#332704',
  low: '#06B6D4',
  lowBg: '#08333B',
  success: '#22C55E',
  successBg: '#092B14',

  // Status
  paused: '#71717A',
  pausedBg: '#27272A',

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
