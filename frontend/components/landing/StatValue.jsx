/** عرض الأرقام والرموز اللاتينية باتجاه ثابت داخل واجهة عربية */
export default function StatValue({ children, className = "" }) {
  return (
    <span dir="ltr" lang="en" className={`inline-block tabular-nums ${className}`}>
      {children}
    </span>
  );
}
