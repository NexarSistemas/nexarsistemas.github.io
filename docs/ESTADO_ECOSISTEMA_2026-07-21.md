# Estado operativo — 21 de julio de 2026

## Rol del repositorio

Sitio público de Nexar Sistemas, landing comercial, formularios de contacto/demo, retornos públicos de Mercado Pago y portal de vendedores mediante Netlify Functions.

## Actualización visual 2026-07-27

- La landing, Nexar Comercio, Nexar Finanzas, retornos de Mercado Pago y portal de vendedores comparten el sistema visual estático de `css/site.css`.
- El diseño se obtuvo desde la fuente oficial del proyecto ChatGPT Sites `Nexar Sistemas` y se adaptó a HTML/CSS/JavaScript sin incorporar React, Next ni un build adicional.
- El dominio canónico público es `https://nexarsistemas.com.ar`; GitHub Pages se mantiene como espejo.
- La rama `backup/landing-before-chatgpt-site` conserva el estado anterior al rediseño.
- Las páginas del portal abiertas desde GitHub Pages se redirigen al mismo path bajo el dominio canónico para mantener disponibles las Netlify Functions.
- No se modificaron contratos con `nexar-admin`, `nexar-pagos`, Supabase o Netlify Functions.

## Estado confirmado

- Repositorio activo sobre GitHub Pages y Netlify.
- El frontend público usa Supabase `anon key` con RLS; nunca debe exponer `service_role`.
- Las solicitudes públicas de demo se registran en `public.solicitudes_demo` y son operadas desde Nexar Admin.
- Las páginas `mercadopago-exito.html`, `mercadopago-fallo.html` y `mercadopago-pendiente.html` son superficies de retorno para Nexar Pagos.
- El portal de vendedores mantiene autenticación y operaciones server-side en Netlify Functions.

## Límites y pendientes

- Los Issues abiertos del área Tetris son independientes del flujo comercial principal.
- Antes de destacar el juego públicamente deben resolverse licencia/atribución y usabilidad móvil.
- Este repositorio no contiene lógica de licencias ni debe emitir permisos de planes.

## Integraciones

- `nexar-admin`: consume solicitudes y gestiona vendedores.
- `nexar-pagos`: utiliza las páginas públicas de retorno.
- Supabase: almacenamiento compartido protegido por RLS.
- `nexar-ai-context`: fuente transversal de arquitectura y contratos del ecosistema.
