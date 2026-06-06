/** روابط تنقل صفحة الهبوط — تطابق id الأقسام */
export const landingNavLinks = [
  { id: "levels", label: "المناهج" },
  { id: "how", label: "كيف تبدأ" },
  { id: "features", label: "المميزات" },
  { id: "pricing", label: "الأسعار" }
];

/** بطاقات المميزات السريعة أسفل الـ Hero */
export const landingQuickStatsFallback = [
  { icon: "live_tv", title: "حصص تفاعلية", sub: "بث مباشر مع المعلّم" },
  { icon: "schedule", title: "مواعيد مرنة", sub: "تناسب نمط حياتك الدراسي" },
  { icon: "menu_book", title: "مناهج كاملة", sub: "بأحدث معايير الوزارة" },
  { icon: "payments", title: "تبدأ من 80 جنيه", sub: "أفضل قيمة مقابل جودة" }
];

/** عدّادات الـ Hero عند غياب بيانات الـ API */
export const landingHeroCountersFallback = {
  sessions: 300,
  teachers: 100,
  rating: 4.9
};

export const LANDING_COLORS = {
  navy: "#080d16",
  navyCard: "#0d1625",
  surface: "#050606",
  orange: "#f5721a",
  muted: "#8da3bc"
};
