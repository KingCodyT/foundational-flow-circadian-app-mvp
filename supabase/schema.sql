create extension if not exists "pgcrypto";

create table if not exists public.circadian_audits (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  answers jsonb not null,
  scores jsonb not null,
  insight jsonb not null,
  protocol jsonb not null
);

create index if not exists circadian_audits_client_id_idx
  on public.circadian_audits (client_id);

create index if not exists circadian_audits_created_at_idx
  on public.circadian_audits (created_at desc);
