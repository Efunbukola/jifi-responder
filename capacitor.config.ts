import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.jifi_responder',
  appName: 'JIFI Responder',
  webDir: 'www',
  android: {
    allowMixedContent: true
  }
};

export default config;
