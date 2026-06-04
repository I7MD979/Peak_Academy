# Peak Academy — System Design & Performance Specification
> Dark Whale Tech | peak-academy.net | Built for scale from day one

---

## 🏗 Architecture Overview

```
Clients (Student / Teacher / Parent / Admin)
        ↓
Vercel (Next.js 14 — SSR + Edge Cache)
        ↓
API Gateway (Railway — Rate Limit · Auth · CORS)
        ↓
┌──────────────────────────────────────────┐
│              Services Layer              │
│  Auth · Sessions · Payment · Notif       │
│  Reports · Video · Job Queue · Cache     │
└──────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────┐
│               Data Layer                 │
│  Supabase PostgreSQL · Redis · Storage   │
└──────────────────────────────────────────┘
        ↓
External: Daily.co · Paymob · Resend · Sentry
```

---

## 🗄 Database Schema (Supabase PostgreSQL)

### Core Tables

```sql
-- Users (all roles in one table, role field differentiates)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','parent','admin')),
  avatar_url TEXT,
  google_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher extended profile
CREATE TABLE teacher_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  total_sessions INT DEFAULT 0,
  subjects TEXT[], -- fast lookup
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects catalog
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('1', '2', '3')), -- ثانوي
  is_active BOOLEAN DEFAULT true
);

-- Sessions (الحصص)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  max_students INT NOT NULL DEFAULT 8,
  current_students INT DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  daily_room_url TEXT,     -- pre-created, NOT on-demand
  daily_room_name TEXT,
  status TEXT DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled','live','completed','cancelled')),
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enrollments (اشتراكات الطلاب في الحصص)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending','confirmed','attended','absent','refunded')),
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, session_id)
);

-- Payments (كل المدفوعات)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2), -- 30% للمنصة
  teacher_earning DECIMAL(10,2), -- 70% للمدرس
  paymob_order_id TEXT,
  paymob_transaction_id TEXT,
  payment_method TEXT, -- card / wallet
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parent-Child links
CREATE TABLE parent_children (
  parent_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

-- Performance Reports (تقارير الأداء)
CREATE TABLE performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  attendance_pct INT DEFAULT 0,     -- % وقت الحضور
  score DECIMAL(5,2),               -- درجة إن وجدت
  engagement_score INT,             -- 1-5
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, session_id)
);

-- Reviews (تقييمات المدرسين)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, session_id)
);

-- Teacher Withdrawals (طلبات سحب الأرباح)
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  admin_note TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## ⚡ Performance — الأولويات السبع (NON-NEGOTIABLE)

### 1. Database Indexes (migration file)

```sql
-- sessions: أكتر جدول بيتقرأ
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_subject_id_start ON sessions(subject_id, start_time DESC);
CREATE INDEX idx_sessions_status_start ON sessions(status, start_time DESC);
CREATE INDEX idx_sessions_start_time ON sessions(start_time DESC);

-- enrollments: بتتقرأ كتير
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_session_id ON enrollments(session_id);
CREATE INDEX idx_enrollments_student_payment ON enrollments(student_id, payment_status);

-- payments
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_enrollment_id ON payments(enrollment_id);
CREATE INDEX idx_payments_status ON payments(status, created_at DESC);

-- performance_reports
CREATE INDEX idx_perf_student_id ON performance_reports(student_id);
CREATE INDEX idx_perf_teacher_id ON performance_reports(teacher_id);

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- reviews
CREATE INDEX idx_reviews_teacher_id ON reviews(teacher_id);
```

### 2. No N+1 Queries — Supabase Joins

```javascript
// ❌ ممنوع
const sessions = await supabase.from('sessions').select('*');
for (const s of sessions.data) {
  const teacher = await supabase.from('users').select('*').eq('id', s.teacher_id);
}

