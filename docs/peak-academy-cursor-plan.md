# Peak Academy — Master Project Plan
> منصة تعليمية تفاعلية لطلاب الثانوية العامة في مصر

---

## 🎯 Project Overview

**الاسم:** Peak Academy  
**الدومين:** peak-academy.net  
**الهدف:** منصة Live تجمع طلاب الثانوية العامة مع مدرسين متميزين في مجموعات صغيرة (5-10 طلاب) مع تقارير أداء للأهل.  
**السوق المستهدف:** طلاب تالتة ثانوي في مصر (3 مليون طالب سنوياً)  
**نموذج الربح:** Subscription شهري (299-499 جنيه) + Pay per Session (60-80 جنيه)

---

## 🏗️ Tech Stack

### Frontend
```
Framework:     Next.js 14 (App Router)
Styling:       Tailwind CSS + shadcn/ui
Language:      TypeScript
State:         Zustand
Forms:         React Hook Form + Zod
```

### Backend
```
Runtime:       Node.js 20
Framework:     Express.js
Language:      TypeScript
Auth:          Supabase Auth (JWT)
Validation:    Zod
```

### Database
```
Provider:      Supabase (PostgreSQL)
ORM:           Supabase JS Client
Realtime:      Supabase Realtime (chat + notifications)
Storage:       Supabase Storage (recordings + avatars)
```

### Video & Collaboration
```
Video:         Daily.co (WebRTC)
Whiteboard:    Excalidraw (embedded)
Free Tier:     10,000 دقيقة/شهر مجاناً
After:         $0.004/دقيقة
```

### Payments
```
Provider:      Paymob
Methods:       Visa, Mastercard, Vodafone Cash, 
               Orange Cash, Etisalat Cash, Fawry
Commission:    2.75% + 3 EGP per transaction
```

### Hosting & Infrastructure
```
Frontend:      Vercel (Free)
Backend:       Railway ($5/شهر)
Database:      Supabase (Free tier → Pro $25/شهر)
Email:         Resend ($0 → $20/شهر)
```

---

## 👥 User Roles

```
1. student      - الطالب
2. teacher      - المدرس
3. parent       - ولي الأمر
4. admin        - الأدمن (إنت)
```

---

## 🗄️ Database Schema

### users
```sql
id              UUID PRIMARY KEY
email           TEXT UNIQUE
phone           TEXT
full_name       TEXT
avatar_url      TEXT
role            ENUM(student, teacher, parent, admin)
is_active       BOOLEAN DEFAULT true
is_verified     BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### student_profiles
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
grade           ENUM(first, second, third) -- أولى/تانية/تالتة
section         ENUM(science_math, science_bio, arts, other)
parent_id       UUID REFERENCES users(id)
coins           INTEGER DEFAULT 0
streak_days     INTEGER DEFAULT 0
last_active     TIMESTAMPTZ
```

### teacher_profiles
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
bio             TEXT
subjects        TEXT[] -- ['math', 'physics', 'chemistry']
price_per_session DECIMAL(10,2)
rating          DECIMAL(3,2) DEFAULT 0
total_sessions  INTEGER DEFAULT 0
commission_rate DECIMAL(5,2) DEFAULT 70.00 -- 70% للمدرس
is_featured     BOOLEAN DEFAULT false
id_verified     BOOLEAN DEFAULT false
```

### subjects
```sql
id              UUID PRIMARY KEY
name_ar         TEXT -- الرياضيات
name_en         TEXT -- math
icon            TEXT -- 📐
grade_levels    TEXT[]
is_active       BOOLEAN DEFAULT true
```

### sessions
```sql
id              UUID PRIMARY KEY
teacher_id      UUID REFERENCES teacher_profiles(id)
subject_id      UUID REFERENCES subjects(id)
title           TEXT
description     TEXT
grade           TEXT
scheduled_at    TIMESTAMPTZ
duration_min    INTEGER DEFAULT 60
max_students    INTEGER DEFAULT 10
price_per_student DECIMAL(10,2)
status          ENUM(scheduled, live, completed, cancelled)
daily_room_url  TEXT -- Daily.co room URL
recording_url   TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### session_enrollments
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
student_id      UUID REFERENCES student_profiles(id)
payment_id      UUID REFERENCES transactions(id)
status          ENUM(enrolled, attended, absent, refunded)
joined_at       TIMESTAMPTZ
left_at         TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### transactions
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
type            ENUM(session_payment, subscription, withdrawal, refund)
amount          DECIMAL(10,2)
coins_amount    INTEGER
paymob_order_id TEXT
paymob_txn_id   TEXT
status          ENUM(pending, completed, failed, refunded)
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### subscriptions
```sql
id              UUID PRIMARY KEY
student_id      UUID REFERENCES student_profiles(id)
plan            ENUM(silver, gold)
price           DECIMAL(10,2)
sessions_limit  INTEGER -- NULL = unlimited
sessions_used   INTEGER DEFAULT 0
starts_at       TIMESTAMPTZ
ends_at         TIMESTAMPTZ
is_active       BOOLEAN DEFAULT true
```

