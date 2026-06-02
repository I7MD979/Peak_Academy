import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeacherCard({ teacher }) {
  return (
    <Card className="rounded-xl border-border">
      <CardContent className="p-4">
        <h3 className="text-base font-bold text-primary">{teacher?.full_name || "مدرس متميز"}</h3>
        <p className="text-sm text-text-muted">{teacher?.subject || "الفيزياء"}</p>
        <div className="mt-3 flex items-center justify-between">
          <Badge className="bg-success/10 text-success">⭐ {teacher?.rating || 4.8}</Badge>
          <span className="text-xs text-text-muted">{teacher?.sessions_count || 120} جلسة</span>
        </div>
      </CardContent>
    </Card>
  );
}
