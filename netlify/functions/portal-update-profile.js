const { supabaseFetch, parseJson, maskToken } = require("./portal-login-vendedor");
const {
  getRequestOrigin,
  handleOptions,
  rejectDisallowedOrigin,
  withCorsHeaders
} = require("../lib/cors.cjs");

const ALLOWED_UPDATE_FIELDS = new Set(["session_token", "email", "telefono", "alias_cbu"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function buildVendorPayload(vendor) {
  return {
    codigo_vendedor: vendor.codigo_vendedor,
    nombre: vendor.nombre,
    apellido: vendor.apellido,
    dni: vendor.dni,
    email: vendor.email || "",
    telefono: vendor.telefono || "",
    alias_cbu: vendor.alias_cbu || "",
    es_admin: Boolean(vendor.es_admin),
    cobra_comision: vendor.cobra_comision !== false,
    password_change_required: vendor.password_change_required === true
  };
}

function getSessionExpiryStatus(session, nowMs = Date.now()) {
  if (!session) {
    return { expired: true, reason: "session_not_found", expiresAtMs: null, nowMs };
  }

  const expiresAtMs = Date.parse(session.expires_at || "");
  if (Number.isNaN(expiresAtMs)) {
    return { expired: true, reason: "invalid_expires_at", expiresAtMs: null, nowMs };
  }

  if (expiresAtMs <= nowMs) {
    return { expired: true, reason: "expires_at_lte_now", expiresAtMs, nowMs };
  }

  return { expired: false, reason: "valid", expiresAtMs, nowMs };
}

function logSessionValidation(session, status, sessionToken) {
  console.info("Portal vendedor profile session validation:", {
    session_id: session ? session.id : null,
    vendedor_id: session ? session.vendedor_id : null,
    token_hint: maskToken(sessionToken),
    session_created_at: session ? session.created_at : null,
    session_expires_at: session ? session.expires_at : null,
    now: new Date(status.nowMs).toISOString(),
    expired: status.expired,
    reason: status.reason
  });
}

function getSessionToken(event, body) {
  const queryToken = event.queryStringParameters && typeof event.queryStringParameters.session_token === "string"
    ? event.queryStringParameters.session_token
    : "";
  const bodyToken = body && typeof body.session_token === "string" ? body.session_token : "";
  return normalizeText(queryToken || bodyToken);
}

async function resolveVendorFromSession(sessionToken) {
  const sessionRows = await supabaseFetch(
    `/rest/v1/portal_vendedor_sessions?select=id,vendedor_id,session_token,created_at,expires_at&session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`,
    { keyName: "SUPABASE_SERVICE_ROLE_KEY" }
  );
  const session = Array.isArray(sessionRows) ? sessionRows[0] : null;
  const expiryStatus = getSessionExpiryStatus(session);
  logSessionValidation(session, expiryStatus, sessionToken);
  if (expiryStatus.expired) {
    return null;
  }

  const vendorRows = await supabaseFetch(
    `/rest/v1/vendedores?select=id,codigo_vendedor,nombre,apellido,dni,email,telefono,alias_cbu,activo,es_admin,cobra_comision,password_change_required&id=eq.${encodeURIComponent(session.vendedor_id)}&limit=1`
  );
  const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;
  if (!vendor || !vendor.activo) {
    return null;
  }

  return vendor;
}

exports.handler = async function handler(event) {
  const allowedMethods = ["GET", "POST", "OPTIONS"];
  const origin = getRequestOrigin(event);

  if (event.httpMethod === "OPTIONS") {
    return handleOptions(event, allowedMethods);
  }

  const corsRejection = rejectDisallowedOrigin(event, allowedMethods);
  if (corsRejection) {
    return corsRejection;
  }

  try {
    const body = event.httpMethod === "POST" ? parseJson(event.body) : {};
    if (event.httpMethod === "POST") {
      const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_UPDATE_FIELDS.has(key));
      if (unexpectedKeys.length) {
        return {
          statusCode: 400,
          headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
          body: JSON.stringify({ error: "Se recibieron campos no permitidos." })
        };
      }
    }

    const sessionToken = getSessionToken(event, body);

    if (!sessionToken) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La sesion no es valida o ya vencio." })
      };
    }

    const vendor = await resolveVendorFromSession(sessionToken);
    if (!vendor) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La sesion no es valida o ya vencio." })
      };
    }

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: {
          ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
        },
        body: JSON.stringify({
          vendedor: buildVendorPayload(vendor)
        })
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Metodo no permitido." })
      };
    }

    const email = normalizeEmail(body.email);
    const telefono = normalizeText(body.telefono);
    const aliasCbu = normalizeText(body.alias_cbu);

    if (email && !EMAIL_RE.test(email)) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Si informas email, debe tener un formato valido." })
      };
    }

    await supabaseFetch(`/rest/v1/vendedores?id=eq.${encodeURIComponent(vendor.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        email: email || null,
        telefono: telefono || null,
        alias_cbu: aliasCbu || null
      })
    });

    return {
      statusCode: 200,
      headers: {
        ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
      },
      body: JSON.stringify({
        success: true,
        vendedor: {
          ...buildVendorPayload(vendor),
          email,
          telefono,
          alias_cbu: aliasCbu
        }
      })
    };
  } catch (error) {
    console.error("Portal vendedor update profile error:", error);
    return {
      statusCode: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
      body: JSON.stringify({ error: "No pudimos actualizar el perfil." })
    };
  }
};
