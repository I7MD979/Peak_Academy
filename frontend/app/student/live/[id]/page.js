import LiveSessionRoom from "@/components/shared/LiveSessionRoom";

export default function StudentLivePage({ params }) {
  return <LiveSessionRoom sessionId={params.id} isTeacher={false} />;
}
