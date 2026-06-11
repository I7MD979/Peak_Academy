admin@peak.com / Admin123!
teacher@peak.com / Teacher123!
student@peak.com / Student123!
parent@peak.com / Parent123!

## بيانات تجريبية

**أولاً** أضف مفاتيح Supabase في `backend/.env` (مرة واحدة):

```bash
cd backend
npm run setup:env
```

انسخ **service_role** من: [Supabase API settings](https://supabase.com/dashboard/project/hpczrdvaeazrrrzgtatl/settings/api)

ثم شغّل البيانات التجريبية:

```bash
npm run seed:demo
```

التفاصيل: [DemoData.md](./DemoData.md)