### teacher_earnings
```sql
id              UUID PRIMARY KEY
teacher_id      UUID REFERENCES teacher_profiles(id)
session_id      UUID REFERENCES sessions(id)
gross_amount    DECIMAL(10,2) -- إجمالي ما دفعه الطلاب
teacher_amount  DECIMAL(10,2) -- 70% للمدرس
platform_amount DECIMAL(10,2) -- 30% للمنصة
status          ENUM(pending, paid)
paid_at         TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### withdrawal_requests
```sql
id              UUID PRIMARY KEY
teacher_id      UUID REFERENCES teacher_profiles(id)
amount          DECIMAL(10,2)
method          TEXT -- vodafone_cash / instapay / bank
account_number  TEXT
status          ENUM(pending, approved, rejected, paid)
requested_at    TIMESTAMPTZ DEFAULT NOW()
processed_at    TIMESTAMPTZ
```

### study_rooms
```sql
id              UUID PRIMARY KEY
name            TEXT
subject_id      UUID REFERENCES subjects(id)
grade           TEXT
max_students    INTEGER DEFAULT 6
is_active       BOOLEAN DEFAULT true
daily_room_url  TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### study_room_members
```sql
id              UUID PRIMARY KEY
room_id         UUID REFERENCES study_rooms(id)
student_id      UUID REFERENCES student_profiles(id)
joined_at       TIMESTAMPTZ DEFAULT NOW()
left_at         TIMESTAMPTZ
```

### messages
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
sender_id       UUID REFERENCES users(id)
content         TEXT
type            ENUM(text, question, answer)
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### quiz_questions
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
question        TEXT
options         JSONB -- [{text: '...', is_correct: true}]
created_by      UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### quiz_answers
```sql
id              UUID PRIMARY KEY
question_id     UUID REFERENCES quiz_questions(id)
student_id      UUID REFERENCES student_profiles(id)
selected_option INTEGER
is_correct      BOOLEAN
answered_at     TIMESTAMPTZ DEFAULT NOW()
```

### notifications
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
title           TEXT
body            TEXT
type            TEXT
is_read         BOOLEAN DEFAULT false
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### reviews
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
student_id      UUID REFERENCES student_profiles(id)
teacher_id      UUID REFERENCES teacher_profiles(id)
rating          INTEGER -- 1-5
comment         TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## 📱 Features — Student

### 1. Authentication
- [ ] Register (اسم + إيميل + تليفون + كلمة سر)
- [ ] Login
- [ ] Forgot Password
- [ ] Google OAuth (اختياري)

### 2. Home Dashboard
- [ ] ترحيب باسم الطالب
- [ ] إحصائيات (جلسات الشهر + متوسط الدرجات + Streak)
- [ ] المواد الدراسية (4 مواد رئيسية)
- [ ] الجلسات القادمة
- [ ] الجلسات Live دلوقتي

