/** All granular permission keys for the admin panel. */
export const PERMISSIONS = {
  DASHBOARD:            "dashboard",
  USERS_READ:           "users.read",
  USERS_WRITE:          "users.write",
  USERS_SUBSCRIPTIONS:  "users.subscriptions",
  SESSIONS_READ:        "sessions.read",
  WITHDRAWALS_READ:     "withdrawals.read",
  WITHDRAWALS_WRITE:    "withdrawals.write",
  REPORTS:              "reports",
  PLANS_READ:           "plans.read",
  PLANS_WRITE:          "plans.write",
  PROMOTIONS_READ:      "promotions.read",
  PROMOTIONS_WRITE:     "promotions.write",
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
      { key: PERMISSIONS.USERS_WRITE,         label: "تعديل بيانات المستخدمين وتعليق الحسابات" },
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
    label: "الخطط والعروض",
    permissions: [
      { key: PERMISSIONS.PLANS_READ,      label: "عرض خطط الاشتراك" },
      { key: PERMISSIONS.PLANS_WRITE,     label: "إنشاء وتعديل وإيقاف خطط الاشتراك" },
      { key: PERMISSIONS.PROMOTIONS_READ, label: "عرض العروض والخصومات" },
      { key: PERMISSIONS.PROMOTIONS_WRITE,"label": "إنشاء وتعديل وحذف العروض" },
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
