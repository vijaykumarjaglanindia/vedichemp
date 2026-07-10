/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server logic lives in src/server; route handlers stay thin.
  typedRoutes: false,
};

export default nextConfig;
