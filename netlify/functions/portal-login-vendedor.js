const crypto = require("crypto");
const {
  getRequestOrigin,
  handleOptions,
  rejectDisallowedOrigin,
  withCorsHeaders
} = require("../lib/cors.cjs");

const SESSION_DURATION_HOURS = 12;
const TEMP_SESSION_DURATION_MINUTES = 60;
const WERKZEUG_SCRYPT_N = 32768;
const WERKZEUG_SCRYPT_R = 8;
const WERKZEUG_SCRYPT_P = 1;
const WERKZEUG_SCRYPT_KEYLEN = 64;
const WERKZEUG_SALT_LENGTH = 16;

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function isPasswordChangeRequired(vendor) {
  return Boolean(vendor && vendor.password_change_required === true);
}

function getSessionDurationMs(vendor) {
  return isPasswordChangeRequired(vendor)
    ? TEMP_SESSION_DURATION_MINUTES * 60 * 1000
    : SESSION_DURATION_HOURS * 60 * 60 * 1000;
}

function maskToken(value) {
  const token = String(value || "");
  if (token.length <= 12) {
    return "[redacted]";
  }

  return `${token.slice(0, 6)}...${token.slice(-6)}`;
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

function getScryptMaxmem(cost, blockSize, parallelization) {
  const minimumMaxmem = 64 * 1024 * 1024;
  return Math.max(
    minimumMaxmem,
    (128 * cost * blockSize) + (128 * blockSize * parallelization) + (1024 * 1024)
  );
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

  if (!cost || !blockSize || !parallelization || !salt || !expectedHex) {
    return false;
  }

  const maxmem = getScryptMaxmem(cost, blockSize, parallelization);

  const derived = crypto.scryptSync(password, salt, expectedHex.length / 2, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem
  });

  return timingSafeEqualHex(derived.toString("hex"), expectedHex);
}

function generateWerkzeugSalt(length = WERKZEUG_SALT_LENGTH) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let salt = "";

  for (let index = 0; index < length; index += 1) {
    salt += alphabet[bytes[index] % alphabet.length];
  }

  return salt;
}

