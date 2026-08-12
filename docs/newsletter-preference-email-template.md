# Template de email de confirmación de Novedades Nexar

La Edge Function remota `newsletter-preference` está desplegada en Supabase v4 y su fuente no está versionada en este repositorio. Aplicar este cambio solamente en el punto que arma el correo de confirmación de esa Function; no cambiar el remitente, asunto, URL canónica, token, hash, vencimiento de 60 minutos, rate limits ni la lógica de Resend.

Conservar el valor ya calculado para el enlace canónico de confirmación y colocarlo en `{{CANONICAL_CONFIRMATION_URL}}`. No reconstruir esa URL ni agregar parámetros nuevos.

## HTML a enviar

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#0b2239;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #dce5df;border-radius:16px;">
            <tr>
              <td style="padding:36px 32px 12px;font-size:14px;font-weight:700;letter-spacing:.6px;color:#16805a;">NEXAR SISTEMAS</td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-size:28px;line-height:34px;font-weight:700;">Confirmá tu solicitud</td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;font-size:16px;line-height:24px;color:#52606d;">Recibimos una solicitud para actualizar tu preferencia de Novedades Nexar. Revisala y confirmala para aplicar el cambio.</td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <a href="{{CANONICAL_CONFIRMATION_URL}}" style="display:inline-block;padding:14px 20px;background:#16805a;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Revisar y confirmar solicitud</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;font-size:13px;line-height:20px;color:#6b7785;">Este enlace vence en 60 minutos. Si no solicitaste este cambio, podés ignorar este correo.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Texto alternativo

```text
Nexar Sistemas

Recibimos una solicitud para actualizar tu preferencia de Novedades Nexar.
Revisala y confirmala aquí:
{{CANONICAL_CONFIRMATION_URL}}

Este enlace vence en 60 minutos. Si no solicitaste este cambio, podés ignorar este correo.
```
