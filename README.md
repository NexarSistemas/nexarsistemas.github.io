# Nexar Sistemas

Sitio público estático de Nexar Sistemas, compatible con GitHub Pages y Netlify.

- Dominio canónico: `https://nexarsistemas.com.ar`
- Espejo GitHub Pages: `https://nexarsistemas.github.io`
- Stack público: HTML, CSS y JavaScript sin proceso de build
- Functions del portal: Netlify Functions
- Datos públicos: Supabase REST/RPC con `anon key` y RLS

## Sistema visual

El diseño vigente reproduce el proyecto público de ChatGPT Sites `Nexar Sistemas`, versión 3, publicado originalmente en:

`https://nexar-sistemas-landing.rolojnb.chatgpt.site/`

La fuente oficial del proyecto se obtuvo mediante el repositorio de origen administrado por ChatGPT Sites. La implementación React/Next del sitio de referencia no se trasladó como dependencia: su composición, variables, tipografía, tarjetas, botones, fondos, responsive y jerarquía se adaptaron a la arquitectura estática existente en `css/site.css`.

Esto evita depender en producción del dominio de Sites y evita incorporar un framework o build innecesario. La única limitación deliberada es el uso de la pila tipográfica local del sistema en lugar de distribuir las fuentes internas del runtime de Sites.

La versión anterior al rediseño está respaldada, local y remotamente, en:

`backup/landing-before-chatgpt-site`

## Páginas públicas vigentes

- `index.html`: marca, productos, comparación, contacto y acceso vendedores
- `nexar-comercio.html`: producto, funciones, rubros y planes confirmados
- `nexar-finanzas.html`: producto, funciones y planes confirmados
- `mercadopago-exito.html`: retorno aprobado
- `mercadopago-pendiente.html`: retorno pendiente
- `mercadopago-fallo.html`: retorno rechazado, fallido, cancelado o con error
- `mercadopago-suscripcion.html`: agradecimiento posterior a una adhesión, sin afirmar que el primer cobro esté acreditado
- `confirmar-novedades.html`: confirmación explícita de altas y bajas de Novedades Nexar mediante un enlace seguro
- `vendedores/login.html`: acceso al portal
- `vendedores/recuperar.html`: solicitud de recuperación
- `vendedores/dashboard.html`: dashboard autenticado
- `vendedores/perfil.html`: perfil y cambio de contraseña

`css/site.css` centraliza el sistema visual público. `vendedores/css/portal-vendedor.css` agrega únicamente los componentes específicos del portal.

Para incorporar una aplicación pública futura se agrega una tarjeta siguiendo el patrón `.product-card` y una página de producto que reutilice header, tokens, botones, secciones y footer. No se requiere un CMS ni otro framework.

## Contactos oficiales

- Ventas: `ventas@nexarsistemas.com.ar`
- Soporte: `soporte@nexarsistemas.com.ar`
- Portal y vendedores: `vendedores@nexarsistemas.com.ar`
- Teléfono, WhatsApp y referencia para Telegram: `+5492646616948`

No se publica un enlace de Telegram porque no existe un nombre de usuario oficial verificable. No debe inventarse.

## Ejecución local

```bash
python3 -m http.server 8000
```

Abrir:

`http://localhost:8000/`

No es necesario instalar dependencias para la landing. Las pruebas existentes se ejecutan con Node:

```bash
node --test tests/portal-vendedor-session.test.js
node tests/public-site.test.js
```

## GitHub Pages, Netlify y dominio

- `nexarsistemas.com.ar` es el dominio canónico y se sirve desde Netlify; el DNS no apunta a GitHub Pages.
- El repositorio no debe incluir un archivo `CNAME` para `nexarsistemas.com.ar`, porque GitHub Pages no administra ese dominio.
- `nexarsistemas.github.io` queda como publicación independiente de GitHub Pages y no sustituye al dominio canónico para los retornos de pagos, el portal ni las Netlify Functions.
- `_redirects` define las rutas públicas de juegos: `/Tetris/` se sirve localmente desde el deploy de Netlify mediante `Tetris/index.html`, mientras `/nexar-crucigrama/` redirige con `302` a la producción aislada de Vercel para no compartir origen ni sesión con el portal de vendedores.
- `robots.txt` y `sitemap.xml` usan el dominio canónico.
- Los enlaces internos son relativos para funcionar en ambos hosts.
- El portal de vendedores usa Netlify Functions en rutas relativas `/.netlify/functions/...`. La lógica de host de `vendedores/js/portal-host.js` conserva ruta y parámetros y, si se carga desde `nexarsistemas.github.io`, redirige al dominio canónico `https://nexarsistemas.com.ar` para que las Functions queden servidas en la arquitectura correcta.
- No se modifican DNS, variables remotas ni configuración externa de Netlify desde este repositorio.