### 3. Sessions
- [ ] عرض كل الجلسات المتاحة
- [ ] فلترة بالمادة / الصف / السعر / المدرس
- [ ] تفاصيل الجلسة (المدرس + عدد الطلاب + السعر)
- [ ] حجز جلسة والدفع
- [ ] إلغاء حجز (قبل 2 ساعة)
- [ ] تاريخ جلساتي

### 4. Live Session
- [ ] Video Room (Daily.co)
- [ ] Whiteboard مشترك (Excalidraw)
- [ ] Chat نصي
- [ ] زر "اسأل سؤال"
- [ ] Quiz تفاعلي من المدرس
- [ ] Timer للجلسة
- [ ] تسجيل الجلسة (يتوفر بعد الانتهاء)

### 5. Study Rooms
- [ ] غرف مذاكرة جماعية بدون مدرس
- [ ] Video مفتوح = Accountability
- [ ] Chat + Whiteboard
- [ ] Random Match مع طلاب في نفس المادة

### 6. Ask a Question
- [ ] الطالب يكتب سؤاله
- [ ] يختار المادة
- [ ] مدرس متاح يرد في أقل من 10 دقايق
- [ ] الرد نص أو Voice Note أو فيديو قصير
- [ ] السعر: 15-20 جنيه/سؤال

### 7. Profile & Progress
- [ ] إحصائيات الأداء
- [ ] تقدم في كل مادة
- [ ] الشهادات والإنجازات
- [ ] Streak Calendar
- [ ] إدارة الاشتراك

### 8. Payments
- [ ] شحن رصيد (Coins)
- [ ] اشتراك شهري (Silver/Gold)
- [ ] تاريخ المدفوعات
- [ ] Paymob Integration

---

## 👨‍🏫 Features — Teacher

### 1. Dashboard
- [ ] إجمالي الأرباح الشهر
- [ ] عدد الطلاب
- [ ] الجلسات القادمة
- [ ] التقييمات

### 2. Sessions Management
- [ ] إنشاء جلسة جديدة
- [ ] تحديد المادة + الصف + العنوان + السعر + الموعد
- [ ] تعديل / إلغاء جلسة
- [ ] عرض الطلاب المسجلين

### 3. Live Session (Teacher View)
- [ ] Host Controls (كتم/تفعيل ميك الطلاب)
- [ ] Whiteboard إنشاء وتعديل
- [ ] إرسال Quiz للطلاب
- [ ] إدارة الأسئلة
- [ ] تسجيل الجلسة

### 4. Earnings
- [ ] رصيد المحفظة
- [ ] تفاصيل كل جلسة
- [ ] طلب سحب
- [ ] تاريخ السحوبات

### 5. Profile
- [ ] بيانات المدرس
- [ ] تحميل الـ ID للـ Verification
- [ ] إدارة المواد والجداول

---

## 👨‍👩‍👧 Features — Parent

### 1. Dashboard
- [ ] ربط حساب الأبن/البنت
- [ ] إحصائيات الأداء الشهري
- [ ] آخر تنبيهات

### 2. Performance Reports
- [ ] تقدم في كل مادة (Progress Bar)
- [ ] عدد الجلسات المحضورة
- [ ] درجات الـ Quizzes
- [ ] مقارنة بالشهر الماضي
- [ ] تنبيه لو في ضعف في مادة

### 3. Notifications
- [ ] إشعار لما الطالب يحجز جلسة
- [ ] إشعار لما يحضر/يغيب
- [ ] تقرير أسبوعي أوتوماتيك على الإيميل

### 4. Download Reports
- [ ] PDF تقرير شهري كامل

---

## 🛠️ Features — Admin

### 1. Dashboard
- [ ] إجمالي الإيرادات
- [ ] عدد المستخدمين النشطين
- [ ] الجلسات اليوم
- [ ] طلبات السحب المعلقة

### 2. Users Management
- [ ] عرض كل المستخدمين
- [ ] Verify المدرسين (رفع ID)
- [ ] تعليق / حذف حساب
- [ ] فلترة بالـ Role

