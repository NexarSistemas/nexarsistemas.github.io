# Rebranding inicial a Nexar Comercio

Fecha: 2026-05-12
Rama de trabajo: `feature/rebranding-nexar-comercio`

## Objetivo

Iniciar la transición visual y comercial desde `Nexar Tienda` hacia `Nexar Comercio`, manteniendo `Nexar Sistemas` como empresa/desarrollador y sin tocar nombres técnicos internos, rutas ni integraciones.

## Alcance aplicado

- Actualización de títulos HTML hacia `Nexar Comercio`.
- Rebranding visible en `index.html`.
- Rebranding visible en `nexar-tienda.html` como base principal de `Nexar Comercio`.
- Rebranding visible en `nexar-almacen.html` como `Nexar Comercio — modo Almacén`.
- Ajuste de textos comerciales y CTAs.
- Actualización de opciones del formulario de contacto.
- Títulos de páginas de Mercado Pago alineados con `Nexar Comercio`.
- Comentarios `TODO` para favicon y branding definitivo.
- Normalización de codificación para evitar mojibake en acentos e íconos.

## Archivos tocados

- `index.html`
- `nexar-tienda.html`
- `nexar-almacen.html`
- `mercadopago-exito.html`
- `mercadopago-pendiente.html`
- `mercadopago-fallo.html`

## Decisiones tomadas

- La marca visible principal pasa a ser `Nexar Comercio`.
- `Nexar Almacén` deja de mostrarse como producto separado y se presenta como `modo Almacén`.
- `Nexar Tienda` deja de ser la marca principal visible y pasa a presentarse como `modo Tienda` cuando hace falta aclararlo.
- `Nexar Sistemas` se mantiene visible como empresa en títulos, pies y referencias institucionales.
- Se reutilizan logos e imágenes actuales de forma temporal.

## Lo que no se tocó

- Variables técnicas internas.
- URLs actuales.
- Nombres de archivos.
- Backend.
- Integraciones externas.
- Assets gráficos físicos.
- `main`.

## Pendiente antes de darlo por cerrado

- Definir logo principal de `Nexar Comercio`.
- Definir favicon final.
- Revisar y adaptar `nexar-kit.html` cuando se cierre la línea comercial definitiva.
- Decidir si Mercado Pago debe mostrar también `Nexar Comercio` en el encabezado visual y no solo en el `<title>`.
- Hacer una segunda pasada de copy comercial cuando quede definida la narrativa final del producto unificado.
