-- Portal vendedor MVP para Netlify + Supabase.
-- Importante:
-- 1. El password_hash actual de Nexar Admin usa Werkzeug scrypt.
-- 2. Supabase SQL no puede validar ese hash de forma nativa.
-- 3. Por eso este MVP usa una Netlify Function para verificar la clave
--    y este SQL solo prepara sesiones seguras + dashboard RPC.
-- 4. Reemplaza REEMPLAZAR_CON_SECRETO_LARGO por un secreto aleatorio largo
--    y usa el mismo valor en la variable PORTAL_VENDOR_RPC_SECRET de Netlify.

create extension if not exists pgcrypto;

create table if not exists public.portal_vendedor_sessions (
    id uuid primary key default gen_random_uuid(),
    vendedor_id uuid not null references public.vendedores (id) on delete cascade,
    codigo_vendedor text not null,
    session_token text not null unique,
    created_at timestamptz not null default timezone('utc', now()),
    expires_at timestamptz not null
);

create index if not exists portal_vendedor_sessions_token_idx
    on public.portal_vendedor_sessions (session_token);

create index if not exists portal_vendedor_sessions_vendor_idx
    on public.portal_vendedor_sessions (vendedor_id, expires_at desc);

alter table public.portal_vendedor_sessions enable row level security;

drop policy if exists portal_secret_select_vendedores on public.vendedores;
create policy portal_secret_select_vendedores
on public.vendedores
for select
to anon
using (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = '__PORTAL_VENDOR_SECRET__'
    and activo = true
);

drop policy if exists portal_secret_update_vendedores on public.vendedores;
create policy portal_secret_update_vendedores
on public.vendedores
for update
to anon
using (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
)
with check (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
);

drop policy if exists portal_secret_insert_sessions on public.portal_vendedor_sessions;
create policy portal_secret_insert_sessions
on public.portal_vendedor_sessions
for insert
to anon
with check (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
);

drop policy if exists portal_secret_select_sessions on public.portal_vendedor_sessions;
create policy portal_secret_select_sessions
on public.portal_vendedor_sessions
for select
to anon
using (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
);

drop policy if exists portal_secret_delete_sessions on public.portal_vendedor_sessions;
create policy portal_secret_delete_sessions
on public.portal_vendedor_sessions
for delete
to anon
using (
    coalesce((current_setting('request.headers', true)::jsonb ->> 'x-portal-secret'), '') = 'REEMPLAZAR_CON_SECRETO_LARGO'
);

create or replace function public.portal_dashboard_vendedor(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_session public.portal_vendedor_sessions%rowtype;
    v_vendedor public.vendedores%rowtype;
    v_scope_codigo text;
    v_total_licencias bigint := 0;
    v_comisiones_pendientes bigint := 0;
    v_comisiones_pagadas bigint := 0;
    v_total_pendiente numeric(12,2) := 0;
    v_total_pagado numeric(12,2) := 0;
    v_total_vendedores bigint := 0;
    v_vendedores_activos bigint := 0;
    v_ultimas_licencias jsonb := '[]'::jsonb;
    v_ultimas_comisiones jsonb := '[]'::jsonb;
begin
    if coalesce(trim(p_session_token), '') = '' then
        raise exception 'Sesion invalida';
    end if;

    delete from public.portal_vendedor_sessions
    where expires_at <= timezone('utc', now());

    select *
    into v_session
    from public.portal_vendedor_sessions
    where session_token = trim(p_session_token)
      and expires_at > timezone('utc', now())
    limit 1;

    if not found then
        raise exception 'Sesion invalida';
    end if;

    select *
    into v_vendedor
    from public.vendedores
    where id = v_session.vendedor_id
      and activo = true
    limit 1;

    if not found then
        raise exception 'Vendedor no disponible';
    end if;

    if coalesce(v_vendedor.es_admin, false) then
        select count(*) into v_total_vendedores from public.vendedores;
        select count(*) into v_vendedores_activos from public.vendedores where activo = true;
        v_scope_codigo := null;
    else
        v_scope_codigo := v_vendedor.codigo_vendedor;
    end if;

    select count(*)
    into v_total_licencias
    from public.licencias
    where v_scope_codigo is null or codigo_vendedor = v_scope_codigo;

    select
        count(*) filter (where estado = 'pendiente'),
        count(*) filter (where estado = 'pagada'),
        coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0),
        coalesce(sum(case when estado = 'pagada' then monto else 0 end), 0)
    into
        v_comisiones_pendientes,
        v_comisiones_pagadas,
        v_total_pendiente,
        v_total_pagado
    from public.comisiones
    where v_scope_codigo is null or codigo_vendedor = v_scope_codigo;

    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    into v_ultimas_licencias
    from (
        select
            license_key,
            producto,
            usuario,
            plan,
            plan_vendido,
            expira,
            created_at
        from public.licencias
        where v_scope_codigo is null or codigo_vendedor = v_scope_codigo
        order by created_at desc nulls last
        limit 8
    ) as t;

    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    into v_ultimas_comisiones
    from (
        select
            tipo,
            producto,
            license_key,
            monto,
            estado,
            created_at,
            paid_at
        from public.comisiones
        where v_scope_codigo is null or codigo_vendedor = v_scope_codigo
        order by created_at desc nulls last
        limit 8
    ) as t;

    return jsonb_build_object(
        'vendedor', jsonb_build_object(
            'codigo_vendedor', v_vendedor.codigo_vendedor,
            'nombre', v_vendedor.nombre,
            'apellido', v_vendedor.apellido,
            'es_admin', coalesce(v_vendedor.es_admin, false),
            'cobra_comision', coalesce(v_vendedor.cobra_comision, true)
        ),
        'resumen', jsonb_build_object(
            'total_licencias', v_total_licencias,
            'comisiones_pendientes', v_comisiones_pendientes,
            'comisiones_pagadas', v_comisiones_pagadas,
            'total_pendiente', v_total_pendiente,
            'total_pagado', v_total_pagado,
            'total_vendedores', v_total_vendedores,
            'vendedores_activos', v_vendedores_activos
        ),
        'ultimas_licencias', v_ultimas_licencias,
        'ultimas_comisiones', v_ultimas_comisiones
    );
end;
$$;

grant execute on function public.portal_dashboard_vendedor(text) to anon;
