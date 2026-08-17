# Inventario Inicial de Terceros

**Nexar Sistemas**

**Version:** 1.0.0  
**Fecha de vigencia:** 30/06/2026  
**Estado:** Inventario inicial

Este documento funciona como inventario base de dependencias, frameworks, servicios y plataformas de terceros que pueden estar presentes en productos del ecosistema Nexar.

No implica que todos los elementos listados esten presentes en todos los productos. Cada repositorio o producto debe revisar este inventario antes de distribuir, publicar o declarar dependencias de terceros en su propia documentacion.

## 1. Python

- Uso posible: lenguaje base para aplicaciones, servicios, scripts y automatizaciones.
- Revision pendiente por producto: version exacta, dependencias transitivas, licencias de paquetes y distribucion final.

## 2. Flask

- Uso posible: framework web para paneles, APIs, backends o servicios administrativos.
- Revision pendiente por producto: version exacta, extensiones utilizadas y obligaciones de licencia asociadas a cada dependencia.

## 3. Supabase

- Uso posible: autenticacion, base de datos, almacenamiento, APIs, funciones u operaciones cloud.
- Revision pendiente por producto: servicios efectivamente utilizados, flujos de datos, region, terminos vigentes y tratamiento de datos asociado.

## 4. Mercado Pago

- Uso posible: cobros, suscripciones, checkouts, links de pago, conciliaciones, webhooks o reportes operativos.
- Revision pendiente por producto: modalidad integrada, condiciones comerciales aplicables y documentacion de pagos relevante.

## 5. Netlify

- Uso posible: hosting, despliegue, sitios, paneles o frontend publicado.
- Revision pendiente por producto: entornos desplegados, configuraciones de dominio, formularios, funciones y terminos aplicables.

## 6. GitHub

- Uso posible: repositorios, control de versiones, issues, pull requests, acciones, paquetes o documentacion.
- Revision pendiente por producto: uso de GitHub Actions, Pages, Packages u otros servicios complementarios.

## 7. Tailwind CSS

- Uso posible: framework de estilos para interfaces web, paneles y documentacion.
- Revision pendiente por producto: version exacta, plugins utilizados y artefactos distribuidos.

## 8. DaisyUI

- Uso posible: componentes visuales sobre Tailwind para interfaces administrativas o comerciales.
- Revision pendiente por producto: version exacta, alcance real de uso y dependencia respecto del frontend final.

## 9. LinkedIn

- Uso: insignia pública del perfil del fundador en la home de Nexar Sistemas.
- Recurso cargado en el navegador: `https://platform.linkedin.com/badges/js/profile.js`.
- Finalidad: renderizar el badge enlazado al perfil público de LinkedIn.
- Dependencia externa opcional: si el recurso falla o es bloqueado, la web conserva un fallback local y funcional con enlace al perfil.

## 10. Otros por completar

Este repositorio puede incorporar nuevos terceros a medida que se auditen productos Nexar especificos. Algunos ejemplos posibles:

- Servicios de correo.
- Hosting adicional.
- Bases de datos.
- APIs fiscales o comerciales.
- Herramientas de soporte.
- Librerias frontend y backend.
- Servicios de mensajeria o notificaciones.

## 11. Nota de distribucion

Antes de distribuir, vender, publicar o sincronizar documentacion en un producto Nexar, debe revisarse este inventario y completarse la declaracion real de terceros aplicable a ese producto especifico.
