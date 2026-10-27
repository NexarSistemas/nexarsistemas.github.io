# IndexNow

El sitio notifica a IndexNow solo después de que GitHub Pages registra un despliegue exitoso en el entorno `github-pages`. No modifica el despliegue, DNS, Netlify Functions, `robots.txt` ni `sitemap.xml`.

## Selección de URLs

El workflow compara el commit desplegado con su padre. Una URL se envía únicamente si cumple todas estas condiciones:

- está en `sitemap.xml` con el origen canónico `https://nexarsistemas.com.ar`;
- su archivo HTML existe, declara esa misma URL como canonical y no declara `noindex`;
- no está bloqueada para `User-agent: *` en `robots.txt`;
- su HTML cambió en ese commit, o fue incorporada al sitemap.

Los cambios en assets compartidos no hacen que se reenvíe todo el sitemap. Las rutas privadas del portal, los retornos de pago, páginas `noindex`, dominios externos y subdominios quedan fuera.

## Clave y verificación

La clave se publica en la raíz como `14b6140b-84c3-4548-9b01-4d27442e8b1d.txt`. Antes de contactar `https://api.indexnow.org/indexnow`, el workflow descarga `https://nexarsistemas.com.ar/14b6140b-84c3-4548-9b01-4d27442e8b1d.txt` y comprueba que coincida con el archivo versionado. Si no está disponible, el job falla sin enviar URLs.

El script no registra la clave ni el cuerpo de la respuesta. Registra el tamaño de cada lote y su código HTTP; `200` y `202` se consideran respuestas aceptadas por el protocolo.

## Validación controlada

El disparador manual de `Notificar IndexNow` exige un SHA completo y, por defecto, usa `dry_run=true`: calcula y registra el conjunto de URLs sin realizar solicitudes a IndexNow. Usar `dry_run=false` queda reservado para una comprobación consciente sobre un despliegue ya publicado.

## Verificación en Bing Webmaster Tools

1. Confirmar que `https://nexarsistemas.com.ar` está verificado en Bing Webmaster Tools y que el sitemap canónico continúa enviado.
2. Tras el merge y el despliegue, abrir el archivo de clave público y revisar el job `Notificar IndexNow` asociado al despliegue.
3. Confirmar que el job informó solo URLs esperadas y un HTTP `200` o `202` por lote. Un `202` implica aceptación pendiente de validación de la clave, no indexación confirmada.
4. Revisar posteriormente la cobertura y el estado de URL en Bing; IndexNow acelera el descubrimiento, pero no garantiza indexación.
