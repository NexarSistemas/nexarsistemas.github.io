# Estado operativo — 21 de julio de 2026

## Rol del repositorio

Sitio público de Nexar Sistemas, landing comercial, formularios de contacto/demo, retornos públicos de Mercado Pago y portal de vendedores mediante Netlify Functions.

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
