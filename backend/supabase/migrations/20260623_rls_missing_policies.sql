-- Peak Academy — RLS policies for tables with RLS enabled but no policies
-- Backend uses service_role (bypasses RLS). These policies protect direct client/PostgREST access.

-- ═══════════════════════════════════════════════════
-- platform_stats — replace USING (true) with visible-only read
-- ═══════════════════════════════════════════════════

drop policy if exists "platform_stats_public_read" on public.platform_stats;
create policy "platform_stats_public_read"
on public.platform_stats for select
to anon, authenticated
using (is_visible is true);

drop policy if exists "platform_stats_admin_write" on public.platform_stats;
create policy "platform_stats_admin_write"
on public.platform_stats for all
to authenticated
using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
)
with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- ═══════════════════════════════════════════════════
-- audit_logs
-- ═══════════════════════════════════════════════════

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
to authenticated
using (
  actor_id = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- ═══════════════════════════════════════════════════
-- dunning_logs
-- ═══════════════════════════════════════════════════

drop policy if exists "dunning_logs_select_own" on public.dunning_logs;
create policy "dunning_logs_select_own"
on public.dunning_logs for select
to authenticated
using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- feature_flags + overrides
-- ═══════════════════════════════════════════════════

drop policy if exists "feature_flags_read_enabled" on public.feature_flags;
create policy "feature_flags_read_enabled"
on public.feature_flags for select
to anon, authenticated
using (is_enabled is true);

drop policy if exists "feature_flag_overrides_select_own" on public.feature_flag_overrides;
create policy "feature_flag_overrides_select_own"
on public.feature_flag_overrides for select
to authenticated
using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- onboarding
-- ═══════════════════════════════════════════════════

drop policy if exists "onboarding_steps_read_catalog" on public.onboarding_steps;
create policy "onboarding_steps_read_catalog"
on public.onboarding_steps for select
to anon, authenticated
using (key is not null);

drop policy if exists "user_onboarding_select_own" on public.user_onboarding;
create policy "user_onboarding_select_own"
on public.user_onboarding for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_onboarding_insert_own" on public.user_onboarding;
create policy "user_onboarding_insert_own"
on public.user_onboarding for insert
to authenticated
with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- parent_children
-- ═══════════════════════════════════════════════════

drop policy if exists "parent_children_select_related" on public.parent_children;
create policy "parent_children_select_related"
on public.parent_children for select
to authenticated
using (parent_id = auth.uid() or student_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- promotions + question_pricing (public catalog)
-- ═══════════════════════════════════════════════════

drop policy if exists "promotions_read_active" on public.promotions;
create policy "promotions_read_active"
on public.promotions for select
to anon, authenticated
using (
  is_active is true
  and (expires_at is null or expires_at > now())
);

drop policy if exists "question_pricing_read_active" on public.question_pricing;
create policy "question_pricing_read_active"
on public.question_pricing for select
to anon, authenticated
using (is_active is true);

-- ═══════════════════════════════════════════════════
-- questions
-- ═══════════════════════════════════════════════════

drop policy if exists "questions_self_read" on public.questions;
drop policy if exists "questions_select_own" on public.questions;
create policy "questions_select_own"
on public.questions for select
to authenticated
using (student_id = auth.uid() or teacher_id = auth.uid());

drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own"
on public.questions for insert
to authenticated
with check (student_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- referrals + saas_config
-- ═══════════════════════════════════════════════════

drop policy if exists "referrals_select_related" on public.referrals;
create policy "referrals_select_related"
on public.referrals for select
to authenticated
using (referrer_id = auth.uid() or referred_id = auth.uid());

drop policy if exists "saas_config_admin_read" on public.saas_config;
create policy "saas_config_admin_read"
on public.saas_config for select
to authenticated
using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- ═══════════════════════════════════════════════════
-- sessions + session_enrollments
-- ═══════════════════════════════════════════════════

drop policy if exists "sessions_read_public" on public.sessions;
create policy "sessions_read_public"
on public.sessions for select
to anon, authenticated
using (
  status in ('scheduled', 'live', 'completed')
  or teacher_id = auth.uid()
);

drop policy if exists "session_enrollments_select_own" on public.session_enrollments;
create policy "session_enrollments_select_own"
on public.session_enrollments for select
to authenticated
using (
  exists (
    select 1 from public.student_profiles sp
    where sp.id = session_enrollments.student_id
      and sp.user_id = auth.uid()
  )
  or exists (
    select 1 from public.sessions s
    where s.id = session_enrollments.session_id
      and s.teacher_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════
-- study rooms
-- ═══════════════════════════════════════════════════

drop policy if exists "study_rooms_read_open" on public.study_rooms;
create policy "study_rooms_read_open"
on public.study_rooms for select
to authenticated
using (status in ('open', 'active'));

drop policy if exists "study_room_members_select_own" on public.study_room_members;
create policy "study_room_members_select_own"
on public.study_room_members for select
to authenticated
using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- subjects (catalog)
-- ═══════════════════════════════════════════════════

drop policy if exists "subjects_read_catalog" on public.subjects;
create policy "subjects_read_catalog"
on public.subjects for select
to anon, authenticated
using (name_ar is not null);

-- ═══════════════════════════════════════════════════
-- teacher_earnings + withdrawal_requests
-- ═══════════════════════════════════════════════════

drop policy if exists "teacher_earnings_select_own" on public.teacher_earnings;
create policy "teacher_earnings_select_own"
on public.teacher_earnings for select
to authenticated
using (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.id = teacher_earnings.teacher_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "withdrawals_self_read" on public.withdrawal_requests;
drop policy if exists "withdrawal_requests_select_own" on public.withdrawal_requests;
create policy "withdrawal_requests_select_own"
on public.withdrawal_requests for select
to authenticated
using (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.id = withdrawal_requests.teacher_id
      and tp.user_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════
-- transactions
-- ═══════════════════════════════════════════════════

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
on public.transactions for select
to authenticated
using (user_id = auth.uid());
