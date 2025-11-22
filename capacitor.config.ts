import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.listner.app',
  appName: 'ListNer',
  webDir: 'out',
  server: {
    hostname: 'listner.vercel.app',
    androidScheme: 'https',
    allowNavigation: [
      'listner.vercel.app',
      'capacitor://localhost',
      'listner://callback'
    ]
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#1f2937",
      launchShowDuration: 1500,
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "small",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // 💡 This block is required by TypeScript because the code uses the plugin.
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "853973010898-b2unfthr8e36gj7gcifa5ah51084ce5j.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;