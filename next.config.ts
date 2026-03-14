import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS ? [process.env.ALLOWED_ORIGINS] : ["10.0.0.10", "localhost"],
      bodySizeLimit: '10mb',
    },
  },
  allowedDevOrigins: ["10.0.0.10", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.167.5.46',
        port: '8012',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
