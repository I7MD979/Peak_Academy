# Peak Academy — Payment, Enrollment & Promotions System
> Complete spec for Cursor implementation

---

## 1. Pricing Model

```
Free Trial      → أول حصة مجانية مع كل مدرس في كل مادة (مرة واحدة بس)
Pay-per-session → 60–120 جنيه حسب المدرس، ادفع كل حصة على حدة
Silver          → 299 جنيه / شهر → 4 حصص
Gold            → 499 جنيه / شهر → 10 حصص
```

---

## 2. Database Schema

```sql
-- ==============================
-- PRICING & PLANS
-- ==============================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                 -- 'silver' | 'gold'
  price DECIMAL(10,2) NOT NULL,       -- 299 | 499
  sessions_per_month INT NOT NULL,    -- 4 | 10
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE student_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','cancelled','expired','paused')),
  sessions_remaining INT NOT NULL,    -- reset كل شهر
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  paymob_subscription_id TEXT,        -- للتجديد التلقائي
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================
-- FREE TRIAL TRACKING
-- ==============================
CREATE TABLE free_trial_uses (
  student_id UUID NOT NULL REFERENCES users(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  session_id UUID REFERENCES sessions(id),
  PRIMARY KEY (student_id, teacher_id, subject_id)
  -- Unique constraint: طالب × مدرس × مادة = مرة واحدة بس
);

-- ==============================
-- PROMOTIONS ENGINE
-- ==============================
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('coupon','bundle','early_bird','referral')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed','free_session')),
  discount_value DECIMAL(10,2) NOT NULL,  -- % أو جنيه
  min_sessions INT DEFAULT 1,             -- للـ bundle
  bonus_sessions INT DEFAULT 0,           -- للـ bundle (اشتري 5 + 1)
  max_uses INT,                           -- NULL = unlimited
  used_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,           -- كل يوزر يستخدمه كام مرة
  applies_to TEXT DEFAULT 'all'
    CHECK (applies_to IN ('all','per_session','subscription')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),   -- Admin
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE promotion_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  enrollment_id UUID REFERENCES enrollments(id),
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Referral codes (كل طالب عنده كود خاص بيه)
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  code TEXT UNIQUE NOT NULL,          -- peak-AHMED123
  total_referrals INT DEFAULT 0,
  earned_sessions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================
-- PAYMENTS
-- ==============================
-- (موجود في الـ system design السابق + إضافات)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  promotion_id UUID REFERENCES promotions(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  original_amount DECIMAL(10,2);

-- ==============================
-- INDEXES
-- ==============================
CREATE INDEX idx_student_subs_student ON student_subscriptions(student_id, status);
CREATE INDEX idx_student_subs_period ON student_subscriptions(current_period_end);
CREATE INDEX idx_free_trial_student ON free_trial_uses(student_id);
CREATE INDEX idx_promotions_code ON promotions(code) WHERE is_active = true;
CREATE INDEX idx_promo_uses_user ON promotion_uses(user_id, promotion_id);
CREATE INDEX idx_referral_code ON referral_codes(code);
```

---

## 3. Enrollment Flow (Backend Logic)

