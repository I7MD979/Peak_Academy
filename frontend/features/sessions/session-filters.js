"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function SessionFilters({ filters, onChange, onApply }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Subject (math, physics...)"
          value={filters.subject}
          onChange={(e) => onChange({ ...filters, subject: e.target.value })}
        />
        <Input
          placeholder="Grade (first, second, third)"
          value={filters.grade}
          onChange={(e) => onChange({ ...filters, grade: e.target.value })}
        />
        <Button onClick={onApply}>Apply Filters</Button>
      </CardContent>
    </Card>
  );
}
