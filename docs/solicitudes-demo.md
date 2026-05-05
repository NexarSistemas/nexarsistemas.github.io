# Solicitudes de Demo con Supabase

## Resumen

La landing envia solicitudes del formulario de contacto a `public.solicitudes_demo` en Supabase usando `fetch` contra la REST API. El frontend usa solo la URL publica del proyecto y la `anon key` publica.

La seguridad depende de:

- RLS habilitado en la tabla.
- Una policy que permita solo `INSERT` para `anon`.
- Esa policy debe aplicar a `public.solicitudes_demo`.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- No habilitar `SELECT` publico sobre `solicitudes_demo`.

## Archivos involucrados

- `index.html`
- `assets/js/supabase-config.js`
- `assets/js/supabase-config.example.js`
- `assets/js/solicitud-demo.js`
- `docs/supabase_solicitudes_demo.sql`

## Paso 1: ejecutar SQL en Supabase

1. Abri el proyecto en Supabase.
2. Entra a `SQL Editor`.
3. Ejecuta el contenido de `docs/supabase_solicitudes_demo.sql`.

Ese script:

- crea la tabla `public.solicitudes_demo`
- habilita RLS
- crea la policy de `INSERT` para `anon`
- crea indices utiles

## Paso 2: configurar frontend para GitHub Pages

La landing publica necesita que `assets/js/supabase-config.js` exista en produccion, por eso este repositorio usa la opcion recomendada para GitHub Pages: **archivo versionado con URL publica y anon key publica**.

Usa solo:

- `SUPABASE_URL` publica
- `SUPABASE_ANON_KEY` publica

Nunca uses:

- `SUPABASE_SERVICE_ROLE_KEY`
- `service_role` ni `serviceRoleKey`

Edita `assets/js/supabase-config.js` y reemplaza los placeholders:

```js
window.NEXAR_SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_ANON_PUBLIC_KEY"
};
```

## Paso 3: probar local

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

## Paso 4: probar extremo a extremo

1. Abri la landing.
2. Completa nombre y email.
3. Envia la solicitud.
4. Verifica en Supabase que aparezca una fila en `solicitudes_demo`.
5. Confirma que los valores por defecto sean:
   - `estado = 'pendiente'`
   - `origen = 'web'`
   - `leida = false`

## Comportamiento actual del formulario

- espera `DOMContentLoaded`
- no rompe la pagina si el formulario no existe
- valida `nombre` y `email`
- usa fallbacks por `id` o `name`
- no envia `undefined`
- deshabilita el boton mientras envia
- limpia el formulario solo si el insert fue exitoso
- muestra mensajes de estado en `#solicitud-demo-status`

## Integracion con Nexar Admin

Nexar Admin no debe leer esta tabla desde frontend. Debe hacerlo desde un backend seguro.

Recomendaciones:

- GitHub Pages usa anon public key
- guardar `SUPABASE_SERVICE_ROLE_KEY` solo en Nexar Admin o backend seguro
- listar solicitudes pendientes
- marcar solicitudes como `leida`
- actualizar `estado` a valores como `contactado` o `demo_agendada`

## Seguridad

- La `anon key` es publica y puede ir en GitHub Pages.
- Eso no reemplaza RLS.
- `RLS` debe permitir solo `INSERT` publico en `solicitudes_demo`.
- La tabla no debe tener `SELECT` publico.
- `service_role` jamas debe aparecer en `.js`, `.html` ni commits del frontend.
- `service_role` jamas debe vivir en este repositorio publico.
