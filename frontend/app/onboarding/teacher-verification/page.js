"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";

/** Legacy URL — canonical teacher verification lives in the teacher shell. */
export default function TeacherVerificationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher/profile/verification");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <SectionLoader message="جاري التحويل..." />
    </div>
  );
}