### 3. Sessions Management
- [ ] عرض كل الجلسات
- [ ] إلغاء جلسة
- [ ] مراقبة الجلسات Live

### 4. Withdrawals
- [ ] عرض طلبات السحب
- [ ] Approve / Reject
- [ ] تسجيل الدفع
- [ ] تاريخ كل السحوبات

### 5. Financial Reports
- [ ] إجمالي الإيرادات
- [ ] نصيب المنصة vs المدرسين
- [ ] أكتر المدرسين كسباً
- [ ] أكتر المواد طلباً

---

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Sessions
```
GET    /api/sessions              (list + filters)
GET    /api/sessions/:id          (details)
POST   /api/sessions              (teacher: create)
PUT    /api/sessions/:id          (teacher: update)
DELETE /api/sessions/:id          (teacher: cancel)
POST   /api/sessions/:id/enroll   (student: enroll + pay)
POST   /api/sessions/:id/start    (teacher: go live)
POST   /api/sessions/:id/end      (teacher: end session)
GET    /api/sessions/:id/room     (get Daily.co room URL)
```

### Payments
```
POST   /api/payment/initiate      (create Paymob order)
POST   /api/payment/webhook       (Paymob callback)
GET    /api/payment/history       (user transactions)
```

### Teacher Earnings
```
GET    /api/earnings              (teacher earnings)
POST   /api/withdrawals           (request withdrawal)
GET    /api/withdrawals           (list requests)
PUT    /api/withdrawals/:id       (admin: update status)
```

### Parent
```
POST   /api/parent/link-student   (ربط الطالب)
GET    /api/parent/report/:studentId
GET    /api/parent/report/:studentId/pdf
```

### Questions (Ask a Teacher)
```
POST   /api/questions             (student: ask)
GET    /api/questions             (teacher: list unanswered)
POST   /api/questions/:id/answer  (teacher: answer)
```

### Admin
```
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/verify
GET    /api/admin/withdrawals
PUT    /api/admin/withdrawals/:id
```

---

## 💰 Pricing Plans

### للطالب
```
Pay per Session:
  جلسة واحدة: 60-80 جنيه

Silver Plan (299 جنيه/شهر):
  10 جلسات/شهر
  Study Rooms غير محدودة
  أولوية في الحجز

Gold Plan (499 جنيه/شهر):
  جلسات غير محدودة
  Study Rooms
  Ask a Question (5 أسئلة/شهر)
  تسجيلات الجلسات
  أولوية قصوى
```

### للمدرس
```
Commission Structure:
  المدرس الجديد:   70% له / 30% للمنصة
  بعد 50 جلسة:    75% له / 25% للمنصة
  بعد 200 جلسة:   80% له / 20% للمنصة
```

---

## 📁 Project Structure

```
peak-academy/
├── frontend/                    # Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (student)/
│   │   │   ├── dashboard/
│   │   │   ├── sessions/
│   │   │   ├── sessions/[id]/
│   │   │   ├── live/[sessionId]/
│   │   │   ├── study-rooms/
│   │   │   └── profile/
│   │   ├── (teacher)/
│   │   │   ├── teacher/dashboard/
│   │   │   ├── teacher/sessions/
│   │   │   └── teacher/earnings/
│   │   ├── (parent)/
│   │   │   └── parent/dashboard/
│   │   └── (admin)/
│   │       └── admin/
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── session/             # Session components
│   │   ├── video/               # Daily.co components
│   │   └── shared/
│   └── lib/
│       ├── supabase.ts
│       ├── daily.ts
│       └── paymob.ts
│
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── sessions.ts
│   │   │   ├── payments.ts
│   │   │   ├── earnings.ts
│   │   │   ├── parent.ts
│   │   │   └── admin.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── checkRole.ts
│   │   │   └── rateLimit.ts
│   │   ├── services/
│   │   │   ├── daily.service.ts
│   │   │   ├── paymob.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── report.service.ts
│   │   └── utils/
│   │       ├── paginate.ts
│   │       └── response.ts
│   └── supabase/
│       └── migrations/
│
└── README.md
```

