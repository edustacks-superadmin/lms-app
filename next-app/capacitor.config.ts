import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.co.edustacks.maheshiesacademy',
  appName: 'Mahesh IES Academy',
  webDir: 'public',
  server: {
    url: 'http://maheshiesacademy.edustacks.co.in/',
    cleartext: true
  }
};

export default config;
