/** نصوص وأقسام صفحة الهبوط */

export const landingNavLinks = [
  { id: "how", label: "كيف تبدأ" },
  { id: "features", label: "المميزات" },
  { id: "pricing", label: "الأسعار" },
  { id: "journey", label: "رحلة التسجيل" }
];

export const landingStats = [
  {
    value: "4",
    label: "لوحات متخصصة",
    hint: "طالب، معلّم، وليّ أمر، إدارة"
  },
  {
    value: "500+",
    label: "معلّم معتمد",
    hint: "على منهج الثانوية العامة"
  },
  {
    value: "1,200+",
    label: "جلسة لايف شهرياً",
    hint: "جلسات تفاعلية مع المعلّم"
  },
  {
    value: "80",
    label: "تبدأ من 80 جنيه",
    hint: "أفضل قيمة مقابل جودة"
  }
];

export const landingSteps = [
  {
    step: "١",
    title: "سجّل مجاناً",
    description: "أنشئ حسابك بإيميلك — بدون بطاقة بنك.",
    badge: "مجاني خالص",
    badgeVariant: "free"
  },
  {
    step: "٢",
    title: "اختر المادة والمعلّم",
    description: "تصفّح المعلمين واقرأ التقييمات واختر الأنسب ليك.",
    badge: null
  },
  {
    step: "٣",
    title: "احجز أول حصة مجاناً",
    description: "أول حصة مع أي معلم في أي مادة مجانية تماماً.",
    badge: "أول حصة هدية",
    badgeVariant: "free"
  },
  {
    step: "٤",
    title: "ادفع واكمل",
    description: "اختر حصة منفردة أو اشتراك شهري يوفّر أكثر.",
    badge: "ابدأ من ٦٠ جنيه",
    badgeVariant: "paid"
  }
];

export const landingFeatures = [
  {
    icon: "video",
    title: "جلسات لايف تفاعلية",
    description: "حضور مباشر، أسئلة فورية، وسبورة مشتركة مع المعلّم."
  },
  {
    icon: "graduation",
    title: "منهج الثانوية العامة",
    description: "مواد وشُعب واضحة تناسب احتياجات طلاب الثانوي في مصر."
  },
  {
    icon: "users",
    title: "متابعة وليّ الأمر",
    description: "تقارير حضور وأداء تساعدك تتابع ابنك بخطوات بسيطة."
  },
  {
    icon: "book",
    title: "غرف مذاكرة",
    description: "مساحة منظمة للمراجعة والتنسيق بين الطلاب."
  },
  {
    icon: "shield",
    title: "بيئة آمنة",
    description: "صلاحيات حسب الدور وحماية لبيانات الحسابات."
  },
  {
    icon: "trending",
    title: "تقارير وتقدّم",
    description: "لوحة للطالب والمعلّم لقياس التفاعل والإنجاز."
  }
];

export const landingPricingPlans = [
  {
    id: "free",
    name: "تجربة مجانية",
    price: "مجاناً",
    priceIsText: true,
    period: "أول حصة مع كل معلم / مادة",
    featured: false,
    features: [
      "أول حصة مجانية بدون بطاقة",
      "تقرير أداء بعد الحصة",
      "تجربة مع أكثر من معلّم",
      "متابعة وليّ الأمر"
    ],
    cta: "ابدأ مجاناً",
    href: "/auth/register",
    variant: "outline"
  },
  {
    id: "session",
    name: "حصة منفردة",
    price: "٦٠",
    priceSuffix: "جنيه",
    period: "الحصة الواحدة — حسب المعلّم",
    featured: false,
    features: [
      "ادفع كل حصة منفردة",
      "بطاقة بنك أو محفظة",
      "استرداد لو إلغاء مبكر",
      "تسجيل الحصة ٤٨ ساعة",
      "شهادة حضور"
    ],
    cta: "احجز حصة",
    href: "/auth/register",
    variant: "outline"
  },
  {
    id: "silver",
    name: "Silver",
    price: "٢٩٩",
    priceSuffix: "جنيه",
    period: "/ شهر — ٤ حصص",
    featured: false,
    features: [
      "٤ حصص كل شهر",
      "جميع المواد والمعلمين",
      "أولوية الحجز",
      "تقارير أسبوعية للأهل",
      "خصم على العروض"
    ],
    cta: "اشترك الآن",
    href: "/auth/register",
    variant: "outline"
  },
  {
    id: "gold",
    name: "Gold",
    price: "٤٩٩",
    priceSuffix: "جنيه",
    period: "/ شهر — ١٠ حصص",
    featured: true,
    featuredLabel: "الأكثر طلباً",
    features: [
      "١٠ حصص كل شهر",
      "جميع المواد والمعلمين",
      "أولوية الحجز المتقدم",
      "تقارير أسبوعية + تحليل",
      "خصم ٢٠٪ على الحصص الإضافية",
      "دعم أولوية"
    ],
    cta: "اشترك في Gold",
    href: "/auth/register",
    variant: "primary"
  }
];

export const landingJourneySteps = [
  {
    icon: "edit",
    title: "إنشاء الحساب",
    pill: "مجاني — بدون بطاقة",
    pillVariant: "free",
    description:
      "سجّل بإيميلك في ثوانٍ. لا تحتاج بطاقة بنك. بعد التسجيل تنتقل مباشرة إلى لوحتك."
  },
  {
    icon: "search",
    title: "اختيار المعلّم والحصة",
    pill: null,
    description: "تصفّح المعلمين حسب المادة والصف والتقييم. كل معلّم له ملف تعريفي وتقييمات الطلاب."
  },
  {
    icon: "gift",
    title: "أول حصة مجانية",
    pill: "هدية منا",
    pillVariant: "free",
    description:
      "أول حصة مع أي معلّم في أي مادة — مجانية. جرّب واتأكد قبل الدفع. بعد الحصة يصلك تقرير أداء."
  },
  {
    icon: "creditCard",
    title: "اختيار طريقة الدفع",
    pill: null,
    description:
      "ادفع كل حصة على حدة (ابتداءً من ٦٠ جنيه)، أو وفّر أكثر مع الاشتراك الشهري. بطاقة بنك أو محفظة."
  },
  {
    icon: "live",
    title: "ادخل الحصة وذاكر",
    pill: "لايف تفاعلي",
    pillVariant: "accent",
    description:
      "الدخول بضغطة واحدة — سبورة مع المعلّم، محادثة، ومتابعة لحظية لوليّ الأمر. تقرير أداء تلقائي بعد الحصة."
  }
];

export const demoPromoCodes = {
  PEAK20: "خصم ٢٠٪ تم تفعيله!",
  WELCOME: "حصة مجانية إضافية تم إضافتها!",
  EARLYBIRD: "خصم Early Bird — ٣٠٪ تم تفعيله!"
};
