/** Legal & info pages metadata (slug → route). */
export const LEGAL_PAGES = {
  privacy: {
    slug: "privacy",
    href: "/privacy",
    title: "سياسة الخصوصية",
    description: "توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدامك للمنصة."
  },
  terms: {
    slug: "terms",
    href: "/terms",
    title: "الشروط والأحكام",
    description: "تحكم هذه الشروط استخدامك لمنصة Peak Academy والخدمات التعليمية المقدمة عبرها."
  },
  about: {
    slug: "about",
    href: "/about",
    title: "من نحن",
    description: "تعرف على Peak Academy ورؤيتنا في تمكين طلاب المرحلة الثانوية عبر تعليم تفاعلي عالي الجودة."
  },
  delivery: {
    slug: "delivery",
    href: "/delivery",
    title: "سياسة التسليم والشحن",
    description: "توضح كيفية تسليم الخدمات الرقمية (الحصص، الاشتراكات، والوصول للمنصة) بعد إتمام الدفع."
  },
  refund: {
    slug: "refund",
    href: "/refund",
    title: "سياسة الاسترداد والإلغاء",
    description: "توضح شروط إلغاء الاشتراكات والحصص واسترداد المبالغ المدفوعة عبر المنصة."
  }
};

export const FOOTER_LEGAL_LINKS = [
  LEGAL_PAGES.about,
  LEGAL_PAGES.privacy,
  LEGAL_PAGES.terms,
  LEGAL_PAGES.delivery,
  LEGAL_PAGES.refund
];

export const FOOTER_CONTACT_LINK = {
  label: "تواصل معنا",
  href: "/contact"
};
