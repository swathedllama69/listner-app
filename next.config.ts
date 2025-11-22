/** @type {import('next').NextConfig} */
const nextConfig = {
  // 💡 FIX: Explicitly setting the configuration is the only way to silence the Turbopack warning.
  turbopack: {},

  // FINAL FIX: We add 'unsafe-inline' to script-src for development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              // 👇 FINAL FIX: 'unsafe-inline' must be added to script-src for dev environment hot-reloading to work.
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: ws:;"
              : "script-src 'self'; style-src 'self'; connect-src 'self' https: ws:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;