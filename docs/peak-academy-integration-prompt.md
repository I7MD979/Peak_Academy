# Peak Academy — Full Integration & Service Connection Prompt
# Connect Backend + Frontend to: Redis, Resend, Sentry, Daily.co, Paymob
# Dark Whale Tech | peak-academy.net

---

## CONTEXT

Stack:
- Frontend: Next.js 14 App Router (Vercel)
- Backend: Node.js + Express (Railway, port 4000)
- Database: Supabase PostgreSQL + Auth
- All environment variables are already set in Railway and Vercel

This prompt connects all external services to the existing codebase.
Do NOT rewrite existing logic — only ADD the integrations.

---

## PART 1 — REDIS (Upstash) INTEGRATION

### Install
```bash
cd backend && npm install @upstash/redis bullmq
```

### Create backend/src/lib/redis.js
```javascript
const { Redis } = require('@upstash/redis');

let instance = null;
function getRedis() {
  if (!instance) {
    instance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return instance;
}
module.exports = { getRedis };
```

### Create backend/src/lib/cache.js
```javascript
const { getRedis } = require('./redis');

async function withCache(key, ttlSeconds, fetchFn) {
  const redis = getRedis();
  try {
    const cached = await redis.get(key);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (_) {}
  const data = await fetchFn();
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (_) {}
  return data;
}

async function invalidate(...keys) {
  const redis = getRedis();
  if (keys.length) {
    try { await redis.del(...keys); } catch (_) {}
  }
}

const CACHE_KEYS = {
  sessionsList: (page) => `sessions:list:${page}`,
  sessionDetail: (id) => `session:${id}`,
  subjectsList: () => 'subjects:all',
  teacherProfile: (id) => `teacher:${id}:profile`,
  studentDashboard: (id) => `student:${id}:dashboard`,
  teacherDashboard: (id) => `teacher:${id}:dashboard`,
  parentReport: (id, month) => `parent:${id}:${month}`,
  subscriptionStatus: (id) => `student:${id}:subscription`,
};

module.exports = { withCache, invalidate, CACHE_KEYS };
```

### Create backend/src/lib/queues.js
```javascript
const { Queue, Worker } = require('bullmq');

const connection = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const emailQueue = new Queue('email', { connection });
const notifQueue = new Queue('notifications', { connection });
const reportQueue = new Queue('reports', { connection });

module.exports = { emailQueue, notifQueue, reportQueue, connection };
```

### Apply cache to sessions route
In backend/src/routes/sessions.js, wrap GET /sessions and GET /sessions/:id:
```javascript
const { withCache, invalidate, CACHE_KEYS } = require('../lib/cache');

// GET /sessions
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const data = await withCache(CACHE_KEYS.sessionsList(page), 60, async () => {
    // existing Supabase query here
  });
  res.json(data);
});

// On session create/update/delete — invalidate
await invalidate(CACHE_KEYS.sessionsList(1), CACHE_KEYS.sessionDetail(sessionId));
```

---

## PART 2 — RESEND (Email) INTEGRATION

### Install
```bash
cd backend && npm install resend
```

### Create backend/src/lib/email.js
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'noreply@peak-academy.net';

async function sendEnrollmentConfirmation({ to, studentName, sessionTitle, startTime, isFree, amountPaid }) {
  const dateStr = new Date(startTime).toLocaleString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  await resend.emails.send({
    from: FROM,
    to,
    subject: `تأكيد حجز حصة: ${sessionTitle}`,
    html: `
      <div dir="rtl" style="font-family:Cairo,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#f5721a">Peak Academy</h2>
        <p>أهلاً ${studentName}،</p>
        <p>تم تأكيد حجزك بنجاح!</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>الحصة:</strong> ${sessionTitle}</p>
          <p><strong>الموعد:</strong> ${dateStr}</p>
          <p><strong>المبلغ:</strong> ${isFree ? 'مجاني' : amountPaid + ' جنيه'}</p>
        </div>
        <p>نتمنى لك حصة مفيدة!</p>
        <p style="color:#888;font-size:12px">Peak Academy — peak-academy.net</p>
      </div>
    `,
  });
}

