import { Platform } from 'react-native';

export const COLORS = {
  bg: '#F4EEE6',
  bg2: '#EADFCE',
  paper: '#FBF7F2',
  card: '#F7F0E7',
  card2: '#EFE3D4',
  text: '#2A241F',
  subtext: '#6C645C',
  line: '#DCCFBE',
  olive: '#66705B',
  moss: '#8A9777',
  clay: '#B48363',
  gold: '#A88D62',
  white: '#FFFFFF',
  overlay: 'rgba(42,36,31,0.22)',
  shadow: 'rgba(42,36,31,0.16)',
};

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
};

export const RADIUS = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
};

export const FONTS = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const SHADOW = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 1,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
};
