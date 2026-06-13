"use client";

import Icon from "@/components/shared/Icon";

const PAYMENT_METHODS = [
  {
    id: "paymob",
    name: "بطاقة بنكية",
    description: "Visa / Mastercard / Meeza",
    iconName: "creditCard"
  },
  {
    id: "vodafone_cash",
    name: "فودافون كاش",
    description: "ادفع من محفظتك بضغطة واحدة",
    iconName: "smartphone",
    badge: "الأسرع"
  },
  {
    id: "instapay",
    name: "إنستاباي",
    description: "تحويل مباشر من تطبيق بنكك",
    iconName: "zap"
  }
];

export default function PaymentMethodSelector({ selected, onChange, availability = null }) {
  const methods = PAYMENT_METHODS.filter((method) => {
    if (!availability) return true;
    return availability[method.id] === true;
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" dir="rtl">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange?.(method.id)}
          className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
            selected === method.id
              ? "border-peak-orange bg-peak-orange/10 shadow-md"
              : "border-auth-outline-variant/50 hover:border-peak-orange/40 hover:bg-auth-surface-highest"
          }`}
        >
          {method.badge ? (
            <span className="absolute -top-2 right-2 rounded-full bg-success px-2 py-0.5 text-xs text-white">
              {method.badge}
            </span>
          ) : null}
          <Icon name={method.iconName} variant="xl" className="text-auth-on-surface-variant" />
          <span className="text-sm font-semibold text-auth-on-surface">{method.name}</span>
          <span className="text-xs text-auth-on-surface-variant">{method.description}</span>
        </button>
      ))}
    </div>
  );
}