async function sendSessionReminder({ to, studentName, sessionTitle, startTime, roomUrl }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `تذكير: حصتك بعد ساعة — ${sessionTitle}`,
    html: `
      <div dir="rtl" style="font-family:Cairo,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#f5721a">Peak Academy</h2>
        <p>أهلاً ${studentName}،</p>
        <p>حصتك <strong>${sessionTitle}</strong> هتبدأ بعد ساعة!</p>
        <a href="${roomUrl}" style="display:inline-block;background:#f5721a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          ادخل الحصة
        </a>
        <p style="color:#888;font-size:12px">Peak Academy — peak-academy.net</p>
      </div>
    `,
  });
}

async function sendPaymentFailed({ to, studentName, sessionTitle }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `فشل الدفع — ${sessionTitle}`,
    html: `
      <div dir="rtl" style="font-family:Cairo,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#f5721a">Peak Academy</h2>
        <p>أهلاً ${studentName}،</p>
        <p>للأسف فشلت عملية الدفع لحصة <strong>${sessionTitle}</strong>.</p>
        <p>يرجى المحاولة مرة أخرى أو استخدام طريقة دفع مختلفة.</p>
        <a href="https://peak-academy.net/sessions" style="display:inline-block;background:#f5721a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          حاول مرة أخرى
        </a>
      </div>
    `,
  });
}

async function sendWithdrawalProcessed({ to, teacherName, amount, status }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `تحديث طلب السحب — ${status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}`,
    html: `
      <div dir="rtl" style="font-family:Cairo,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#f5721a">Peak Academy</h2>
        <p>أهلاً ${teacherName}،</p>
        <p>طلب سحب <strong>${amount} جنيه</strong> ${status === 'approved' ? 'تمت الموافقة عليه وجاري التحويل' : 'تم رفضه'}.</p>
      </div>
    `,
  });
}

module.exports = { sendEnrollmentConfirmation, sendSessionReminder, sendPaymentFailed, sendWithdrawalProcessed };
```

### Create backend/src/queues/email.worker.js
```javascript
const { Worker } = require('bullmq');
const { connection } = require('../lib/queues');
const email = require('../lib/email');

new Worker('email', async (job) => {
  switch (job.name) {
    case 'enrollment-confirm':
      await email.sendEnrollmentConfirmation(job.data);
      break;
    case 'session-reminder':
      await email.sendSessionReminder(job.data);
      break;
    case 'payment-failed':
      await email.sendPaymentFailed(job.data);
      break;
    case 'withdrawal-processed':
      await email.sendWithdrawalProcessed(job.data);
      break;
  }
}, { connection });

console.log('Email worker started');
```

### Start worker in backend/src/server.js
```javascript
// Add at the bottom of server.js
require('./queues/email.worker');
```

### Use queue in enrollment route
```javascript
const { emailQueue } = require('../lib/queues');

// After successful enrollment (free or paid)
await emailQueue.add('enrollment-confirm', {
  to: student.email,
  studentName: student.full_name,
  sessionTitle: session.title,
  startTime: session.start_time,
  isFree: true,
  amountPaid: 0,
});
```

---

## PART 3 — SENTRY INTEGRATION

### Install
```bash
cd backend && npm install @sentry/node
cd frontend && npm install @sentry/nextjs
```

### Backend — Add to TOP of backend/src/server.js (before everything)
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],
});

// Add AFTER all routes (before app.listen)
app.use(Sentry.expressErrorHandler());
```

### Frontend — Create frontend/sentry.client.config.js
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Frontend — Create frontend/sentry.server.config.js
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Frontend — Update frontend/next.config.js
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // existing config
};

