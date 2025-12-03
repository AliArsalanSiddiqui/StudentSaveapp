export const COLORS = {
  primary: '#c084fc',
  secondary: '#8b5cf6',
  background: '#1e1b4b',
  backgroundLight: '#2e2557',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  white: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#c084fc',
  textTertiary: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
};

export const CATEGORIES = [
  'All',
  'Restaurant',
  'Cafe',
  'Arcade',
  'Clothing',
  'Entertainment',
] as const;

export const SUBSCRIPTION_FEATURES = {
  monthly: [
    'All discounts',
    'Unlimited scans',
    'Priority support',
    'Basic analytics',
  ],
  semester: [
    'All discounts',
    'Unlimited scans',
    'Priority support',
    'Advanced analytics',
    '20% savings vs monthly',
  ],
  yearly: [
    'All discounts',
    'Unlimited scans',
    'Priority support',
    'Advanced analytics',
    'Early access to new features',
    '50% savings vs monthly',
  ],
};

export const APP_CONFIG = {
  name: 'StudentSave',
  version: '1.0.0',
  supportEmail: 'support@studentsave.com',
  websiteUrl: 'https://studentsave.com',
  privacyUrl: 'https://studentsave.com/privacy',
  termsUrl: 'https://studentsave.com/terms',
};

export const VALIDATION = {
  minNameLength: 2,
  maxNameLength: 50,
  minAge: 16,
  maxAge: 100,
  phoneRegex: /^(\+92|0)?[0-9]{10}$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};