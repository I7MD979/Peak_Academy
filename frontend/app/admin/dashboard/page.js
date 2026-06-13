import { fetchServerApi } from "@/lib/server-api";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const initialDashboard = await fetchServerApi("/admin/dashboard");
  return <AdminDashboardClient initialDashboard={initialDashboard} />;
}