```javascript
// routes/enrollment.js
// POST /sessions/:sessionId/enroll

async function enrollStudent(req, res) {
  const { sessionId } = req.params;
  const { payment_type, promo_code, plan_id } = req.body;
  const studentId = req.user.id;

  // 1. Check session availability
  const session = await getSession(sessionId);
  if (session.current_students >= session.max_students) {
    return res.status(400).json({ error: 'الحصة ممتلئة' });
  }

  // 2. Check existing enrollment
  const existing = await checkExistingEnrollment(studentId, sessionId);
  if (existing) return res.status(400).json({ error: 'مسجل بالفعل' });

  // 3. Determine price
  let finalPrice = session.price;
  let discountAmount = 0;
  let promotionId = null;
  let isFree = false;

  // === FREE TRIAL CHECK ===
  if (payment_type === 'free_trial') {
    const trialUsed = await checkFreeTrial(studentId, session.teacher_id, session.subject_id);
    if (trialUsed) {
      return res.status(400).json({ error: 'استخدمت الحصة المجانية مع هذا المدرس' });
    }
    isFree = true;
    finalPrice = 0;
  }

  // === SUBSCRIPTION CHECK ===
  else if (payment_type === 'subscription') {
    const sub = await getActiveSubscription(studentId);
    if (!sub || sub.sessions_remaining <= 0) {
      return res.status(400).json({ error: 'اشتراكك انتهت حصصه' });
    }
  }

  // === PROMO CODE ===
  if (promo_code && !isFree) {
    const promo = await validatePromoCode(promo_code, studentId, payment_type);
    if (promo.valid) {
      discountAmount = calculateDiscount(session.price, promo);
      finalPrice = Math.max(0, session.price - discountAmount);
      promotionId = promo.id;
    } else {
      return res.status(400).json({ error: promo.reason });
    }
  }

  // 4. Create pending enrollment
  const enrollment = await createEnrollment({
    studentId, sessionId,
    payment_status: isFree ? 'paid' : 'pending',
    status: isFree ? 'confirmed' : 'pending',
  });

  // 5. Handle free → confirm immediately
  if (isFree) {
    await recordFreeTrial(studentId, session.teacher_id, session.subject_id, sessionId);
    await incrementSessionCount(sessionId);
    // Async: إيميل تأكيد في الـ queue
    await emailQueue.add('enrollment-confirm', {
      studentEmail: req.user.email,
      sessionTitle: session.title,
      startTime: session.start_time,
      isFree: true,
    });
    return res.json({ enrollment, paymob_url: null });
  }

  // 6. Subscription → deduct session
  if (payment_type === 'subscription') {
    await deductSubscriptionSession(studentId);
    await confirmEnrollment(enrollment.id);
    await incrementSessionCount(sessionId);
    await emailQueue.add('enrollment-confirm', { ... });
    return res.json({ enrollment, paymob_url: null });
  }

  // 7. Pay-per-session → create Paymob order
  const paymobOrder = await createPaymobOrder({
    amount: finalPrice * 100,  // Paymob بياخد Piastres
    enrollmentId: enrollment.id,
    studentId,
  });

  // Save payment record
  await createPayment({
    enrollmentId: enrollment.id,
    studentId,
    originalAmount: session.price,
    discountAmount,
    amount: finalPrice,
    promotionId,
    paymobOrderId: paymobOrder.id,
  });

  return res.json({ enrollment, paymob_url: paymobOrder.iframe_url });
}
```

---

## 4. Paymob Webhook Handler

```javascript
// POST /payments/webhook  (public endpoint, NO auth middleware)
async function paymobWebhook(req, res) {
  // 1. HMAC verification — ALWAYS first
  const hmac = req.query.hmac;
  const isValid = verifyPaymobHMAC(req.body, hmac, process.env.PAYMOB_HMAC_SECRET);
  if (!isValid) return res.status(400).json({ error: 'Invalid HMAC' });

  const { success, order } = req.body.obj;
  const paymobOrderId = order.id.toString();

  // 2. Find payment
  const payment = await findPaymentByPaymobOrder(paymobOrderId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  // Idempotency: skip if already processed
  if (payment.status !== 'pending') return res.json({ ok: true });

  // 3. Success path
  if (success) {
    await Promise.all([
      updatePaymentStatus(payment.id, 'paid'),
      confirmEnrollment(payment.enrollment_id),
      incrementSessionCount(payment.enrollment.session_id),
      recordPromoUse(payment.promotion_id, payment.student_id, payment.enrollment_id, payment.discount_amount),
      creditTeacherEarnings(payment),
    ]);

    await emailQueue.add('enrollment-confirm', {
      studentEmail: payment.student.email,
      sessionTitle: payment.session.title,
      startTime: payment.session.start_time,
      amountPaid: payment.amount,
    });

    // Invalidate cache
    await invalidate(
      CACHE.sessionDetail(payment.session_id),
      CACHE.studentDashboard(payment.student_id),
    );
  }

  // 4. Failure path
  else {
    await updatePaymentStatus(payment.id, 'failed');
    await notifQueue.add('payment-failed', {
      studentId: payment.student_id,
      sessionId: payment.session_id,
    });
  }

  return res.json({ ok: true });
}
```

---

## 5. Promo Code Validator

