import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || ["10.0.0.10", "localhost"],
      bodySizeLimit: '10mb',
    },
  },
  allowedDevOrigins: process.env.ALLOWED_ORIGINS?.split(",") || ["10.0.0.10", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: process.env.IMAGE_PROTOCOL as "http" | "https",
        hostname: process.env.IMAGE_HOSTNAME as string,
        port: process.env.IMAGE_PORT as string,
      },
    ],
  },
  output: "standalone",
};

export default withNextIntl(nextConfig);
