"use client";

import AppSidebar from "@/components/shared/AppSidebar";
import { STUDENT_NAV_MAIN, isStudentNavActive } from "@/lib/student-nav";

export default function StudentSidebar(props) {
  return (
    <AppSidebar
      logoHref="/student/dashboard"
      subtitle="لوحة الطالب"
      navMain={STUDENT_NAV_MAIN}
      isNavActive={isStudentNavActive}
      profileHref="/student/profile"
      roleLabel="طالب"
      {...props}
    />
  );
}
