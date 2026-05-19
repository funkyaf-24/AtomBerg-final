/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Allow localhost and any Vercel deployment URL.
      // NEXT_PUBLIC_APP_URL should be set in Vercel env vars to your production domain.
      allowedOrigins: [
        'localhost:3000',
        '*.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL ?? '',
      ].filter(Boolean),
    },
  },

  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
