# Peak Academy — Backend ↔ Frontend Audit

**تاريخ التدقيق:** 2026-06-02

## ملخص تنفيذي

| الحالة | العدد |
|--------|-------|
| مسارات Backend مفعّلة في `app.js` | 10 |
| ملفات routes غير مربوطة | 5 |
| صفحات Frontend مربوطة بـ API | معظم اللوحات |
| فجوات حرجة تم إصلاحها في هذه الجولة | انظر أسفل |

---

## Backend — المسارات المفعّلة (`/api`)

| Prefix | الملف | الحالة |
|--------|-------|--------|
| `/auth` | `auth.js` | ✅ login/me/profile/complete-profile |
| `/sessions` | `sessions.js` | ✅ CRUD + enroll + live room |
| `/payments` | `payments.js` | ✅ initiate + webhook + history |
| `/earnings` | `earnings.js` | ✅ teacher earnings |
| `/questions` | `questions.js` | ✅ student Q&A |
| `/parent` | `parent.js` | ✅ children, link, report, pdf, **dashboard** |
| `/admin` | `admin.js` | ✅ |
| `/notifications` | `notifications.js` | ✅ GET list (غير مستخدم في UI بعد) |
| `/student` | `student.js` | ✅ dashboard, profile, sessions |
| `/study-rooms` | `studyRooms.js` | ✅ |

## Backend — غير مربوطة (موجودة لكن غير مستدعاة)

| الملف | السبب | توصية |
|-------|--------|--------|
| `marketplace.js` | CJS + `ok`/`fail` قديم | تحويل ESM وربط عند تفعيل السوق |
| `studyReports.js` | CJS + مكرر مع `parent/report/pdf` | دمج أو إهمال |
| `reviews.js` | CJS | ربط عند صفحة تقييمات |
| `quizzes.js` | CJS | ربط مع Live Quiz |
| `recordings.js` | CJS | ربط مع التسجيلات |

---

## Frontend API ↔ Backend

| Client (`lib/api.js`) | Endpoint | الحالة |
|----------------------|----------|--------|
| `authApi` | `/auth/*` | ✅ |
| `sessionsApi` | `/sessions/*` | ✅ |
| `paymentsApi` | `/payments/*` | ✅ |
| `studentApi` | `/student/*` | ✅ |
| `questionsApi` | `/questions/*` | ✅ |
| `studyRoomsApi` | `/study-rooms/*` | ✅ |
| `parentApi` | `/parent/*` | ✅ (+ dashboard) |
| `dashboardApi` | `/admin/*`, `/earnings/*`, `/auth/me` | ✅ |

---

## إصلاحات تم تطبيقها

1. **رسائل Auth عربية** — `middleware/auth.js`, `checkRole.js`
2. **لوحة ولي الأمر** — `GET /parent/dashboard` + صفحة حقيقية
3. **فلاتر جلسات الطالب** — مادة + حد أقصى للسعر في API والواجهة
4. **تفاصيل جلسة المدرس** — `/teacher/sessions/[id]` + `GET /sessions/:id/enrollments`
5. **إعادة توجيه** — `/student/my-sessions` → `/student/sessions?tab=mine`
6. **أخطاء sessions** — رسائل عربية للمسارات الرئيسية

---

## صفحات Frontend vs المخطط

| المخطط | المسار الفعلي | API |
|--------|---------------|-----|
| `/student/dashboard` | ✅ | `studentApi.dashboard` |
| `/student/sessions` | ✅ | `studentApi.sessions` |
| `/student/my-sessions` | redirect → `?tab=mine` | نفس API |
| `/student/sessions/[id]` | ✅ | `studentApi.session` |
| `/student/live/[id]` | ✅ جزئي | `sessionsApi.getRoom` |
| `/student/study-rooms` | ✅ | `studyRoomsApi` |
| `/student/ask` | ✅ | `questionsApi` |
| `/student/profile` | ✅ | `studentApi.profile` |
| `/parent/dashboard` | ✅ بعد الإصلاح | `parentApi.dashboard` |
| `/parent/report` | ✅ | `parentApi.report` |
| `/teacher/sessions/[id]` | ✅ بعد الإصلاح | `sessionsApi.get` |

---

## متبقي (خارطة طريق)

- [ ] Live: Chat / Whiteboard / Quiz كاملة
- [ ] PDF حقيقي لتقرير ولي الأمر (حالياً `.txt`)
- [ ] اشتراك / رصيد في ملف الطالب
- [ ] رفع ID للمدرس
- [ ] ربط `reviews`, `quizzes`, `notifications` في UI
