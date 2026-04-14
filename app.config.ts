import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Unwall',
  slug: 'unwall',
  scheme: 'unwall',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.yourname.unwall',
    supportsTablet: true,
  },
  android: {
    package: 'com.yourname.unwall',
    adaptiveIcon: {
      backgroundColor: '#F4EEE6',
    },
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: false,
  },
};

export default config;
