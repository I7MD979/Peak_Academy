/** Unified topbar theme tokens (MD3 dark + light + brand). */
export const TOPBAR_THEMES = {
  surface: {
    header:
      "sticky top-0 z-30 border-b border-outline-variant/50 bg-surface-container/95 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-surface-container/85",
    crumbLink: "text-on-surface-variant hover:text-md-primary",
    crumbCurrent: "text-on-surface-variant",
    crumbSep: "text-on-surface-variant/40",
    title: "text-on-surface",
    subtitle: "text-on-surface-variant",
    iconWrap: "bg-primary-container/15 text-md-primary",
    roleBadge: "border-primary-container/25 bg-primary-container/10 text-md-primary",
    menuBtn: "border-outline-variant/60 bg-surface-container-high hover:border-primary-container/40",
    menuBtnOpen: "border-primary-container/40 ring-2 ring-primary-container/15",
    avatar: "border-outline-variant/50 bg-surface-container-highest text-md-primary",
    userName: "text-on-surface",
    chevron: "text-on-surface-variant",
    dropdown:
      "border-outline-variant bg-surface-container-high shadow-xl shadow-black/25 ring-1 ring-outline-variant/30",
    dropdownHeader: "border-outline-variant/50 bg-surface-container",
    dropdownName: "text-on-surface",
    dropdownEmail: "text-on-surface-variant",
    dropdownRole: "bg-primary-container/15 text-md-primary",
    dropdownItem: "text-on-surface hover:bg-surface-container-highest hover:text-md-primary",
    dropdownLogout: "text-error hover:bg-error/10",
    notifyBtn:
      "border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:border-primary-container/40 hover:text-md-primary",
    notifyBtnOpen: "border-primary-container/40 ring-2 ring-primary-container/15",
    quickAction:
      "bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
  },
  light: {
    header:
      "sticky top-0 z-30 border-b border-border/70 bg-card/95 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-card/80",
    crumbLink: "text-text-muted hover:text-accent",
    crumbCurrent: "text-text-muted",
    crumbSep: "text-text-muted/40",
    title: "text-primary",
    subtitle: "text-text-muted",
    iconWrap: "bg-accent/10 text-accent",
    roleBadge: "border-primary/15 bg-primary/5 text-primary",
    menuBtn: "border-border bg-card hover:border-accent/25 hover:shadow-sm",
    menuBtnOpen: "border-accent/30 ring-2 ring-accent/10",
    avatar: "border-border bg-primary/10 text-primary",
    userName: "text-text",
    chevron: "text-text-muted",
    dropdown: "border-border bg-card shadow-xl ring-1 ring-black/5",
    dropdownHeader: "border-border bg-bg/50",
    dropdownName: "text-text",
    dropdownEmail: "text-text-muted",
    dropdownRole: "bg-primary/10 text-primary",
    dropdownItem: "text-text hover:bg-accent/10 hover:text-accent",
    dropdownLogout: "text-danger hover:bg-danger/10",
    notifyBtn:
      "border-border bg-card text-text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
    notifyBtnOpen: "border-accent/30 ring-2 ring-accent/10",
    quickAction: "bg-accent text-white shadow-md hover:bg-orange-600"
  },
  brand: {
    header:
      "sticky top-0 z-30 border-b border-white/10 bg-gradient-to-l from-primary to-[#12182a] shadow-md",
    crumbLink: "text-white/70 hover:text-white",
    crumbCurrent: "text-white/90",
    crumbSep: "text-white/50",
    title: "text-white",
    subtitle: "text-white/65",
    iconWrap: "bg-white/10 text-accent",
    roleBadge: "border-white/20 bg-white/10 text-white",
    menuBtn: "border-white/20 bg-white/10 text-white hover:bg-white/15",
    menuBtnOpen: "ring-2 ring-white/20",
    avatar: "border-white/20 bg-white/15 text-white",
    userName: "text-white",
    chevron: "text-white/70",
    dropdown: "border-border bg-card shadow-xl ring-1 ring-black/5",
    dropdownHeader: "border-border bg-bg/50",
    dropdownName: "text-text",
    dropdownEmail: "text-text-muted",
    dropdownRole: "bg-primary/10 text-primary",
    dropdownItem: "text-text hover:bg-accent/10 hover:text-accent",
    dropdownLogout: "text-danger hover:bg-danger/10",
    notifyBtn: "border-white/15 text-white/80 hover:bg-white/10 hover:text-white",
    notifyBtnOpen: "ring-2 ring-white/20",
    quickAction: "bg-accent/20 text-accent hover:bg-accent/30"
  }
};

export const ROLE_QUICK_ACTIONS = {
  student: {
    href: "/student/sessions?tab=live",
    label: "انضم لجلسة",
    icon: "live"
  },
  teacher: {
    href: "/teacher/sessions/new",
    label: "جلسة جديدة",
    icon: "plus"
  }
};

export const ROLE_SEARCH_PLACEHOLDER = {
  admin: "بحث في المنصة...",
  teacher: "بحث عن جلسة أو طالب...",
  student: "بحث في الجلسات..."
};