// ✅ صح — single query
const { data: sessions } = await supabase
  .from('sessions')
  .select(`
    *,
    teacher:teacher_id(id, full_name, avatar_url),
    subject:subject_id(name, grade),
    enrollments(count)
  `)
  .eq('status', 'scheduled')
  .gte('start_time', new Date().toISOString())
  .order('start_time', { ascending: true })
  .range(from, to);
```

### 3. Redis Cache (Upstash — مجاني)

```javascript
// lib/cache.js
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL + TOKEN

export async function withCache(key, ttl, fetchFn) {
  const cached = await redis.get(key);
  if (cached) return cached;
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Cache Keys Strategy
const CACHE = {
  sessionsList: (page) => `sessions:list:${page}`,       // TTL: 60s
  sessionDetail: (id) => `session:${id}`,                // TTL: 300s
  subjectsList: () => 'subjects:all',                    // TTL: 3600s
  teacherProfile: (id) => `teacher:${id}:profile`,      // TTL: 300s
  studentDashboard: (id) => `student:${id}:dashboard`,  // TTL: 120s
  parentReport: (id, month) => `parent:${id}:${month}`, // TTL: 600s
};

// Invalidation on write
export async function invalidate(...keys) {
  if (keys.length) await redis.del(...keys);
}
```

### 4. Async Queue — BullMQ (لا تبلّد الـ API)

```javascript
// queues/index.js
import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

export const emailQueue = new Queue('email', { connection: redis });
export const reportQueue = new Queue('reports', { connection: redis });
export const notifQueue = new Queue('notifications', { connection: redis });

// في الـ controller — بعد enrollment
await emailQueue.add('enrollment-confirm', {
  studentEmail: user.email,
  sessionTitle: session.title,
  startTime: session.start_time,
});
// API بيرجع في <50ms — الـ email بيتبعت في الـ background

// Worker
new Worker('email', async (job) => {
  if (job.name === 'enrollment-confirm') {
    await resend.emails.send({ ... });
  }
}, { connection: redis });
```

### 5. Pagination — على كل list endpoint

```javascript
// utils/paginate.js
export function paginate(query, page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return query.range(from, to);
}

// Response format موحد
{
  data: [...],
  meta: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

### 6. Connection Pooling

```javascript
// lib/supabase.js — singleton
import { createClient } from '@supabase/supabase-js';

let instance = null;
export function getSupabase() {
  if (!instance) {
    instance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { db: { schema: 'public' }, global: { fetch } }
    );
  }
  return instance;
}

// server.js
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// middleware/timeout.js
app.use((req, res, next) => {
  req.setTimeout(30000);
  next();
});
```

### 7. Monitoring — Sentry

```javascript
// sentry.js
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 🔴 Critical Fix: Daily.co Pre-create Rooms

```javascript
// ❌ ممنوع — creates room at join time (3-4s delay)
app.post('/sessions/:id/join', async (req, res) => {
  const room = await dailyco.createRoom(); // SLOW
});

// ✅ صح — create room when session is CREATED
app.post('/sessions', async (req, res) => {
  // 1. Create Daily.co room first
  const room = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
    body: JSON.stringify({
      name: `session-${Date.now()}`,
      privacy: 'private',
      properties: {
        exp: Math.floor(Date.now()/1000) + (7 * 24 * 3600), // 7 days
        max_participants: req.body.max_students + 1,
        enable_recording: false,
      }
    })
  }).then(r => r.json());

  // 2. Save session with room URL
  const session = await supabase.from('sessions').insert({
    ...req.body,
    daily_room_url: room.url,
    daily_room_name: room.name,
  });
});

