const { supabaseFetch, parseJson } = require("./portal-login-vendedor");
const {
  getRequestOrigin,
  handleOptions,
  rejectDisallowedOrigin,
  withCorsHeaders
} = require("../lib/cors.cjs");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 500;
const GENERIC_SUCCESS_MESSAGE = "Si los datos son correctos, registramos tu solicitud.";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

exports.handler = async function handler(event) {
  const allowedMethods = ["POST", "OPTIONS"];
  const origin = getRequestOrigin(event);

  if (event.httpMethod === "OPTIONS") {
    return handleOptions(event, allowedMethods);
  }

  const corsRejection = rejectDisallowedOrigin(event, allowedMethods);
  if (corsRejection) {
    return corsRejection;
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
      body: JSON.stringify({ error: "Metodo no permitido." })
    };
  }

  try {
    const body = parseJson(event.body);
    const codigoVendedor = normalizeText(body.codigo_vendedor).toUpperCase();
    const email = normalizeEmail(body.email);
    const telefono = normalizeText(body.telefono);
    const mensaje = normalizeText(body.mensaje);
    let vendedorId = null;

    if (!codigoVendedor) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Ingresá tu código vendedor para continuar." })
      };
    }

    if (!email && !telefono) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Ingresá email o teléfono para continuar." })
      };
    }

    if (email && !EMAIL_RE.test(email)) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Si informás email, debe tener un formato válido." })
      };
    }

    if (mensaje.length > MAX_MESSAGE_LENGTH) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "El mensaje es demasiado largo." })
      };
    }

    try {
      const vendorRows = await supabaseFetch(
        `/rest/v1/vendedores?select=id,codigo_vendedor,activo&codigo_vendedor=eq.${encodeURIComponent(codigoVendedor)}&activo=eq.true&limit=1`
      );
      const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;
      vendedorId = vendor ? vendor.id : null;
    } catch (error) {
      console.error("Portal vendedor password recovery vendor lookup error:", {
        codigo_vendedor: codigoVendedor,
        detail: error.message || "unknown"
      });
    }

    try {
      await supabaseFetch("/rest/v1/portal_password_recovery_requests", {
        method: "POST",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          codigo_vendedor: codigoVendedor,
          vendedor_id: vendedorId,
          email_contacto: email || null,
          telefono_contacto: telefono || null,
          mensaje: mensaje || null,
          estado: "pendiente"
        })
      });
    } catch (error) {
      console.error("Portal vendedor password recovery insert error:", {
        codigo_vendedor: codigoVendedor,
        has_email: Boolean(email),
        has_telefono: Boolean(telefono),
        detail: error.message || "unknown"
      });
    }

    return {
      statusCode: 200,
      headers: {
        ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
      },
      body: JSON.stringify({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE
      })
    };
  } catch (error) {
    console.error("Portal vendedor password recovery error:", error);
    return {
      statusCode: 200,
      headers: {
        ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
      },
      body: JSON.stringify({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE
      })
    };
  }
};
