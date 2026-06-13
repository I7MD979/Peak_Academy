import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  CircleHelp,
  CreditCard,
  GraduationCap,
  Hand,
  Home,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Monitor,
  Mountain,
  Paperclip,
  Plus,
  Radio,
  Search,
  Send,
  Shield,
  Smartphone,
  Star,
  StopCircle,
  TrendingUp,
  User,
  Users,
  Video,
  Wallet,
  X,
  CheckCircle2,
  CircleDollarSign,
  ChevronDown,
  Gift,
  Globe,
  PenLine,
  Tag,
  RefreshCw,
  Lock,
  Unlock,
  Download,
  FileText,
  Eye,
  MessageCircle,
  MicOff,
  Zap,
  Tv,
  Copy
} from "lucide-react";

/** @type {Record<string, import('lucide-react').LucideIcon>} */
export const iconMap = {
  dashboard: LayoutDashboard,
  home: Home,
  users: Users,
  video: Video,
  creditCard: CreditCard,
  barChart: BarChart3,
  calendar: Calendar,
  calendarDays: CalendarDays,
  plus: Plus,
  wallet: Wallet,
  user: User,
  book: BookOpen,
  school: Building2,
  help: CircleHelp,
  bell: Bell,
  logout: LogOut,
  menu: Menu,
  close: X,
  mountain: Mountain,
  check: CheckCircle2,
  checkCircle: CheckCircle2,
  star: Star,
  graduation: GraduationCap,
  trending: TrendingUp,
  bank: Building2,
  live: Radio,
  liveTv: Tv,
  money: CircleDollarSign,
  payments: CircleDollarSign,
  search: Search,
  shield: Shield,
  chevronDown: ChevronDown,
  arrowRight: ArrowRight,
  gift: Gift,
  edit: PenLine,
  tag: Tag,
  globe: Globe,
  refresh: RefreshCw,
  lock: Lock,
  unlock: Unlock,
  download: Download,
  description: FileText,
  fileText: FileText,
  visibility: Eye,
  mic: Mic,
  micOff: MicOff,
  send: Send,
  messageCircle: MessageCircle,
  stopCircle: StopCircle,
  hand: Hand,
  paperclip: Paperclip,
  image: Image,
  smartphone: Smartphone,
  monitor: Monitor,
  zap: Zap,
  copy: Copy
};

const ICON_ALIASES = {
  "arrow-right": "arrowRight",
  check_circle: "checkCircle",
  "message-circle": "messageCircle",
  "stop-circle": "stopCircle",
  live_tv: "liveTv",
  workspace_premium: "shield",
  group: "users",
  groups: "users",
  schedule: "calendarDays",
  account_balance_wallet: "wallet"
};

function normalizeIconName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  if (iconMap[raw]) return raw;
  if (ICON_ALIASES[raw]) return ICON_ALIASES[raw];
  const camel = raw.replace(/[-_]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  if (iconMap[camel]) return camel;
  return raw;
}

export function resolveIcon(name) {
  const key = normalizeIconName(name);
  const icon = iconMap[key];
  if (icon) return icon;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[Icon] Unknown icon name "${name}" — falling back to home`);
  }
  return Home;
}
