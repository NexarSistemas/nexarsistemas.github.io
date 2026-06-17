-- Solicitudes MVP de recuperacion de contraseña para Portal Vendedor.
-- No resetea claves automaticamente ni envia emails.

create extension if not exists pgcrypto;

create table if not exists public.portal_password_recovery_requests (
    id uuid primary key default gen_random_uuid(),
    codigo_vendedor text not null,
    vendedor_id uuid references public.vendedores (id) on delete set null,
    email_contacto text,
    telefono_contacto text,
    mensaje text,
    estado text not null default 'pendiente',
    created_at timestamptz not null default timezone('utc', now()),
    resolved_at timestamptz,
    observaciones text
);

create index if not exists portal_password_recovery_codigo_idx
    on public.portal_password_recovery_requests (codigo_vendedor, created_at desc);

create index if not exists portal_password_recovery_estado_idx
    on public.portal_password_recovery_requests (estado, created_at desc);

alter table public.portal_password_recovery_requests enable row level security;

drop policy if exists portal_secret_insert_password_recovery on public.portal_password_recovery_requests;
create policy portal_secret_insert_password_recovery
on public.portal_password_recovery_requests
for insert
to anon
with check (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
    and estado = 'pendiente'
    and resolved_at is null
    and observaciones is null
);
