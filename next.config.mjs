/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server logic lives in src/server; route handlers stay thin.
    typedRoutes: false,
  },
};

export default nextConfig;
