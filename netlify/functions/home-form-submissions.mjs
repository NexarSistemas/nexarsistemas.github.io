const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function validateLength(value, label, minimum, maximum) {
  if (value.length < minimum || value.length > maximum) {
    return `${label} debe tener entre ${minimum} y ${maximum} caracteres.`;
  }

  return "";
}

function getRateLimitStore() {
  if (!getRateLimitStore.store) {
    getRateLimitStore.store = new Map();
  }

  return getRateLimitStore.store;
}

function isRateLimited(clientIp) {
  const now = Date.now();
  const store = getRateLimitStore();
  const timestamps = (store.get(clientIp) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    store.set(clientIp, timestamps);
    return true;
  }

  timestamps.push(now);
  store.set(clientIp, timestamps);
  return false;
}

function getClientIp(request, context) {
  const forwarded = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for") || "";
  return context.ip || forwarded.split(",")[0].trim() || "unknown";
}

function getSupabaseConfig() {
  const supabaseUrl = String(Netlify.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
  const serviceRoleKey = String(Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { supabaseUrl, serviceRoleKey };
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Supabase respondio con estado ${response.status}.`);
    error.code = payload?.code;
    throw error;
  }

  return payload;
}

async function alreadyExists(config, tableName, email) {
  const rows = await supabaseRequest(
    config,
    `/rest/v1/${tableName}?select=id&email=ilike.${encodeURIComponent(email)}&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function insertIdempotently(config, tableName, email, payload) {
  if (await alreadyExists(config, tableName, email)) {
    return { duplicate: true };
  }

  try {
    await supabaseRequest(config, `/rest/v1/${tableName}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
    return { duplicate: false };
  } catch (error) {
    if (error.code === "23505") {
      return { duplicate: true };
    }
    throw error;
  }
}

function parseSellerApplication(body) {
  const nombre = normalizeText(body.nombre);
  const email = normalizeEmail(body.email);
  const whatsapp = normalizeText(body.whatsapp);
  const localidad = normalizeText(body.localidad_provincia);
  const mensaje = normalizeText(body.mensaje);

  const validations = [
    validateLength(nombre, "Nombre y apellido", 2, 200),
    validateLength(email, "Email", 4, 254),
    validateLength(whatsapp, "WhatsApp", 5, 60),
    validateLength(localidad, "Localidad / provincia", 2, 200)
  ];
  const failure = validations.find(Boolean);
  if (failure) throw new Error(failure);
  if (!EMAIL_RE.test(email)) throw new Error("Ingresá un email válido.");
  if (mensaje.length > 1000) throw new Error("Mensaje puede tener como máximo 1000 caracteres.");

  return {
    email,
    payload: {
      nombre,
      email,
      whatsapp,
      localidad_provincia: localidad,
      mensaje: mensaje || null,
      estado: "pendiente",
      origen: "web"
    }
  };
}

function parseNewsletterSubscription(body) {
  const email = normalizeEmail(body.email);
  const emailLengthError = validateLength(email, "Email", 4, 254);
  if (emailLengthError) throw new Error(emailLengthError);
  if (!EMAIL_RE.test(email)) throw new Error("Ingresá un email válido.");
  if (body.consentimiento !== true) throw new Error("Necesitamos tu consentimiento para enviarte novedades.");

  return { email, payload: { email, consentimiento: true, origen: "web" } };
}

export default async function handler(request, context) {
  if (request.method !== "POST") {
    return json({ error: "Metodo no permitido." }, 405);
  }

  if (isRateLimited(getClientIp(request, context))) {
    return json({ error: "Recibimos muchos intentos. Esperá unos minutos antes de volver a intentar." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "La solicitud no tiene un formato válido." }, 400);
  }

  try {
    const config = getSupabaseConfig();
    if (body?.tipo === "solicitud_vendedor") {
      const application = parseSellerApplication(body);
      const result = await insertIdempotently(config, "solicitudes_vendedores", application.email, application.payload);
      return json({ success: true, duplicate: result.duplicate });
    }
    if (body?.tipo === "suscripcion_novedades") {
      const subscription = parseNewsletterSubscription(body);
      const result = await insertIdempotently(config, "suscripciones_novedades", subscription.email, subscription.payload);
      return json({ success: true, duplicate: result.duplicate });
    }
    return json({ error: "Tipo de formulario no válido." }, 400);
  } catch (error) {
    console.error("Home forms submission failed:", { detail: error.message || "unknown" });
    return json({ error: error.message || "No pudimos procesar la solicitud." }, 400);
  }
}
