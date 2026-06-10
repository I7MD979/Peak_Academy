export const BASE_URL =
  process.env.BASE_URL || "https://peak-academy-kappa.vercel.app";

export const ADMIN_CREDENTIALS = {
  email: process.env.E2E_ADMIN_EMAIL || "admin@peak.com",
  password: process.env.E2E_ADMIN_PASSWORD || "Admin123!"
};

export const TEACHER_CREDENTIALS = {
  email: process.env.E2E_TEACHER_EMAIL || "teacher@peak.com",
  password: process.env.E2E_TEACHER_PASSWORD || "Teacher123!"
};

export const STUDENT_CREDENTIALS = {
  email: process.env.E2E_STUDENT_EMAIL || "student@peak.com",
  password: process.env.E2E_STUDENT_PASSWORD || "Student123!"
};

export const PARENT_CREDENTIALS = {
  email: process.env.E2E_PARENT_EMAIL || "parent@peak.com",
  password: process.env.E2E_PARENT_PASSWORD || "Parent123!"
};

export const INVALID_CREDENTIALS = {
  email: "not-a-real-user@peak-academy.net",
  password: "WrongPassword99!"
};

/** Actual app routes (from frontend/lib/admin-nav.js) */
export const ROUTES = {
  home: "/",
  login: "/auth/login",
  dashboard: "/admin/dashboard",
  users: "/admin/users",
  sessions: "/admin/sessions",
  withdrawals: "/admin/withdrawals",
  reports: "/admin/reports",
  plans: "/admin/subscriptions",
  discounts: "/admin/promotions",
  landing: "/admin/landing",
  permissions: "/admin/permissions",
  account: "/admin/profile"
} as const;

export type AdminRouteKey = keyof typeof ROUTES;

export const TEACHER_ROUTES = {
  dashboard: "/teacher/dashboard",
  sessions: "/teacher/sessions",
  sessionsNew: "/teacher/sessions/new",
  earnings: "/teacher/earnings",
  analytics: "/teacher/analytics",
  profile: "/teacher/profile",
  studyRooms: "/teacher/study-rooms"
} as const;

export type TeacherRouteKey = keyof typeof TEACHER_ROUTES;

export const STUDENT_ROUTES = {
  dashboard: "/student/dashboard",
  sessions: "/student/sessions",
  subscription: "/student/subscription",
  profile: "/student/profile",
  studyRooms: "/student/study-rooms",
  ask: "/student/ask"
} as const;

export type StudentRouteKey = keyof typeof STUDENT_ROUTES;

export const PARENT_ROUTES = {
  dashboard: "/parent/dashboard",
  report: "/parent/report",
  profile: "/parent/profile"
} as const;

export type ParentRouteKey = keyof typeof PARENT_ROUTES;

export const SIDEBAR_LINKS: { label: string; route: AdminRouteKey }[] = [
  { label: "لوحة التحكم", route: "dashboard" },
  { label: "المستخدمون", route: "users" },
  { label: "الجلسات", route: "sessions" },
  { label: "طلبات السحب", route: "withdrawals" },
  { label: "التقارير", route: "reports" },
  { label: "خطط الاشتراك", route: "plans" },
  { label: "العروض والخصومات", route: "discounts" },
  { label: "صفحة الهبوط", route: "landing" },
  { label: "الصلاحيات", route: "permissions" },
  { label: "حسابي", route: "account" }
];