```javascript
// utils/promoValidator.js
export async function validatePromoCode(code, studentId, paymentType) {
  const promo = await supabase
    .from('promotions')
    .select('*, promotion_uses(count)')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!promo.data) return { valid: false, reason: 'الكود غير موجود' };

  // Expiry check
  if (promo.data.expires_at && new Date(promo.data.expires_at) < new Date()) {
    return { valid: false, reason: 'انتهت صلاحية الكود' };
  }

  // Max uses check
  if (promo.data.max_uses && promo.data.used_count >= promo.data.max_uses) {
    return { valid: false, reason: 'الكود وصل للحد الأقصى' };
  }

  // Per-user limit check
  const userUses = await countUserPromoUses(promo.data.id, studentId);
  if (userUses >= promo.data.per_user_limit) {
    return { valid: false, reason: 'استخدمت هذا الكود من قبل' };
  }

  // Payment type compatibility
  if (promo.data.applies_to !== 'all' && promo.data.applies_to !== paymentType) {
    return { valid: false, reason: 'هذا الكود لا ينطبق على هذا النوع من الدفع' };
  }

  return { valid: true, ...promo.data };
}

export function calculateDiscount(originalPrice, promo) {
  if (promo.discount_type === 'percent') {
    return (originalPrice * promo.discount_value) / 100;
  }
  if (promo.discount_type === 'fixed') {
    return Math.min(promo.discount_value, originalPrice);
  }
  if (promo.discount_type === 'free_session') {
    return originalPrice; // 100% discount
  }
  return 0;
}
```

---

## 6. Subscription Monthly Reset (Cron Job)

```javascript
// jobs/subscriptionReset.js  — يشتغل كل أول الشهر
export async function resetMonthlySubscriptions() {
  const now = new Date();

  // جيب كل الاشتراكات اللي انتهت فترتها
  const { data: expiredSubs } = await supabase
    .from('student_subscriptions')
    .select('*, plan:plan_id(*)')
    .eq('status', 'active')
    .lte('current_period_end', now.toISOString());

  for (const sub of expiredSubs) {
    const newEnd = new Date(sub.current_period_end);
    newEnd.setMonth(newEnd.getMonth() + 1);

    await supabase.from('student_subscriptions').update({
      sessions_remaining: sub.plan.sessions_per_month,  // reset
      current_period_start: sub.current_period_end,
      current_period_end: newEnd.toISOString(),
    }).eq('id', sub.id);
  }
}
```

---

## 7. Refund Rules

```
الإلغاء قبل 24 ساعة  → استرداد كامل
الإلغاء قبل 2 ساعة   → استرداد 50%
بعد بدء الحصة         → بدون استرداد
حصة مُلغية من المدرس  → استرداد كامل تلقائي
```

```javascript
// utils/refundCalculator.js
export function calculateRefundAmount(payment, session, cancelledAt) {
  const sessionStart = new Date(session.start_time);
  const cancellationTime = new Date(cancelledAt);
  const hoursUntilSession = (sessionStart - cancellationTime) / (1000 * 60 * 60);

  if (hoursUntilSession >= 24) return payment.amount;           // كامل
  if (hoursUntilSession >= 2)  return payment.amount * 0.5;     // نص
  return 0;                                                      // مفيش
}
```

---

## 8. Admin Promotion Management (Endpoints)

```
POST   /admin/promotions          → create promo
GET    /admin/promotions          → list all (paginated)
PUT    /admin/promotions/:id      → toggle active / update
GET    /admin/promotions/:id/uses → who used it + revenue impact
DELETE /admin/promotions/:id      → soft delete (is_active = false)

POST   /admin/early-bird/activate → يفعّل early bird لفترة محددة
GET    /admin/promotions/stats    → total discount given, conversion rate
```

---

## 9. Frontend UX Rules

```
1. كارت الحصة يوضح:
   - "أول حصة مجانية" badge لو مش مستخدمه
   - السعر بعد الخصم لو في promo نشط
   - "متاح 3 أماكن فقط" لو الحصة شارفت تمتلئ

2. Checkout Page:
   - حقل كود الخصم مع real-time validation
   - سطر يوضح: السعر الأصلي ← الخصم ← السعر النهائي
   - زر "ادفع الآن" بالمبلغ النهائي

3. Subscription CTA:
   - يظهر بعد ثالث حصة مدفوعة: "وفّر مع الاشتراك الشهري"
   - مقارنة: pay-per-session cost vs subscription price
```

---

*Peak Academy — Dark Whale Tech*
