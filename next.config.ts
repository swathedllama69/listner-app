import type { NextConfig } from "next";

// Check if we are intentionally building for the mobile app
const isCapacitor = process.env.CAPACITOR === 'true';

const nextConfig: NextConfig = {
  // CRITICAL FIX: Only set 'export' when CAPACITOR=true is present.
  output: isCapacitor ? 'export' : undefined,
  images: {
    // Only unoptimize for the static mobile build
    unoptimized: isCapacitor,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;