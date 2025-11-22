import type { NextConfig } from "next";

// Check if we are intentionally building for the mobile app
const isCapacitor = process.env.CAPACITOR === 'true' || true; // Default to true to be safe for now

const nextConfig: NextConfig = {
  // 1. CRITICAL: Generate static HTML for Capacitor
  output: isCapacitor ? 'export' : undefined,

  // 2. CRITICAL: Disable server-side image optimization for mobile
  images: {
    unoptimized: isCapacitor,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 3. CRITICAL: Fix the "Eval" Crash
  // This tells the browser/webview: "It is okay to use libraries that use eval()"
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