---

## ⚡ Performance System (Non-Negotiable)

> هذه القواعد إلزامية في كل ملف وكل endpoint — لا استثناء.

---

### 1. 🗂️ Database Indexes

كل migration لازم يحتوي على indexes. لا تكتب جدول من غير indexes.

```sql
-- sessions
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status_scheduled ON sessions(status, scheduled_at);

-- session_enrollments
CREATE INDEX idx_enrollments_session_id ON session_enrollments(session_id);
CREATE INDEX idx_enrollments_student_id ON session_enrollments(student_id);
CREATE INDEX idx_enrollments_status ON session_enrollments(status);

-- transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- teacher_earnings
CREATE INDEX idx_earnings_teacher_id ON teacher_earnings(teacher_id);
CREATE INDEX idx_earnings_status ON teacher_earnings(status);

-- messages
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

---

### 2. 🚫 No N+1 Queries

ممنوع تعمل query جوه loop. استخدم Supabase joins دايماً.

```typescript
// ❌ ممنوع — N+1
const sessions = await supabase.from('sessions').select('*');
for (const session of sessions.data) {
  const teacher = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('id', session.teacher_id);
}

// ✅ صح — Join واحد
const sessions = await supabase
  .from('sessions')
  .select(`
    *,
    teacher:teacher_profiles(
      id,
      user:users(full_name, avatar_url),
      rating,
      commission_rate
    ),
    subject:subjects(name_ar, icon),
    enrollments:session_enrollments(count)
  `)
  .eq('status', 'scheduled')
  .order('scheduled_at', { ascending: true });

// ✅ صح — Parallel queries لو محتاج أكتر من source
const [sessions, subjects] = await Promise.all([
  supabase.from('sessions').select('*'),
  supabase.from('subjects').select('*').eq('is_active', true)
]);
```

---

### 3. 📄 Pagination (على كل list endpoint)

```typescript
// utils/paginate.ts
export const paginate = (page: number = 1, limit: number = 20) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to, limit };
};

// استخدام في كل route
router.get('/sessions', auth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { from, to } = paginate(Number(page), Number(limit));

  const { data, count, error } = await supabase
    .from('sessions')
    .select('*, teacher:teacher_profiles(*)', { count: 'exact' })
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .range(from, to);

  res.json({
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil((count || 0) / Number(limit)),
      hasMore: to < (count || 0) - 1
    }
  });
});
```

---

### 4. 🔌 Connection Pooling

```typescript
// lib/supabase.ts — instance واحد فقط في كل التطبيق
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// ✅ Single instance
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: {
      headers: { 'x-app-name': 'peak-academy-backend' }
    }
  }
);

// server.ts
const server = app.listen(PORT);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// middleware/timeout.ts
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
```

---

### 5. 🗄️ Redis Caching (Phase 2)

```typescript
// cache/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!);

// cache keys
export const CACHE_KEYS = {
  subjects: 'subjects:all',
  featuredTeachers: 'teachers:featured',
  sessionById: (id: string) => `session:${id}`,
  teacherSessions: (id: string) => `teacher:${id}:sessions`,
};

// TTL (ثواني)
export const CACHE_TTL = {
  subjects: 3600,        // ساعة — مش بتتغير كتير
  featuredTeachers: 300, // 5 دقايق
  session: 60,           // دقيقة
};

// middleware/cache.ts
export const withCache = (key: string, ttl: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    // store original json method
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalJson(data);
    };
    next();
  };
};

// استخدام
router.get('/subjects',
  withCache(CACHE_KEYS.subjects, CACHE_TTL.subjects),
  async (req, res) => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true);
    res.json({ data });
  }
);
```

---

### 6. 📬 Async Queues (Phase 2)

المهام التقيلة تتعمل في background — مش في نفس الـ request.

```typescript
// queues/index.ts
import Bull from 'bull';

