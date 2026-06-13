import { headers } from "next/headers";
import { readUserProfileHeader } from "@/lib/role-routes-server";
import TeacherLayoutClient from "./layout.client.jsx";

export const dynamic = "force-dynamic";

/**
 * Server wrapper: reads the user profile that middleware (proxy.js) already
 * verified for this request and passes it to the client layout. This avoids a
 * second client-side /auth/me call + full-page loader on every navigation.
 */
export default async function TeacherLayout({ children }) {
  const initialProfile = readUserProfileHeader((await headers()).get("x-user-profile"));

  return <TeacherLayoutClient initialProfile={initialProfile}>{children}</TeacherLayoutClient>;
}
