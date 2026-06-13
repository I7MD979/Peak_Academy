/** روابط تنقل صفحة الهبوط — تطابق id الأقسام */
export const landingNavLinks = [
  { id: "levels", label: "المناهج" },
  { id: "how", label: "كيف تبدأ" },
  { id: "features", label: "المميزات" },
  { id: "pricing", label: "الأسعار" }
];

/** بطاقات المميزات السريعة أسفل الـ Hero */
export const landingQuickStatsFallback = [
  { icon: "groups", title: "لوحات متخصصة", sub: "طالب، معلّم، ولي أمر، إدارة" },
  { icon: "schedule", title: "معلّم معتمد", sub: "على منهج الثانوية العامة" },
  { icon: "live_tv", title: "جلسة لايف شهرياً", sub: "جلسات تفاعلية مع المعلّم" },
  { icon: "payments", title: "تبدأ من 80 جنيه", sub: "أفضل قيمة مقابل جودة" }
];

/** عدّادات الـ Hero عند غياب بيانات الـ API */
export const landingHeroCountersFallback = {
  sessions: 300,
  teachers: 100,
  rating: 4.9
};

export const LANDING_COLORS = {
  navy: "#0a1220",
  navyCard: "#0f1a2e",
  surface: "#0a1220",
  orange: "#ff7a00",
  muted: "#8da3bc"
};