module.exports = withSentryConfig(nextConfig, {
  org: 'darkwhale',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

---

## PART 4 — DAILY.CO INTEGRATION

### Install
```bash
cd backend && npm install node-fetch
```

### Create backend/src/lib/daily.js
```javascript
const fetch = require('node-fetch');

const DAILY_API = 'https://api.daily.co/v1';
const DAILY_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'peak-academy';

async function createRoom(sessionId, maxParticipants = 9, expiryHours = 168) {
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_KEY}`,
    },
    body: JSON.stringify({
      name: `session-${sessionId}-${Date.now()}`,
      privacy: 'private',
      properties: {
        exp: Math.floor(Date.now() / 1000) + expiryHours * 3600,
        max_participants: maxParticipants + 1, // +1 for teacher
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: true,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`Daily.co createRoom failed: ${res.status}`);
  return res.json();
}

async function createToken(roomName, userId, isOwner = false, userName = '') {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`Daily.co createToken failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function deleteRoom(roomName) {
  await fetch(`${DAILY_API}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${DAILY_KEY}` },
  });
}

function getRoomUrl(roomName) {
  return `https://${DAILY_DOMAIN}.daily.co/${roomName}`;
}

module.exports = { createRoom, createToken, deleteRoom, getRoomUrl };
```

### Use in sessions route — POST /sessions (teacher creates session)
```javascript
const daily = require('../lib/daily');

// When teacher creates a session — pre-create the room
const room = await daily.createRoom(
  newSession.id,
  req.body.max_students,
  24 * 7 // 7 days
);

// Save room info to session
await supabase.from('sessions').update({
  daily_room_url: daily.getRoomUrl(room.name),
  daily_room_name: room.name,
}).eq('id', newSession.id);
```

### Add join endpoint — POST /sessions/:id/join
```javascript
router.post('/:id/join', authMiddleware, async (req, res) => {
  const { data: session } = await supabase
    .from('sessions')
    .select('daily_room_name, teacher_id, status')
    .eq('id', req.params.id)
    .single();

  if (!session) return res.status(404).json({ error: 'الحصة غير موجودة' });
  if (session.status === 'cancelled') return res.status(400).json({ error: 'الحصة ملغية' });

  // Verify enrollment (unless teacher)
  if (req.user.role !== 'teacher') {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, payment_status')
      .eq('student_id', req.user.id)
      .eq('session_id', req.params.id)
      .single();

    if (!enrollment || enrollment.payment_status !== 'paid') {
      return res.status(403).json({ error: 'غير مسجل في هذه الحصة' });
    }
  }

  const isOwner = req.user.id === session.teacher_id;
  const token = await daily.createToken(
    session.daily_room_name,
    req.user.id,
    isOwner,
    req.user.full_name
  );

  res.json({
    room_url: `https://${process.env.DAILY_DOMAIN}.daily.co/${session.daily_room_name}`,
    token,
  });
});
```

---

## PART 5 — PAYMOB INTEGRATION

### Create backend/src/lib/paymob.js
```javascript
const fetch = require('node-fetch');

const PAYMOB_API = 'https://accept.paymob.com/api';

async function createOrder(amountCents, items, billing) {
  // Step 1: Auth token
  const authRes = await fetch(`${PAYMOB_API}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
  });
  const { token } = await authRes.json();

  // Step 2: Create order
  const orderRes = await fetch(`${PAYMOB_API}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      items,
    }),
  });
  const order = await orderRes.json();

  // Step 3: Payment key
  const pkRes = await fetch(`${PAYMOB_API}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: order.id,
      billing_data: {
        first_name: billing.first_name || 'NA',
        last_name: billing.last_name || 'NA',
        email: billing.email || 'NA',
        phone_number: billing.phone || '01000000000',
        apartment: 'NA', floor: 'NA', street: 'NA',
        building: 'NA', shipping_method: 'NA',
        postal_code: 'NA', city: 'NA',
        country: 'EG', state: 'NA',
      },
      currency: 'EGP',
      integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID_CARD),
    }),
  });
  const { token: paymentToken } = await pkRes.json();

  return {
    orderId: order.id.toString(),
    iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`,
    token: paymentToken,
  };
}

