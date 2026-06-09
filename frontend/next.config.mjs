import { withSentryConfig } from "@sentry/nextjs";
import { headersForPath } from "./lib/security-headers.js";

const API_UPSTREAM =
  process.env.API_UPSTREAM_URL?.replace(/\/$/, "") ||
  "https://peakacademy-production.up.railway.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: headersForPath("/")
      },
      {
        source: "/auth/:path*",
        headers: headersForPath("/auth/login")
      },
      {
        source: "/onboarding/:path*",
        headers: headersForPath("/onboarding")
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/peak-api/:path*",
        destination: `${API_UPSTREAM}/api/:path*`
      }
    ];
  },
  async redirects() {
    return [
      {
        source: "/student/my-sessions",
        destination: "/student/sessions?tab=mine",
        permanent: true
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  org: "darkwhale",
  project: "javascript-nextjs",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true
  }
});
