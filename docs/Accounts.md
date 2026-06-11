# حساب الإدارة — Peak Academy

| البريد | كلمة المرور | الدور |
|--------|-------------|--------|
| ahmedmohamed123905@gmail.com | Ah@0144473536 | مشرف (admin) |

## إعداد الحساب (مرة واحدة)

```bash
cd backend
npm run setup:env
```

انسخ **service_role** من [Supabase API settings](https://supabase.com/dashboard/project/hpczrdvaeazrrrzgtatl/settings/api)

ثم:

```bash
npm run setup:admin
```

هذا الأمر يحذف بيانات الـ demo والحسابات التجريبية (`*@peak.com`) ويضبط حساب المشرف أعلاه.
