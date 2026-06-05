export default function sitemap() {
  return [
    { url: "https://peak-academy.net", lastModified: new Date(), priority: 1 },
    { url: "https://peak-academy.net/auth/register", lastModified: new Date(), priority: 0.9 },
    { url: "https://peak-academy.net/auth/login", lastModified: new Date(), priority: 0.8 },
    { url: "https://peak-academy.net/sessions", lastModified: new Date(), priority: 0.8 }
  ];
}
