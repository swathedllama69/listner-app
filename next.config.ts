/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keeps your console quiet during dev
  turbopack: {},

  // Allow images from Supabase (good to have for future)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;