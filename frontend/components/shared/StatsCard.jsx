import { Card, CardContent } from "@/components/ui/card";

export default function StatsCard({ title, value, hint }) {
  return (
    <Card className="rounded-xl border-border">
      <CardContent className="p-4">
        <p className="text-sm text-text-muted">{title}</p>
        <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
        {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
}
