// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.listner.app',
  appName: 'ListNer',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      // Set the background color to match your app's dark theme
      backgroundColor: "#1f2937",
      launchShowDuration: 1500, // Show for 1.5 seconds
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "small",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;