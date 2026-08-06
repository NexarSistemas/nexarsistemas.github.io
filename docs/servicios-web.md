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

No se publican precios fijos. Cada proyecto requiere un presupuesto personalizado según alcance, secciones, contenido y funcionalidades.

La tarjeta de la página principal dirige al formulario existente mediante `#contacto`. El formulario incorpora:

- producto o servicio: `Diseño y desarrollo web`;
- tipo de consulta: `Solicitar presupuesto web`.

No se crea una página independiente en este MVP. Esta decisión evita publicar una ruta incompleta y mantiene un flujo directo hacia el contacto comercial.

## Validación

`tests/web-services.test.js` verifica:

- que la tarjeta y su contenido principal estén presentes;
- que el enlace de presupuesto apunte a un fragmento existente;
- que el formulario ofrezca las opciones específicas del servicio;
- que la hoja de estilos adicional exista y esté enlazada;
- que no se introduzca una ruta HTML inexistente para el servicio.

La prueba general `tests/public-site.test.js` continúa comprobando que los enlaces internos a archivos públicos existentes no estén rotos.
