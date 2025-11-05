import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hamzabot.taxi',
  appName: 'Hamza Bot',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
