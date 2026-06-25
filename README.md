# Nexar Sistemas Landing

Landing estatica para `nexarsistemas.github.io`, compatible con GitHub Pages.

## Solicitudes de demo con Supabase

La landing ahora registra solicitudes en la tabla `public.solicitudes_demo` de Supabase.

Puntos clave:

- GitHub Pages usa solo `SUPABASE_URL` publica y `SUPABASE_ANON_KEY` publica
- la seguridad depende de RLS
- `RLS` debe permitir solo `INSERT` publico en `solicitudes_demo`
- no debe existir `SELECT` publico sobre `solicitudes_demo`
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en frontend
- `service_role` jamas va en este repo publico

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
  anonKey: "TU_ANON_PUBLIC_KEY"
};
```

No coloques una `service_role` ahi. GitHub Pages usa anon public key y nada mas.

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

- `service_role` solo en Nexar Admin o backend seguro
- listar solicitudes pendientes
- marcar `leida`
- actualizar `estado` a `contactado`, `demo_agendada` u otro flujo interno

Mas detalle en `docs/contrato_nexar_admin_solicitudes_demo.md`.

## Seguridad

- `anon key` publica: si
- `service_role` en frontend: no
- `service_role` en este repo publico: no
- `RLS` habilitado: obligatorio
- `RLS` con `INSERT` publico limitado a `solicitudes_demo`: obligatorio
- `SELECT` publico: no

## Netlify Functions

Variables requeridas para las functions del portal vendedor:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORTAL_VENDOR_RPC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` solo para operaciones server-side de sesion

Notas:

- `SUPABASE_SERVICE_ROLE_KEY` debe configurarse solo en variables de entorno de Netlify Functions.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en `assets/js`, `vendedores/js` ni ningun archivo publico del frontend.
- `SUPABASE_ANON_KEY` sigue siendo la key correcta para operaciones publicas protegidas por `RLS`.

## Comando local recomendado

```bash
python -m http.server 8000
```
