import type { NextConfig } from "next";

// Check if we are intentionally building for the mobile app
const isCapacitor = process.env.CAPACITOR === 'true' || true;

const nextConfig: NextConfig = {
  // 1. CRITICAL: Generate static HTML for Capacitor/PWA
  output: isCapacitor ? 'export' : undefined,

  // 2. CRITICAL: Disable server-side image optimization for mobile/static export
  images: {
    unoptimized: isCapacitor,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 💡 FIX: Removed 'swcMinify: true' and 'legacyBrowsers' as they are redundant or deprecated, 
  // causing TypeScript errors in your current Next.js version.
  experimental: {
    // This flag helps prevent Next.js from trying to dynamically load worker scripts, 
    // which is the common cause of the CSP 'unsafe-eval' error in static builds.
    nextScriptWorkers: false,
  },

  // 3. CSP Header (Required to force 'unsafe-eval' on the PWA/Webview)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;