import { ROLE_LABELS_AR } from "@/lib/profile-form";

const ROLE_PANEL_LABELS = {
  admin: "لوحة الإدارة",
  teacher: "لوحة المعلم",
  student: "لوحة الطالب",
  parent: "لوحة ولي الأمر"
};

const PROFILE_MENU_LABELS = {
  admin: "حسابي",
  teacher: "ملفي الشخصي",
  student: "حسابي",
  parent: "حسابي"
};

const ROUTES = {
  admin: [
    { prefix: "/admin/dashboard", title: "لوحة التحكم", subtitle: "نظرة عامة على المنصة", icon: "dashboard" },
    { prefix: "/admin/profile", title: "حسابي", subtitle: "إعدادات المشرف", icon: "user" },
    { prefix: "/admin/users", title: "المستخدمون", subtitle: "إدارة حسابات المنصة", icon: "users" },
    { prefix: "/admin/sessions", title: "الجلسات", subtitle: "متابعة الجلسات والحالات", icon: "video" },
    { prefix: "/admin/withdrawals", title: "طلبات السحب", subtitle: "مراجعة ومعالجة الطلبات", icon: "creditCard" },
    { prefix: "/admin/reports", title: "التقارير", subtitle: "إحصائيات وتحليلات مالية", icon: "barChart" },
    { prefix: "/admin/subscriptions", title: "خطط الاشتراك", subtitle: "إدارة الباقات والأسعار", icon: "wallet" },
    { prefix: "/admin/promotions", title: "العروض والخصومات", subtitle: "أكواد الخصم والحملات", icon: "tag" },
    { prefix: "/admin/landing", title: "صفحة الهبوط", subtitle: "محتوى وإعدادات الموقع", icon: "globe" }
  ],
  teacher: [
    { prefix: "/teacher/dashboard", title: "لوحتي", subtitle: "ملخص يومك التعليمي", icon: "dashboard" },
    { prefix: "/teacher/sessions/new", title: "جلسة جديدة", subtitle: "إنشاء جلسة للطلاب", icon: "plus" },
    { prefix: "/teacher/sessions", title: "جلساتي", subtitle: "إدارة الجلسات والبث", icon: "video" },
    { prefix: "/teacher/live", title: "جلسة مباشرة", subtitle: "غرفة البث المباشر", icon: "live" },
    { prefix: "/teacher/earnings", title: "أرباحي", subtitle: "الأرباح وطلبات السحب", icon: "wallet" },
    { prefix: "/teacher/analytics", title: "تحليلاتي", subtitle: "إحصائيات أدائك التعليمي", icon: "barChart" },
    { prefix: "/teacher/profile", title: "ملفي الشخصي", subtitle: "بياناتك المهنية", icon: "user" }
  ],
  student: [
    { prefix: "/student/dashboard", title: "الرئيسية", subtitle: "تابع تقدمك اليومي", icon: "home" },
    { prefix: "/student/sessions", title: "الجلسات", subtitle: "جلساتك القادمة والمتاحة", icon: "book" },
    { prefix: "/student/study-rooms", title: "غرف المذاكرة", subtitle: "ذاكر مع زملائك", icon: "school" },
    { prefix: "/student/ask", title: "اسأل مدرس", subtitle: "اطرح سؤالك واحصل على إجابة", icon: "help" },
    { prefix: "/student/subscription", title: "الاشتراك", subtitle: "خطتك وباقات المنصة", icon: "wallet" },
    { prefix: "/student/profile", title: "حسابي", subtitle: "إعدادات حسابك", icon: "user" },
    { prefix: "/student/live", title: "جلسة مباشرة", subtitle: "انضم للجلسة الآن", icon: "live" }
  ],
  parent: [
    { prefix: "/parent/dashboard", title: "الرئيسية", subtitle: "متابعة أبنائك", icon: "home" },
    { prefix: "/parent/profile", title: "حسابي", subtitle: "إعدادات ولي الأمر", icon: "user" },
    { prefix: "/parent/report", title: "التقرير", subtitle: "تقرير الأداء الأسبوعي", icon: "barChart" }
  ]
};

const PROFILE_HREF = {
  admin: "/admin/profile",
  teacher: "/teacher/profile",
  student: "/student/profile",
  parent: "/parent/profile"
};

const HOME_HREF = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard"
};

function matchRoute(pathname, role) {
  const routes = ROUTES[role] || [];
  const sorted = [...routes].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((route) => pathname.startsWith(route.prefix)) || null;
}

export function getTopbarMeta(pathname = "", role = "admin") {
  const match = matchRoute(pathname, role);

  return {
    title: match?.title || ROLE_PANEL_LABELS[role] || "Peak Academy",
    subtitle: match?.subtitle || "",
    icon: match?.icon || "dashboard",
    roleLabel: ROLE_LABELS_AR[role] || role,
    panelLabel: ROLE_PANEL_LABELS[role] || "Peak Academy",
    profileHref: PROFILE_HREF[role] || "/",
    profileMenuLabel: PROFILE_MENU_LABELS[role] || "حسابي",
    homeHref: HOME_HREF[role] || "/"
  };
}

/** مسار تنقل عربي: لوحة الإدارة ← الصفحة الحالية */
export function getTopbarBreadcrumbs(pathname = "", role = "admin") {
  const meta = getTopbarMeta(pathname, role);
  const path = pathname || "";
  const onHome = path === meta.homeHref || path === `${meta.homeHref}/`;

  const crumbs = [{ label: meta.panelLabel, href: meta.homeHref }];

  if (!onHome) {
    crumbs.push({ label: meta.title, href: null });
  }

  return crumbs;
}
