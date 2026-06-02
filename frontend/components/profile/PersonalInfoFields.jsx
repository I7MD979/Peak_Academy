import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function PersonalInfoFields({
  form,
  fieldErrors,
  email,
  onChange,
  disabled = false
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="full_name">الاسم الكامل</Label>
        <Input
          id="full_name"
          value={form.full_name}
          onChange={onChange("full_name")}
          placeholder="مثال: أحمد محمد"
          disabled={disabled}
          className={cn(fieldErrors.full_name && "border-destructive")}
        />
        {fieldErrors.full_name ? (
          <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">رقم الهاتف</Label>
        <Input
          id="phone"
          type="tel"
          dir="ltr"
          value={form.phone}
          onChange={onChange("phone")}
          placeholder="01xxxxxxxxx"
          disabled={disabled}
          className={cn(fieldErrors.phone && "border-destructive")}
        />
        {fieldErrors.phone ? <p className="text-xs text-destructive">{fieldErrors.phone}</p> : null}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" value={email || ""} disabled className="bg-muted/40 opacity-90" dir="ltr" />
        <p className="text-xs text-text-muted">لا يمكن تغيير البريد من هنا.</p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="avatar_url">رابط الصورة الشخصية (اختياري)</Label>
        <Input
          id="avatar_url"
          dir="ltr"
          value={form.avatar_url}
          onChange={onChange("avatar_url")}
          placeholder="https://..."
          disabled={disabled}
          className={cn(fieldErrors.avatar_url && "border-destructive")}
        />
        {fieldErrors.avatar_url ? (
          <p className="text-xs text-destructive">{fieldErrors.avatar_url}</p>
        ) : (
          <p className="text-xs text-text-muted">رابط مباشر لصورة واضحة (يفضّل مربعة).</p>
        )}
      </div>
    </div>
  );
}
