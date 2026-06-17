const crypto = require("crypto");

const SESSION_DURATION_HOURS = 12;

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function parseJson(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

function timingSafeEqualHex(leftHex, rightHex) {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function verifyScryptHash(password, storedHash) {
  const parts = storedHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const methodBits = parts[0].split(":");
  if (methodBits.length !== 4 || methodBits[0] !== "scrypt") {
    return false;
  }

  const cost = Number(methodBits[1]);
  const blockSize = Number(methodBits[2]);
  const parallelization = Number(methodBits[3]);
  const salt = parts[1];
  const expectedHex = parts[2];
  const minimumMaxmem = 64 * 1024 * 1024;

  if (!cost || !blockSize || !parallelization || !salt || !expectedHex) {
    return false;
  }

  const maxmem = Math.max(
    minimumMaxmem,
    (128 * cost * blockSize) + (128 * blockSize * parallelization) + (1024 * 1024)
  );

  const derived = crypto.scryptSync(password, salt, expectedHex.length / 2, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem
  });

  return timingSafeEqualHex(derived.toString("hex"), expectedHex);
}

function verifyPbkdf2Hash(password, storedHash) {
  const parts = storedHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const methodBits = parts[0].split(":");
  if (methodBits.length !== 3 || methodBits[0] !== "pbkdf2") {
    return false;
  }

  const digest = methodBits[1];
  const iterations = Number(methodBits[2]);
  const salt = parts[1];
  const expectedHex = parts[2];

  if (!digest || !iterations || !salt || !expectedHex) {
    return false;
  }

  const derived = crypto.pbkdf2Sync(password, salt, iterations, expectedHex.length / 2, digest);
  return timingSafeEqualHex(derived.toString("hex"), expectedHex);
}

function verifyWerkzeugPassword(password, storedHash) {
  if (!storedHash || !password) {
    return false;
  }

  if (storedHash.startsWith("scrypt:")) {
    return verifyScryptHash(password, storedHash);
  }

  if (storedHash.startsWith("pbkdf2:")) {
    return verifyPbkdf2Hash(password, storedHash);
  }

  return false;
}

async function supabaseFetch(path, options = {}) {
  const baseUrl = (process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const portalSecret = (process.env.PORTAL_VENDOR_RPC_SECRET || "").trim();

  if (!baseUrl || !anonKey || !portalSecret) {
    throw new Error("Falta configurar SUPABASE_URL, SUPABASE_ANON_KEY o PORTAL_VENDOR_RPC_SECRET.");
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    "x-portal-secret": portalSecret,
    ...(options.headers || {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body
  });

  const responseText = await response.text();
  let responseData = null;

  if (responseText.trim()) {
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      const preview = responseText.slice(0, 240);
      throw new Error(`Supabase devolvio una respuesta no JSON (${response.status}): ${preview}`);
    }
  }

  if (!response.ok) {
    const detail =
      (responseData && (responseData.message || responseData.error || responseData.hint || responseData.error_description)) ||
      responseText.slice(0, 240) ||
      "";

    console.error("Supabase request failed:", {
      path,
      status: response.status,
      detail
    });

    throw new Error(detail || `Supabase respondio con estado ${response.status}.`);
  }

  if (response.status === 204) {
    return null;
  }

  return responseData;
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
    const codigo = normalizeCode(body.codigo_vendedor);
    const password = typeof body.password === "string" ? body.password : "";

    if (!codigo || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Datos incompletos." })
      };
    }

    const vendorRows = await supabaseFetch(
      `/rest/v1/vendedores?select=id,codigo_vendedor,nombre,apellido,activo,es_admin,cobra_comision,password_hash&codigo_vendedor=eq.${encodeURIComponent(codigo)}&limit=1`
    );
    const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;

    if (!vendor || !vendor.activo || !verifyWerkzeugPassword(password, vendor.password_hash)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Credenciales invalidas." })
      };
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

    await supabaseFetch("/rest/v1/portal_vendedor_sessions", {
      method: "POST",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        vendedor_id: vendor.id,
        codigo_vendedor: vendor.codigo_vendedor,
        session_token: sessionToken,
        expires_at: expiresAt
      })
    });

    await supabaseFetch(`/rest/v1/vendedores?id=eq.${encodeURIComponent(vendor.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        ultimo_login: new Date().toISOString()
      })
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session_token: sessionToken,
        expires_at: expiresAt,
        vendedor: {
          codigo_vendedor: vendor.codigo_vendedor,
          nombre: vendor.nombre,
          apellido: vendor.apellido,
          es_admin: Boolean(vendor.es_admin),
          cobra_comision: vendor.cobra_comision !== false
        }
      })
    };
  } catch (error) {
    console.error("Portal vendedor login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No pudimos iniciar sesion." })
    };
  }
};
