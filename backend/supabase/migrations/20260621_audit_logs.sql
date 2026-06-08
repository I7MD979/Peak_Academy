-- Audit logs (NIST AU-2 / ISO 27001 A.12.4)

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  request_id   text,
  actor_id     uuid,
  actor_role   text,
  action       text not null,
  entity_type  text,
  entity_id    text,
  status_code  int,
  ip_address   text,
  user_agent   text,
  request_body jsonb,
  metadata     jsonb default '{}',
  duration_ms  int,
  is_sensitive boolean default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_action on public.audit_logs(action);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_sensitive on public.audit_logs(is_sensitive) where is_sensitive = true;

alter table public.audit_logs enable row level security;