export const emailQueue = new Bull('email', process.env.REDIS_URL!);
export const reportQueue = new Bull('reports', process.env.REDIS_URL!);
export const notificationQueue = new Bull('notifications', process.env.REDIS_URL!);

// المهام اللي تتعمل في background:
// ✅ إرسال إيميل تأكيد الحجز
// ✅ إرسال تقرير أسبوعي للأهل
// ✅ إشعار Push للطالب
// ✅ توليد PDF التقرير
// ✅ حساب أرباح المدرس بعد الجلسة

// workers/email.worker.ts
emailQueue.process(async (job) => {
  const { to, subject, template, data } = job.data;
  await sendEmail({ to, subject, template, data });
});

// استخدام في route
router.post('/sessions/:id/enroll', auth, async (req, res) => {
  // ... logic الحجز

  // ✅ مش بتستنى الإيميل — بتبعته في background
  await emailQueue.add('enrollment-confirmation', {
    to: student.email,
    subject: 'تم تأكيد حجزك في Peak Academy',
    template: 'enrollment',
    data: { studentName, sessionTitle, scheduledAt }
  });

  res.json({ success: true });
});
```

---

### 7. 📊 Monitoring (Phase 2)

```typescript
// middleware/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// كل error بيتبعت تلقائياً لـ Sentry
app.use(Sentry.Handlers.errorHandler());

// custom error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(err);
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});
```

---

### ملخص الأولويات

```
Phase 1 (لازم من أول يوم):
  ✅ DB Indexes      — في كل migration
  ✅ No N+1          — Supabase joins دايماً
  ✅ Pagination      — كل list endpoint
  ✅ Connection Pool — single supabase instance

Phase 2 (بعد اللانش):
  ⏳ Redis Caching   — للـ endpoints الكتير طلب
  ⏳ Async Queues    — إيميل + تقارير + إشعارات
  ⏳ Sentry          — مراقبة الـ errors
```

---

## 🔒 Security Rules

```
1. كل endpoint محمي بـ JWT middleware
2. Student لا يشوف بيانات طالب تاني (IDOR protection)
3. Teacher لا يقدر يعدل جلسة مش بتاعته
4. Parent يشوف بيانات ابنه بس
5. Withdrawal يتحقق منه Admin يدوياً
6. Paymob webhook يتحقق بـ HMAC signature
7. File uploads: صور بس + max 5MB
```

---

## 🚀 Development Phases

### Phase 1 — MVP (6 أسابيع)
```
✅ Auth (Register/Login) — كل الـ Roles
✅ Sessions CRUD
✅ Daily.co Integration
✅ Paymob Integration
✅ Student Dashboard
✅ Teacher Dashboard
✅ Basic Admin Panel
```

### Phase 2 — Launch (أسبوعين إضافيين)
```
✅ Parent Dashboard + Reports
✅ Study Rooms
✅ Notifications
✅ PDF Reports
✅ Reviews & Ratings
```

### Phase 3 — Growth
```
✅ Ask a Question Feature
✅ Quiz System
✅ Session Recordings
✅ Mobile App (React Native)
✅ Advanced Analytics
```

---

## 🌐 Environment Variables

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Daily.co
DAILY_API_KEY=

# Paymob
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID_CARD=
PAYMOB_INTEGRATION_ID_WALLET=
PAYMOB_HMAC_SECRET=
PAYMOB_IFRAME_ID=

# App
JWT_SECRET=
FRONTEND_URL=https://peak-academy.net
BACKEND_URL=https://api.peak-academy.net

# Email (Resend)
RESEND_API_KEY=
```

---

## 📊 Success Metrics

```
الشهر 3:
  ✅ 10+ مدرسين نشطين
  ✅ 200+ طالب مسجل
  ✅ 50+ طالب بيدفع
  ✅ Day 7 Retention > 20%
  ✅ Avg Session Rating > 4.2/5

الشهر 6:
  ✅ 50+ مدرسين
  ✅ 1,000+ طالب
  ✅ 45,000+ جنيه/شهر إيراد
```

---

*Peak Academy — Built by Dark Whale Tech*
