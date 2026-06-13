/** All granular permission keys for the admin panel. */
export const PERMISSIONS = {
  DASHBOARD:            "dashboard",
  USERS_READ:           "users.read",
  USERS_EDIT:           "users.edit",
  USERS_DELETE:         "users.delete",
  USERS_SUBSCRIPTIONS:  "users.subscriptions",
  SESSIONS_READ:        "sessions.read",
  WITHDRAWALS_READ:     "withdrawals.read",
  WITHDRAWALS_WRITE:    "withdrawals.write",
  REPORTS:              "reports",
  PLANS_READ:           "plans.read",
  PLANS_CREATE:         "plans.create",
  PLANS_EDIT:           "plans.edit",
  PLANS_DELETE:         "plans.delete",
  PROMOTIONS_READ:      "promotions.read",
  PROMOTIONS_CREATE:    "promotions.create",
  PROMOTIONS_EDIT:      "promotions.edit",
  PROMOTIONS_DELETE:    "promotions.delete",
  VERIFICATION_REVIEW:  "verification.review",
  LANDING:              "landing",
};

/** Grouped for the permissions management UI. */
export const PERMISSION_GROUPS = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    permissions: [
      { key: PERMISSIONS.DASHBOARD, label: "عرض لوحة التحكم والإحصائيات العامة" }
    ]
  },
  {
    key: "users",
    label: "المستخدمون",
    permissions: [
      { key: PERMISSIONS.USERS_READ,          label: "عرض قائمة المستخدمين وتفاصيلهم" },
      { key: PERMISSIONS.USERS_EDIT,          label: "تعديل بيانات المستخدمين والتحقق منهم وتعليق حساباتهم" },
      { key: PERMISSIONS.USERS_DELETE,        label: "حذف حسابات المستخدمين" },
      { key: PERMISSIONS.USERS_SUBSCRIPTIONS, label: "إدارة اشتراكات الطلاب (إضافة / تعديل / إلغاء)" },
    ]
  },
  {
    key: "sessions",
    label: "الجلسات",
    permissions: [
      { key: PERMISSIONS.SESSIONS_READ, label: "عرض الجلسات وإحصائياتها" },
    ]
  },
  {
    key: "financial",
    label: "المالية والتقارير",
    permissions: [
      { key: PERMISSIONS.WITHDRAWALS_READ,  label: "عرض طلبات سحب المعلمين" },
      { key: PERMISSIONS.WITHDRAWALS_WRITE, label: "قبول أو رفض طلبات السحب" },
      { key: PERMISSIONS.REPORTS,           label: "عرض التقارير المالية التفصيلية" },
    ]
  },
  {
    key: "plans",
    label: "خطط الاشتراك",
    permissions: [
      { key: PERMISSIONS.PLANS_READ,   label: "عرض خطط الاشتراك" },
      { key: PERMISSIONS.PLANS_CREATE, label: "إنشاء خطط اشتراك جديدة" },
      { key: PERMISSIONS.PLANS_EDIT,   label: "تعديل وإيقاف خطط الاشتراك" },
      { key: PERMISSIONS.PLANS_DELETE, label: "حذف خطط الاشتراك" },
    ]
  },
  {
    key: "promotions",
    label: "العروض والخصومات",
    permissions: [
      { key: PERMISSIONS.PROMOTIONS_READ,   label: "عرض العروض والخصومات" },
      { key: PERMISSIONS.PROMOTIONS_CREATE, label: "إنشاء عروض وخصومات جديدة" },
      { key: PERMISSIONS.PROMOTIONS_EDIT,   label: "تعديل العروض والخصومات" },
      { key: PERMISSIONS.PROMOTIONS_DELETE, label: "حذف العروض والخصومات" },
    ]
  },
  {
    key: "verification",
    label: "التحقق من الهوية",
    permissions: [
      { key: PERMISSIONS.VERIFICATION_REVIEW, label: "مراجعة مستندات التحقق (طلاب ومدرسين)" }
    ]
  },
  {
    key: "landing",
    label: "صفحة الهبوط",
    permissions: [
      { key: PERMISSIONS.LANDING, label: "تعديل إحصائيات ومحتوى صفحة الهبوط" },
    ]
  },
];

export const ALL_ASSIGNABLE_PERMISSIONS = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key)
);
