import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.castleandcards.app',
  appName: 'Castle & Cards',
  webDir: 'dist',
  // The native Android project lives under android-app/ so the existing
  // android-widget/ Glance project doesn't get confused. Both ship side
  // by side from the same CI workflow.
  android: {
    path: 'android-app',
  },
  bundledWebRuntime: false,
  // No remote server url — load the bundled web app from local assets
  // so the app works offline and isn't pinned to live deploys.
  server: {
    androidScheme: 'https',
    // Allow cleartext for localhost (dev only); production traffic to
    // Supabase / NWS / etc. is always HTTPS.
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
    PushNotifications: {
      // Only used when google-services.json is wired up — see
      // android-app/README.md. Until then, web-push via the existing SW
      // continues to work inside the WebView.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
