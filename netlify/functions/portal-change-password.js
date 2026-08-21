const {
  generateWerkzeugPasswordHash,
  verifyWerkzeugPassword,
  supabaseFetch,
  parseJson,
  maskToken
} = require("./portal-login-vendedor");
const {
  getRequestOrigin,
  handleOptions,
  rejectDisallowedOrigin,
  withCorsHeaders
} = require("./_cors.cjs");

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
  console.info("Portal vendedor password session validation:", {
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
    const sessionToken = typeof body.session_token === "string" ? body.session_token.trim() : "";
    const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
    const newPassword = typeof body.new_password === "string" ? body.new_password : "";
    const confirmPassword = typeof body.confirm_password === "string" ? body.confirm_password : "";

    if (!sessionToken || !currentPassword || !newPassword || !confirmPassword) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Completa todos los campos para continuar." })
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La nueva contrasena y su confirmacion deben coincidir." })
      };
    }

    if (newPassword === currentPassword) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La nueva contrasena debe ser distinta de la actual." })
      };
    }

    const sessionRows = await supabaseFetch(
      `/rest/v1/portal_vendedor_sessions?select=id,vendedor_id,session_token,created_at,expires_at&session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`,
      { keyName: "SUPABASE_SERVICE_ROLE_KEY" }
    );
    const session = Array.isArray(sessionRows) ? sessionRows[0] : null;

    const expiryStatus = getSessionExpiryStatus(session);
    logSessionValidation(session, expiryStatus, sessionToken);

    if (expiryStatus.expired) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La sesion no es valida o ya vencio." })
      };
    }

    const vendorRows = await supabaseFetch(
      `/rest/v1/vendedores?select=id,codigo_vendedor,nombre,apellido,activo,es_admin,cobra_comision,password_hash,password_change_required&id=eq.${encodeURIComponent(session.vendedor_id)}&limit=1`
    );
    const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;

    if (!vendor || !vendor.activo) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La sesion no es valida o ya vencio." })
      };
    }

    const passwordChangeRequired = vendor.password_change_required === true;
    console.info("Portal vendedor password change policy:", {
      codigo_vendedor: vendor.codigo_vendedor,
      vendedor_id: vendor.id,
      password_change_required: passwordChangeRequired
    });

    if (!verifyWerkzeugPassword(currentPassword, vendor.password_hash)) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "La contrasena actual no es valida." })
      };
    }

    await supabaseFetch(`/rest/v1/vendedores?id=eq.${encodeURIComponent(vendor.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        password_hash: generateWerkzeugPasswordHash(newPassword),
        password_change_required: false,
        ultimo_login: new Date().toISOString()
      })
    });

    console.info("Portal vendedor password updated:", {
      codigo_vendedor: vendor.codigo_vendedor,
      vendedor_id: vendor.id,
      password_change_required: false
    });

    return {
      statusCode: 200,
      headers: {
        ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
      },
      body: JSON.stringify({
        success: true,
        vendedor: {
          codigo_vendedor: vendor.codigo_vendedor,
          nombre: vendor.nombre,
          apellido: vendor.apellido,
          es_admin: Boolean(vendor.es_admin),
          cobra_comision: vendor.cobra_comision !== false,
          password_change_required: false
        }
      })
    };
  } catch (error) {
    console.error("Portal vendedor change password error:", error);
    return {
      statusCode: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
      body: JSON.stringify({ error: "No pudimos actualizar la contrasena." })
    };
  }
};

exports.getSessionExpiryStatus = getSessionExpiryStatus;
