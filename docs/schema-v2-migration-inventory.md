# Schema v2 Migration Inventory (Phase 0)

Run before applying `20260609_master_schema_v2.sql` in Supabase SQL Editor.

## Pre-migration checklist

1. Export Supabase backup (Dashboard → Database → Backups).
2. Record row counts:

```sql
SELECT 'sessions' AS t, count(*) FROM sessions
UNION ALL SELECT 'session_enrollments', count(*) FROM session_enrollments
UNION ALL SELECT 'enrollments_legacy', count(*) FROM enrollments
UNION ALL SELECT 'transactions', count(*) FROM transactions
UNION ALL SELECT 'student_subscriptions', count(*) FROM student_subscriptions
UNION ALL SELECT 'free_trial_uses', count(*) FROM free_trial_uses;
```

3. Reload PostgREST schema after migration (Settings → API → Reload).

## FKs referencing `sessions.id` (TEXT)

| Table / column | Notes |
|----------------|-------|
| `session_enrollments.session_id` | Primary enrollment FK |
| `enrollments.session_id` | Legacy table |
| `teacher_earnings.session_id` | Earnings |
| `free_trial_uses.session_id` | Optional |
| `transactions.metadata->session_id` | JSON, not FK |
| `study_room_members` / study rooms | If present |

## Backend files to update when `FF_SCHEMA_V2=true`

- `services/enrollmentService.js`
- `utils/payments-fulfillment.js`
- `utils/session-select.js`
- `utils/transaction-status.js`
- `routes/sessions.js`, `payments.js`, `student.js`, `admin.js`
- `services/subscriptionService.js`, `refundService.js`, `parentReportService.js`

## Feature flag

Set `FF_SCHEMA_V2=true` on Railway after migration is applied and verified.
