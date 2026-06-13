/** Notification type metadata for the bell dropdown (icon + optional category label). */
export const NOTIFICATION_TYPE_META = {
  child_subscription_paid: {
    icon: "wallet",
    label: "اشتراك"
  },
  general: {
    icon: "bell",
    label: "عام"
  }
};

export function getNotificationTypeMeta(type) {
  return NOTIFICATION_TYPE_META[type] || NOTIFICATION_TYPE_META.general;
}