function verifyHMAC(body, receivedHmac, secret) {
  const crypto = require('crypto');
  const data = body.obj;
  const str = [
    data.amount_cents, data.created_at, data.currency,
    data.error_occured, data.has_parent_transaction, data.id,
    data.integration_id, data.is_3d_secure, data.is_auth,
    data.is_capture, data.is_refunded, data.is_standalone_payment,
    data.is_voided, data.order?.id, data.owner,
    data.pending, data.source_data?.pan,
    data.source_data?.sub_type, data.source_data?.type,
    data.success,
  ].join('');
  const hash = crypto.createHmac('sha512', secret).update(str).digest('hex');
  return hash === receivedHmac;
}

module.exports = { createOrder, verifyHMAC };
```

### Webhook route — backend/src/routes/payments.js
```javascript
const { verifyHMAC } = require('../lib/paymob');
const { emailQueue } = require('../lib/queues');
const { invalidate, CACHE_KEYS } = require('../lib/cache');

// POST /payments/webhook — NO auth middleware
router.post('/webhook', async (req, res) => {
  const hmac = req.query.hmac;
  if (!verifyHMAC(req.body, hmac, process.env.PAYMOB_HMAC_SECRET)) {
    return res.status(401).json({ error: 'Invalid HMAC' });
  }

  const { success, id: transactionId, order } = req.body.obj;
  const paymobOrderId = order.id.toString();

  const { data: payment } = await supabase
    .from('payments')
    .select('*, enrollment:enrollment_id(id, session_id, student_id, session:session_id(title, start_time))')
    .eq('paymob_order_id', paymobOrderId)
    .single();

  if (!payment || payment.status !== 'pending') return res.json({ ok: true });

  if (success) {
    await Promise.all([
      supabase.from('payments').update({
        status: 'paid',
        paymob_transaction_id: transactionId.toString(),
        paid_at: new Date().toISOString(),
      }).eq('id', payment.id),

      supabase.from('enrollments').update({
        status: 'confirmed',
        payment_status: 'paid',
      }).eq('id', payment.enrollment_id),

      supabase.rpc('increment_session_count', { session_id: payment.enrollment.session_id }),

      invalidate(
        CACHE_KEYS.sessionDetail(payment.enrollment.session_id),
        CACHE_KEYS.studentDashboard(payment.enrollment.student_id),
      ),
    ]);

    await emailQueue.add('enrollment-confirm', {
      to: payment.enrollment.student?.email,
      studentName: payment.enrollment.student?.full_name,
      sessionTitle: payment.enrollment.session?.title,
      startTime: payment.enrollment.session?.start_time,
      isFree: false,
      amountPaid: payment.amount,
    });
  } else {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
  }

  return res.json({ ok: true });
});
```

---

## PART 6 — SESSION REMINDER CRON JOB

### Create backend/src/jobs/sessionReminders.js
```javascript
const { emailQueue } = require('../lib/queues');
const { getSupabase } = require('../lib/supabase');

