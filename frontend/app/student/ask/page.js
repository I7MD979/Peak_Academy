import { redirect } from "next/navigation";

/** Legacy route — ask-teacher feature removed from student UI. */
export default function StudentAskRemovedPage() {
  redirect("/student/dashboard");
}
