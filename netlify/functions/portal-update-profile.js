const { supabaseFetch, parseJson } = require("./portal-login-vendedor");

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
    password_change_required: vendor.password_change_required !== false
  };
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
    `/rest/v1/portal_vendedor_sessions?select=id,vendedor_id,session_token,expires_at&session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`
  );
  const session = Array.isArray(sessionRows) ? sessionRows[0] : null;
  if (!session) {
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
  try {
    const body = event.httpMethod === "POST" ? parseJson(event.body) : {};
    if (event.httpMethod === "POST") {
      const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_UPDATE_FIELDS.has(key));
      if (unexpectedKeys.length) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Se recibieron campos no permitidos." })
        };
      }
    }

    const sessionToken = getSessionToken(event, body);

    if (!sessionToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "La sesión no es válida o ya venció." })
      };
    }

    const vendor = await resolveVendorFromSession(sessionToken);
    if (!vendor) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "La sesión no es válida o ya venció." })
      };
    }

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          vendedor: buildVendorPayload(vendor)
        })
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo no permitido." })
      };
    }

    const email = normalizeEmail(body.email);
    const telefono = normalizeText(body.telefono);
    const aliasCbu = normalizeText(body.alias_cbu);

    if (email && !EMAIL_RE.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Si informás email, debe tener un formato válido." })
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
        "Content-Type": "application/json"
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
      body: JSON.stringify({ error: "No pudimos actualizar el perfil." })
    };
  }
};
