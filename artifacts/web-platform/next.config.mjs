/** @type {import('next').NextConfig} */

// The Replit workspace serves each artifact under a path prefix (BASE_PATH).
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  // Server logic lives in src/server; route handlers stay thin.
  typedRoutes: false,
  ...(basePath ? { basePath } : {}),
  // basePath is a build-time option, so a prefixed build must live in its own
  // output dir to coexist with the default one (used by the E2E basePath suite).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // The Replit preview is a proxied iframe on a different origin.
  allowedDevOrigins: ["*.replit.dev", "*.replit.app", "127.0.0.1", "localhost"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // frame-ancestors instead of X-Frame-Options: the Replit preview
          // embeds the app in a cross-origin iframe, and XFO cannot allow-list
          // origins. Everyone else is denied framing (clickjacking).
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.replit.dev https://*.replit.app https://*.replit.com",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The platform never asks for camera, mic, location or the Payment
          // Request API (PSP-hosted fields handle cards).
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Ignored over plain HTTP (dev); enforced once served over HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
