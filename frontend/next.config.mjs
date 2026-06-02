/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/student/my-sessions",
        destination: "/student/sessions?tab=mine",
        permanent: true
      },
      {
        source: "/dashboard",
        destination: "/student/dashboard",
        permanent: false
      }
    ];
  }
};

export default nextConfig;
