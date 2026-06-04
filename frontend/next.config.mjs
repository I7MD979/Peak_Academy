import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  disableLogger: true
});
