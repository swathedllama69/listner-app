import type { NextConfig } from "next";

// Check if we are intentionally building for the mobile app
// You can set this env var in your build script: "cross-env CAPACITOR=true next build"
// Or just default to true if this repo is primarily for the mobile app.
const isCapacitor = process.env.CAPACITOR === 'true' || true; // 💡 Defaulting to true for safety in your current context

const nextConfig: NextConfig = {
  // 1. CRITICAL: Generate static HTML/CSS/JS for Capacitor
  output: isCapacitor ? 'export' : undefined,

  // 2. CRITICAL: Disable server-side image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // Add other domains if you load user avatars from Google/Facebook
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },

  // 3. OPTIONAL: Fix CSP issues if deployed to Vercel
  // This allows 'eval' which some libraries might need, preventing the white screen of death.
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