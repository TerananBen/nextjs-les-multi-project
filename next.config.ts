import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
  },
  allowedDevOrigins: ["10.0.0.10", "localhost"],
};

export default withNextIntl(nextConfig);
