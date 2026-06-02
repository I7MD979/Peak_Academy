"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export default function SessionCard({ session, onEnroll, loading }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{session.title}</CardTitle>
        <Badge>{session.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>
          {session.subject} - Grade {session.grade}
        </p>
        <p>Price: {session.price_per_student} EGP</p>
        <p>Seats: {session.max_students}</p>
        <Button onClick={() => onEnroll(session.id)} disabled={loading} className="w-full">
          {loading ? "Enrolling..." : "Enroll"}
        </Button>
      </CardContent>
    </Card>
  );
}
