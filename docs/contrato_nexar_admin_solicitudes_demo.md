# Contrato de integracion para Nexar Admin

## Objetivo

Nexar Admin debe consumir las solicitudes creadas por la landing desde un backend seguro. El frontend publico solo inserta; la lectura y actualizacion pertenecen al admin.

## Regla principal de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo en backend o variables de entorno del panel admin.
- Nunca exponer `service_role` en frontend, HTML o JavaScript publico.
- La landing usa unicamente `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Tabla fuente

`public.solicitudes_demo`

Campos esperados:

- `id`
- `created_at`
- `nombre`
- `email`
- `telefono`
- `negocio`
- `producto`
- `plan_interes`
- `mensaje`
- `estado`
- `origen`
- `leida`

## Operaciones minimas que debe soportar el admin

### Listar pendientes

```sql
select
  id,
  created_at,
  nombre,
  email,
  telefono,
  producto,
  plan_interes,
  mensaje,
  leida,
  estado
from public.solicitudes_demo
where estado = 'pendiente'
order by created_at desc;
```

### Marcar como leida o contactada

```sql
update public.solicitudes_demo
set
  leida = true,
  estado = 'contactado'
where id = :id;
```

### Marcar demo agendada

```sql
update public.solicitudes_demo
set estado = 'demo_agendada'
where id = :id;
```

## Recomendacion de arquitectura

- Backend propio con Node.js, Python, FastAPI, Flask, Express o equivalente.
- `service_role` en `.env` o secret manager.
- Endpoints protegidos para listar y actualizar.
- Auditoria basica de cambios de estado.

## Checklist de integracion

1. Leer solicitudes pendientes.
2. Mostrar detalle completo de cada solicitud.
3. Permitir marcar `leida`.
4. Permitir cambiar `estado`.
5. Mantener `service_role` fuera del repositorio publico.
