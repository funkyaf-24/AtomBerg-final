/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', process.env.NEXT_PUBLIC_APP_URL ?? ''],
    },
  },

  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
