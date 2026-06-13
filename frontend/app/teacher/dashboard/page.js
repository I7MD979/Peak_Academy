import { fetchServerApi } from "@/lib/server-api";
import TeacherDashboardClient from "./TeacherDashboardClient";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardRoutePage() {
  const [initialData, initialVerification] = await Promise.all([
    fetchServerApi("/teacher/dashboard"),
    fetchServerApi("/account/verification-status")
  ]);

  return (
    <TeacherDashboardClient
      initialData={initialData}
      initialVerification={initialVerification}
    />
  );
}
