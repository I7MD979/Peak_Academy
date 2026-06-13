"use client";

import { ProfileProvider } from "@/components/providers/ProfileProvider";
import { NotificationsProvider } from "@/components/providers/NotificationsProvider";

export default function RoleShellProviders({ initialProfile, children }) {
  return (
    <ProfileProvider initialProfile={initialProfile}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </ProfileProvider>
  );
}
