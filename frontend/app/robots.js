export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/student/",
        "/teacher/",
        "/admin/",
        "/parent/",
        "/account/",
        "/onboarding",
        "/auth/callback",
        "/auth/reset-password",
        "/dashboard"
      ]
    },
    sitemap: "https://peak-academy.net/sitemap.xml"
  };
}
