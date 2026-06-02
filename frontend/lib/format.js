export function formatCurrencyEgp(amount) {
  const value = Number(amount || 0);
  return `${value.toLocaleString("ar-EG")} جنيه`;
}

export function formatDateTimeAr(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDateAr(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

const withdrawalMethodLabels = {
  vodafone_cash: "فودافون كاش",
  vodafone: "فودافون كاش",
  instapay: "إنستاباي",
  bank: "تحويل بنكي",
  bank_transfer: "تحويل بنكي"
};

export function formatWithdrawalMethod(method) {
  if (!method) return "—";
  const key = String(method).toLowerCase().replace(/\s+/g, "_");
  return withdrawalMethodLabels[key] || method;
}