## Solicitudes de contacto, vendedores y novedades con Supabase

El formulario público registra solicitudes en `public.solicitudes_demo` o `public.solicitudes_soporte`, según el tipo de consulta, mediante `assets/js/solicitud-demo.js`. Los dos formularios nuevos de la home (postulación de vendedores y suscripción a novedades) envían sus datos únicamente a `/.netlify/functions/home-form-submissions`. La Netlify Function valida el payload, aplica rate limiting nativo de Netlify y, con credenciales solo server-side, consulta `public.find_home_submission_by_email` para identificar emails de forma exacta y case-insensitive antes de insertar o renovar consentimiento en `public.solicitudes_vendedores` y `public.suscripciones_novedades`.

El frontend usa únicamente:

- `SUPABASE_URL` pública
- `SUPABASE_ANON_KEY` pública

La seguridad de las tablas públicas depende de RLS:

- permitir solo los `INSERT` públicos necesarios para los flujos que sí los requieren;
- no habilitar `SELECT` público;
- nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en HTML, CSS, JavaScript o documentación pública.

Configuración pública versionada:

```js
window.NEXAR_SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_SUPABASE_ANON_KEY_AQUI"
};
```

Documentación relacionada:

- `docs/solicitudes-demo.md`
- `docs/supabase_solicitudes_demo.sql`
- `docs/contrato_nexar_admin_solicitudes_demo.md`
- `docs/supabase_home_vendedores_novedades.sql`

`private.notify_admin_email()` entrega los eventos de estas dos tablas a la Edge Function `notify-admin`: las postulaciones se notifican a `admin@nexarsistemas.com.ar` y las suscripciones se agregan de forma idempotente al segmento Resend `Novedades Nexar`. La clave de Resend sigue siendo un secreto de Supabase y no existe en el frontend.

La Function requiere en Netlify `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Ambas credenciales son exclusivamente server-side y nunca deben incorporarse al frontend. Para estos dos formularios, aplicar el SQL documentado: revoca cualquier `INSERT` o policy de `anon`, crea la RPC `public.find_home_submission_by_email` con ejecución solo para `service_role` y configura los triggers de notificación. El formulario de contacto conserva su acceso público existente.

Nexar Admin consume estas solicitudes desde un backend seguro. El contrato de tablas y estados no se modifica desde la landing.

## Retornos de Mercado Pago

Se mantienen tres retornos de pagos y un retorno específico para adhesiones:

- `mercadopago-exito.html`
- `mercadopago-pendiente.html`
- `mercadopago-fallo.html`
- `mercadopago-suscripcion.html`

`js/mercadopago-success.js` conserva los parámetros y aliases existentes:

- `status` / `collection_status`
- `payment_id` / `collection_id`
- `merchant_order_id`
- `external_reference`
- `preference_id`

La presentación de pagos distingue aprobado, pendiente, rechazado, fallido, cancelado y error técnico. Si no llegan identificadores, se muestra una advertencia visual sin reemplazar el estado predeterminado de la URL de retorno.

`mercadopago-suscripcion.html` se usa como sitio de redireccionamiento al completar una adhesión. Agradece la suscripción, aclara que la activación queda sujeta a validación y vuelve automáticamente al inicio después de 15 segundos. No interpreta el regreso como confirmación de que el primer cobro esté acreditado.

No se modifican webhooks ni contratos server-side con `nexar-pagos`.

## Portal de vendedores

Se preservan:

- login y contraseña temporal;
- sesión y expiración;
- recuperación;
- cambio de contraseña;
- perfil;
- dashboard;
- llamadas a Netlify Functions;
- llamadas Supabase protegidas;
- mensajes de éxito y error.

Variables server-side requeridas por las Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORTAL_VENDOR_RPC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` se usa únicamente dentro de Netlify Functions. Nunca debe copiarse al frontend.

## Validación automatizada

`tests/public-site.test.js` comprueba:

- existencia de las páginas principales;
- uso del CSS visual compartido;
- enlaces internos esenciales;
- contactos oficiales;
- ausencia de teléfonos anteriores conocidos;
- parámetros contractuales y retornos de Mercado Pago;
- redirección del retorno de suscripción;
- IDs funcionales del portal.

Los formularios nuevos de la home modifican Functions y su contrato server-side documentado. Para validarlos, ejecutar:

```bash
node --check assets/js/home-forms.js
node --check netlify/functions/home-form-submissions.mjs
node --test tests/home-form-submissions.test.mjs
node tests/public-site.test.js
netlify dev
git diff --check
```

`netlify dev` permite verificar localmente la integración de la Function con las variables server-side configuradas, sin exponerlas en el bundle público.
