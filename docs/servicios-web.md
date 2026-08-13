# Servicios web de Nexar Sistemas

## Objetivo

Incorporar en la página principal una oferta inicial de diseño y desarrollo web sin mezclarla con los planes de Nexar Comercio o Nexar Finanzas.

## Alcance comercial inicial

La oferta pública se dirige a:

- profesionales independientes y estudios, por ejemplo odontólogos, médicos, abogados, contadores, arquitectos e ingenieros;
- pequeños comercios;
- emprendimientos y prestadores de servicios.

Los formatos comunicados en esta primera etapa son:

- landing pages para promocionar servicios;
- sitios profesionales e institucionales;
- sitios simples para comercios y emprendimientos;
- diseño adaptable a celulares.

## Precios y contacto

La tarjeta principal de servicios web dirige a `#servicios-web`, donde se publican estos valores desde:

- Presencia Web — desde $250.000;
- Web Profesional — desde $450.000;
- Web Empresa — desde $590.000;
- Sistemas web a medida — solicitar presupuesto.

El mantenimiento web se ofrece en tres niveles:

- Básico — desde $20.000/mes;
- Profesional — desde $35.000/mes;
- Empresarial — desde $60.000/mes.

Los valores son desde: el precio final depende del alcance, funcionalidades, integraciones y servicios externos. Los sistemas web a medida se presupuestan individualmente.

Los paquetes de desarrollo web dirigen al formulario existente mediante `#contacto`. Los niveles de mantenimiento se muestran como información comercial y precios, sin CTA propio. El formulario incorpora:

- producto o servicio: `Diseño y desarrollo web`;
- tipo de consulta: `Solicitar presupuesto web`.

No se crea una página independiente en este MVP. Esta decisión evita publicar una ruta incompleta y mantiene un flujo directo hacia el contacto comercial.

## Validación

`tests/web-services.test.js` verifica:

- que la tarjeta y su contenido principal estén presentes;
- que los precios y niveles de mantenimiento publicados coincidan con la oferta actual;
- que la tarjeta principal enlace a `#servicios-web` y los presupuestos al contacto existente;
- que el formulario ofrezca las opciones específicas del servicio;
- que la hoja de estilos adicional exista y esté enlazada;
- que no se introduzca una ruta HTML inexistente para el servicio.

La misma prueba también cubre Nexar Play y sus accesos a Tetris Deluxe y Crucigrama Nexar.

La prueba general `tests/public-site.test.js` continúa comprobando que los enlaces internos a archivos públicos existentes no estén rotos.
