import { fetchServerApi } from "@/lib/server-api";
import StudentDashboardClient from "./StudentDashboardClient";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const initialData = await fetchServerApi("/student/dashboard");
  return <StudentDashboardClient initialData={initialData} />;
}
