const {
  generateWerkzeugPasswordHash,
  verifyWerkzeugPassword,
  supabaseFetch,
  parseJson
} = require("./portal-login-vendedor");

function isSessionExpired(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) || time <= Date.now();
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
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
        body: JSON.stringify({ error: "Completa todos los campos para continuar." })
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "La nueva contraseña y su confirmación deben coincidir." })
      };
    }

    if (newPassword === currentPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "La nueva contraseña debe ser distinta de la actual." })
      };
    }

    const sessionRows = await supabaseFetch(
      `/rest/v1/portal_vendedor_sessions?select=id,vendedor_id,session_token,expires_at&session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`
    );
    const session = Array.isArray(sessionRows) ? sessionRows[0] : null;

    if (!session || isSessionExpired(session.expires_at)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "La sesión no es válida o ya venció." })
      };
    }

    const vendorRows = await supabaseFetch(
      `/rest/v1/vendedores?select=id,codigo_vendedor,nombre,apellido,activo,es_admin,cobra_comision,password_hash,password_change_required&id=eq.${encodeURIComponent(session.vendedor_id)}&limit=1`
    );
    const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;

    if (!vendor || !vendor.activo) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "La sesión no es válida o ya venció." })
      };
    }

    if (!verifyWerkzeugPassword(currentPassword, vendor.password_hash)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "La contraseña actual no es válida." })
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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
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
      body: JSON.stringify({ error: "No pudimos actualizar la contraseña." })
    };
  }
};
