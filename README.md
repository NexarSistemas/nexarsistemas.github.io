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

- `CNAME` declara `nexarsistemas.com.ar` como dominio canónico de GitHub Pages.
- `robots.txt` y `sitemap.xml` usan el dominio canónico.
- Los enlaces internos son relativos para funcionar en ambos hosts.
- Las páginas del portal requieren Netlify Functions. Si se abren desde `nexarsistemas.github.io`, `vendedores/js/portal-host.js` conserva ruta y parámetros y las lleva a `https://nexarsistemas.com.ar`, donde las Functions están disponibles.
- No se modificaron DNS, variables remotas ni configuración externa de Netlify desde este repositorio.

## Solicitudes de contacto y demo con Supabase

El formulario público registra solicitudes en `public.solicitudes_demo` o `public.solicitudes_soporte`, según el tipo de consulta, mediante `assets/js/solicitud-demo.js`.

El frontend usa únicamente:

- `SUPABASE_URL` pública
- `SUPABASE_ANON_KEY` pública

La seguridad depende de RLS:

- permitir solo los `INSERT` públicos necesarios;
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

Nexar Admin consume estas solicitudes desde un backend seguro. El contrato de tablas y estados no se modifica desde la landing.

## Retornos de Mercado Pago

Las tres URLs públicas y sus query strings se conservan:

- `mercadopago-exito.html`
- `mercadopago-pendiente.html`
- `mercadopago-fallo.html`

`js/mercadopago-success.js` conserva los parámetros y aliases existentes:

- `status` / `collection_status`
- `payment_id` / `collection_id`
- `merchant_order_id`
- `external_reference`
- `preference_id`

La presentación distingue aprobado, pendiente, rechazado, fallido, cancelado y error técnico. Si no llegan identificadores, se muestra una advertencia visual sin reemplazar el estado predeterminado de la URL de retorno. No se modificaron URLs, redirecciones, webhooks ni contratos con `nexar-pagos`.

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
- parámetros contractuales de Mercado Pago;
- IDs funcionales del portal.

Si se modifican Functions, ejecutar además el test de sesión y `netlify dev`. El rediseño actual no modifica Functions ni contratos server-side.
