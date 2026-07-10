/** @type {import('next').NextConfig} */

// The Replit workspace serves each artifact under a path prefix (BASE_PATH).
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  // Server logic lives in src/server; route handlers stay thin.
  typedRoutes: false,
  ...(basePath ? { basePath } : {}),
  // The Replit preview is a proxied iframe on a different origin.
  allowedDevOrigins: ["*.replit.dev", "*.replit.app", "127.0.0.1", "localhost"],
};

export default nextConfig;
