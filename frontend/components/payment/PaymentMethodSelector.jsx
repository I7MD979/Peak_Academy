"use client";

const PAYMENT_METHODS = [
  {
    id: "paymob",
    name: "بطاقة بنكية",
    description: "Visa / Mastercard / Meeza",
    icon: "💳"
  },
  {
    id: "vodafone_cash",
    name: "فودافون كاش",
    description: "ادفع من محفظتك بضغطة واحدة",
    icon: "📱",
    badge: "الأسرع"
  },
  {
    id: "fawry",
    name: "فوري",
    description: "ادفع في أي منفذ فوري",
    icon: "🏪"
  },
  {
    id: "instapay",
    name: "إنستاباي",
    description: "تحويل مباشر من تطبيق بنكك",
    icon: "⚡"
  }
];

export default function PaymentMethodSelector({ selected, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" dir="rtl">
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange?.(method.id)}
          className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
            selected === method.id
              ? "border-orange-500 bg-orange-50 shadow-md"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {method.badge ? (
            <span className="absolute -top-2 right-2 rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
              {method.badge}
            </span>
          ) : null}
          <span className="text-2xl">{method.icon}</span>
          <span className="text-sm font-semibold text-gray-900">{method.name}</span>
          <span className="text-xs text-gray-500">{method.description}</span>
        </button>
      ))}
    </div>
  );
}