// Join: بيرجع الـ URL المحفوظ فوراً
app.post('/sessions/:id/join', async (req, res) => {
  const { data: session } = await supabase
    .from('sessions')
    .select('daily_room_url')
    .eq('id', req.params.id)
    .single();

  const token = await createDailyToken(session.daily_room_name, req.user);
  res.json({ url: session.daily_room_url, token }); // <100ms
});
```

---

## 🔒 Security Rules

```
1. JWT middleware على كل endpoint محمي
2. Student لا يشوف data طالب تاني — IDOR protection
3. Parent يشوف بيانات ابنه بس (parent_children join)
4. Teacher لا يعدل session مش بتاعته
5. Paymob webhook — HMAC verification دايماً
6. Withdrawal يتأكد manually من Admin
7. RLS على Supabase — double protection
```

---

## 📡 API Endpoints Structure

```
Auth
  POST /auth/register
  POST /auth/login
  POST /auth/google
  POST /auth/refresh
  POST /auth/logout

Sessions
  GET  /sessions              → list (paginated, cached 60s)
  GET  /sessions/:id          → detail (cached 300s)
  POST /sessions              → create (teacher only) + Daily.co room
  PUT  /sessions/:id          → update (teacher only, invalidate cache)
  DEL  /sessions/:id          → cancel

Enrollments
  POST /sessions/:id/enroll   → create enrollment + Paymob order
  GET  /students/me/sessions  → my sessions (paginated)

Payments
  POST /payments/webhook      → Paymob HMAC verified
  GET  /payments/history      → paginated

Teachers
  GET  /teachers              → list (cached 300s)
  GET  /teachers/:id          → profile + sessions
  GET  /teachers/me/earnings  → dashboard
  POST /withdrawals           → request withdrawal

Parents
  GET  /parents/me/children/:id/report  → performance report (cached 600s)
  GET  /parents/me/children/:id/sessions

Admin
  GET  /admin/dashboard       → stats (cached 120s)
  PUT  /admin/withdrawals/:id → approve/reject
  GET  /admin/users           → paginated
```

---

## 🚀 Deployment Stack

```
Frontend:  Vercel (Next.js 14)
Backend:   Railway Hobby ($5/month)
Database:  Supabase Free → Pro بعد 500 users
Cache:     Upstash Redis (Free: 10k req/day)
Queue:     Upstash Redis (نفس الـ instance)
Storage:   Supabase Storage (free)
Video:     Daily.co (free: 10k min/month)
Payments:  Paymob (2.75% + 3 EGP)
Email:     Resend (free: 3k/month)
Monitoring: Sentry (free tier)

Total cost at launch: ~$5/month
```

---

## 📊 Performance Targets

```
API Response Time:
  List endpoints:    < 200ms  (cached)
  Detail endpoints:  < 150ms  (cached)
  Write endpoints:   < 300ms
  Session join:      < 100ms  (pre-created room)

Database:
  No sequential scans on hot queries
  All FK columns indexed
  Composite indexes on common filters

Queue:
  Email delivery:   < 30s after enrollment
  PDF generation:   < 60s after session end
```

---

## 🛠 Cursor Implementation Order

```
Phase 1 — Foundation (لازم يكون صح من أول سطر)
  1. lib/supabase.js    — singleton client
  2. lib/cache.js       — Redis withCache util
  3. utils/paginate.js  — pagination util
  4. middleware/auth.js — JWT verify
  5. migrations/001_schema.sql   — جميع الجداول
  6. migrations/002_indexes.sql  — جميع الـ indexes

Phase 2 — Core Features
  7. routes/auth.js     — register/login/google
  8. routes/sessions.js — CRUD + Daily.co pre-create
  9. routes/enrollments.js + payments webhook
  10. routes/teachers.js
  11. routes/parents.js
  12. routes/admin.js

Phase 3 — Async
  13. queues/email.worker.js
  14. queues/report.worker.js
  15. queues/notification.worker.js

Phase 4 — Frontend (Next.js)
  16. app/(auth)/ — login/register pages
  17. app/student/ — dashboard + sessions
  18. app/teacher/ — dashboard + sessions management
  19. app/parent/  — reports
  20. app/admin/   — management
```

---

*Peak Academy — Built by Dark Whale Tech*
*System Design v1.0 — Performance-First Architecture*
