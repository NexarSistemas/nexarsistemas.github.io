# Nexar Sistemas Landing

Landing estatica para `nexarsistemas.github.io`, compatible con GitHub Pages.

## Solicitudes de demo con Supabase

La landing ahora registra solicitudes en la tabla `public.solicitudes_demo` de Supabase.

Puntos clave:

- el frontend usa solo `SUPABASE_URL` publica y `SUPABASE_ANON_KEY` publica
- la seguridad depende de RLS
- no debe existir `SELECT` publico sobre `solicitudes_demo`
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en frontend

## Archivos principales

- `index.html`
- `css/styles.css`
- `js/main.js`
- `assets/js/solicitud-demo.js`
- `assets/js/supabase-config.js`
- `assets/js/supabase-config.example.js`
- `docs/supabase_solicitudes_demo.sql`
- `docs/solicitudes-demo.md`
- `docs/contrato_nexar_admin_solicitudes_demo.md`

## Setup rapido

### 1. Ejecutar SQL en Supabase

Ejecuta `docs/supabase_solicitudes_demo.sql` desde el `SQL Editor` del proyecto.

### 2. Configurar archivo publico para GitHub Pages

Este repo usa la opcion recomendada para una landing publica: `assets/js/supabase-config.js` versionado.

Completa este archivo con:

```js
window.NEXAR_SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_SUPABASE_ANON_KEY_AQUI"
};
```

No coloques una `service_role` ahi.

### 3. Probar local

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

### 4. Probar en Supabase

1. Abre el formulario en la landing.
2. Envia una solicitud.
3. Verifica que aparezca en `public.solicitudes_demo`.

## Integracion con Nexar Admin

Nexar Admin debe conectarse mediante backend seguro.

- `service_role` solo en variable de entorno del admin/backend
- listar solicitudes pendientes
- marcar `leida`
- actualizar `estado` a `contactado`, `demo_agendada` u otro flujo interno

Mas detalle en `docs/contrato_nexar_admin_solicitudes_demo.md`.

## Seguridad

- `anon key` publica: si
- `service_role` en frontend: no
- `RLS` habilitado: obligatorio
- `SELECT` publico: no

## Comando local recomendado

```bash
python -m http.server 8000
```
