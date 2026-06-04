import LiveSessionRoom from "@/components/shared/LiveSessionRoom";

export default function TeacherLivePage({ params }) {
  return <LiveSessionRoom sessionId={params.id} isTeacher />;
}
