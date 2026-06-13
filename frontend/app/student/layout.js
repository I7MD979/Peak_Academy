import { headers } from "next/headers";
import StudentLayoutClient from "./layout.client.jsx";

export const dynamic = "force-dynamic";

/**
 * Server wrapper: reads the user profile that middleware (proxy.js) already
 * verified for this request (role check, profile completeness, study-room
 * access) and passes it to the client layout. This avoids a second
 * client-side /auth/me call + full-page loader on every navigation.
 */
export default async function StudentLayout({ children }) {
  const raw = (await headers()).get("x-user-profile");
  let initialProfile = null;
  if (raw) {
    try {
      initialProfile = JSON.parse(raw);
    } catch {
      initialProfile = null;
    }
  }

  return <StudentLayoutClient initialProfile={initialProfile}>{children}</StudentLayoutClient>;
}