function generateWerkzeugPasswordHash(password) {
  const salt = generateWerkzeugSalt();
  const maxmem = getScryptMaxmem(WERKZEUG_SCRYPT_N, WERKZEUG_SCRYPT_R, WERKZEUG_SCRYPT_P);
  const derived = crypto.scryptSync(password, salt, WERKZEUG_SCRYPT_KEYLEN, {
    N: WERKZEUG_SCRYPT_N,
    r: WERKZEUG_SCRYPT_R,
    p: WERKZEUG_SCRYPT_P,
    maxmem
  });

  return `scrypt:${WERKZEUG_SCRYPT_N}:${WERKZEUG_SCRYPT_R}:${WERKZEUG_SCRYPT_P}$${salt}$${derived.toString("hex")}`;
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

function getSupabaseKey(keyName) {
  return String(process.env[keyName] || "").trim();
}

function getRequiredPortalConfig() {
  const config = {
    supabaseUrl: String(process.env.SUPABASE_URL || "").trim(),
    anonKey: getSupabaseKey("SUPABASE_ANON_KEY"),
    serviceRoleKey: getSupabaseKey("SUPABASE_SERVICE_ROLE_KEY"),
    portalSecret: String(process.env.PORTAL_VENDOR_RPC_SECRET || "").trim()
  };

  if (!config.supabaseUrl || !config.anonKey || !config.serviceRoleKey || !config.portalSecret) {
    throw new Error(
      "Falta configurar SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY o PORTAL_VENDOR_RPC_SECRET."
    );
  }

  return config;
}

async function supabaseFetch(path, options = {}) {
  const { supabaseUrl, anonKey, portalSecret } = getRequiredPortalConfig();
  const authKey = getSupabaseKey(options.keyName || "SUPABASE_ANON_KEY");

  if (!authKey) {
    throw new Error(`Falta configurar ${options.keyName || "SUPABASE_ANON_KEY"}.`);
  }

  const headers = {
    apikey: authKey,
    Authorization: `Bearer ${authKey}`,
    "Content-Type": "application/json",
    "x-portal-secret": portalSecret,
    ...(options.headers || {})
  };

  const response = await fetch(`${supabaseUrl}${path}`, {
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
    getRequiredPortalConfig();

    const body = parseJson(event.body);
    const codigo = normalizeCode(body.codigo_vendedor);
    const password = typeof body.password === "string" ? body.password : "";

    if (!codigo || !password) {
      return {
        statusCode: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Datos incompletos." })
      };
    }

    const vendorRows = await supabaseFetch(
      `/rest/v1/vendedores?select=id,codigo_vendedor,nombre,apellido,activo,es_admin,cobra_comision,password_hash,password_change_required&codigo_vendedor=eq.${encodeURIComponent(codigo)}&limit=1`
    );
    const vendor = Array.isArray(vendorRows) ? vendorRows[0] : null;

    if (!vendor || !vendor.activo || !verifyWerkzeugPassword(password, vendor.password_hash)) {
      return {
        statusCode: 401,
        headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
        body: JSON.stringify({ error: "Credenciales invalidas." })
      };
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionCreatedAt = new Date();
    const sessionDurationMs = getSessionDurationMs(vendor);
    const expiresAt = new Date(sessionCreatedAt.getTime() + sessionDurationMs).toISOString();
    const passwordChangeRequired = isPasswordChangeRequired(vendor);

    console.info("Portal vendedor login password policy:", {
      codigo_vendedor: vendor.codigo_vendedor,
      vendedor_id: vendor.id,
      password_change_required: passwordChangeRequired
    });

    try {
      await supabaseFetch("/rest/v1/portal_vendedor_sessions", {
        method: "POST",
        keyName: "SUPABASE_SERVICE_ROLE_KEY",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          vendedor_id: vendor.id,
          codigo_vendedor: vendor.codigo_vendedor,
          session_token: sessionToken,
          created_at: sessionCreatedAt.toISOString(),
          expires_at: expiresAt
        })
      });

      console.info("Portal vendedor session created:", {
        codigo_vendedor: vendor.codigo_vendedor,
        vendedor_id: vendor.id,
        token_hint: maskToken(sessionToken),
        expires_at: expiresAt,
        password_change_required: passwordChangeRequired
      });
    } catch (error) {
      console.error("Portal vendedor session creation failed:", {
        codigo_vendedor: vendor.codigo_vendedor,
        vendedor_id: vendor.id,
        session_created_at: sessionCreatedAt.toISOString(),
        session_expires_at: expiresAt,
        now: new Date().toISOString(),
        token_hint: maskToken(sessionToken),
        detail: error.message || "unknown"
      });

      return {
        statusCode: 500,
        headers: {
          ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
        },
        body: JSON.stringify({ error: "No pudimos crear la sesion del portal." })
      };
    }

    await supabaseFetch(`/rest/v1/vendedores?id=eq.${encodeURIComponent(vendor.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        ultimo_login: new Date().toISOString()
      })
    });

    if (passwordChangeRequired) {
      console.info("Portal vendedor redirecting to forced password change:", {
        codigo_vendedor: vendor.codigo_vendedor,
        vendedor_id: vendor.id,
        expires_at: expiresAt
      });
    }

    return {
      statusCode: 200,
      headers: {
        ...withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods)
      },
      body: JSON.stringify({
        session_token: sessionToken,
        expires_at: expiresAt,
        vendedor: {
          codigo_vendedor: vendor.codigo_vendedor,
          nombre: vendor.nombre,
          apellido: vendor.apellido,
          es_admin: Boolean(vendor.es_admin),
          cobra_comision: vendor.cobra_comision !== false,
          password_change_required: passwordChangeRequired
        }
      })
    };
  } catch (error) {
    console.error("Portal vendedor login error:", error);
    return {
      statusCode: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, allowedMethods),
      body: JSON.stringify({ error: "No pudimos iniciar sesion." })
    };
  }
};

exports.verifyWerkzeugPassword = verifyWerkzeugPassword;
exports.generateWerkzeugPasswordHash = generateWerkzeugPasswordHash;
exports.supabaseFetch = supabaseFetch;
exports.parseJson = parseJson;
exports.isPasswordChangeRequired = isPasswordChangeRequired;
exports.getSessionDurationMs = getSessionDurationMs;
exports.maskToken = maskToken;