async function scheduleReminders() {
  const supabase = getSupabase();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id, title, start_time, daily_room_url,
      enrollments(
        student:student_id(email, full_name),
        payment_status
      )
    `)
    .eq('status', 'scheduled')
    .gte('start_time', oneHourFromNow)
    .lte('start_time', twoHoursFromNow);

  for (const session of sessions || []) {
    for (const enrollment of session.enrollments || []) {
      if (enrollment.payment_status !== 'paid') continue;
      await emailQueue.add('session-reminder', {
        to: enrollment.student.email,
        studentName: enrollment.student.full_name,
        sessionTitle: session.title,
        startTime: session.start_time,
        roomUrl: session.daily_room_url,
      });
    }
  }
}

// Run every 30 minutes
setInterval(scheduleReminders, 30 * 60 * 1000);
module.exports = { scheduleReminders };
```

### Add to server.js
```javascript
require('./jobs/sessionReminders');
```

---

## PART 7 — FRONTEND SERVICE INTEGRATION

### Create frontend/lib/daily.js
```javascript
import api from './api';

export async function joinSession(sessionId) {
  const res = await api.post(`/sessions/${sessionId}/join`);
  return res.data; // { room_url, token }
}
```

### Create frontend/components/sessions/JoinButton.jsx
```javascript
'use client';
import { useState } from 'react';
import { joinSession } from '@/lib/daily';

export default function JoinButton({ sessionId, startTime }) {
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const start = new Date(startTime);
  const minutesUntil = (start - now) / 60000;
  const canJoin = minutesUntil <= 15 && minutesUntil > -120;

  const handleJoin = async () => {
    setLoading(true);
    try {
      const { room_url, token } = await joinSession(sessionId);
      window.open(`${room_url}?t=${token}`, '_blank');
    } catch (e) {
      alert(e.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (!canJoin) return (
    <button disabled className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-500 cursor-not-allowed text-sm">
      {minutesUntil > 15 ? `تبدأ بعد ${Math.round(minutesUntil)} دقيقة` : 'انتهت الحصة'}
    </button>
  );

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-all disabled:opacity-50"
    >
      {loading ? 'جاري الدخول...' : 'ادخل الحصة'}
    </button>
  );
}
```

### Create frontend/components/enrollment/PaymobCheckout.jsx
```javascript
'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function PaymobCheckout({ sessionId, sessionPrice, promoCode }) {
  const qc = useQueryClient();

  const enrollMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/sessions/${sessionId}/enroll`, payload).then(r => r.data),
    onSuccess: (data) => {
      if (data.paymob_url) {
        window.location.href = data.paymob_url;
      } else {
        qc.invalidateQueries({ queryKey: ['my-sessions'] });
        qc.invalidateQueries({ queryKey: ['sessions'] });
      }
    },
    onError: (e) => {
      alert(e.response?.data?.error || 'حدث خطأ في الدفع');
    },
  });

  return (
    <button
      onClick={() => enrollMutation.mutate({
        payment_type: 'per_session',
        promo_code: promoCode || undefined,
      })}
      disabled={enrollMutation.isPending}
      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-all disabled:opacity-50"
    >
      {enrollMutation.isPending ? 'جاري التحويل للدفع...' : `ادفع ${sessionPrice} جنيه`}
    </button>
  );
}
```

---

## PART 8 — VERIFICATION CHECKLIST

After implementing all parts, verify:

```
Redis:
  [ ] GET /sessions returns cached response (check Railway logs)
  [ ] Cache invalidates on session update
  [ ] BullMQ email queue adds jobs without error

Resend:
  [ ] Email received after test enrollment
  [ ] Email received 1 hour before session (test with near-future session)
  [ ] Payment failed email works

Sentry:
  [ ] Throw test error in backend — appears in Sentry dashboard
  [ ] Frontend error boundary — appears in Sentry dashboard

Daily.co:
  [ ] Room created when teacher creates session (check daily.co dashboard)
  [ ] Join token generated on POST /sessions/:id/join
  [ ] Student redirected to Daily.co room

Paymob:
  [ ] Enrollment creates Paymob order — iframeUrl returned
  [ ] Test payment with card: 4987654321098769, expiry: 05/25, CVV: 123
  [ ] Webhook fires — enrollment status changes to 'confirmed'
  [ ] Confirmation email received
```

---

## IMPLEMENTATION ORDER

```
1. Redis (lib/redis.js + lib/cache.js + lib/queues.js)
2. Email worker (lib/email.js + queues/email.worker.js)
3. Sentry (server.js + sentry configs)
4. Daily.co (lib/daily.js + sessions join endpoint)
5. Paymob (lib/paymob.js + payments webhook)
6. Session reminders cron job
7. Frontend components (JoinButton + PaymobCheckout)
8. Run verification checklist
```

---

*Peak Academy — Dark Whale Tech | Integration Prompt v1.0*
