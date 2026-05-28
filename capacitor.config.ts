import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.burgerqueen.pos',
  appName: 'Burger Queen POS',
  webDir: 'dist',
  server: {
    url: 'https://burger-pos-wheat.vercel.app/',
    cleartext: true
  }
};

export default config;