const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import corsModule from "./_cors.cjs";

const {
  getRequestOrigin,
  isAllowedOrigin,
  withCorsHeaders
} = corsModule;

class ValidationError extends Error {}

export const config = {
  path: "/.netlify/functions/home-form-submissions",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 5,
    windowSize: 180
  }
};

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

async function findExistingByEmail(config, tableName, email) {
  const rows = await supabaseRequest(
    config,
    "/rest/v1/rpc/find_home_submission_by_email",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ p_table: tableName, p_email: email })
    }
  );
  return Array.isArray(rows)
    ? rows.find((row) => normalizeEmail(row?.email) === email) || null
    : null;
}

async function insertIdempotently(config, tableName, email, payload) {
  if (await findExistingByEmail(config, tableName, email)) {
    return;
  }

  try {
    await supabaseRequest(config, `/rest/v1/${tableName}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

async function patchNewsletterById(config, id, payload) {
  await supabaseRequest(config, `/rest/v1/suscripciones_novedades?id=eq.${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload)
  });
}

async function renewNewsletterSubscription(config, subscription) {
  const existing = await findExistingByEmail(config, "suscripciones_novedades", subscription.email);
  if (existing) {
    await patchNewsletterById(config, existing.id, { consentimiento: true, origen: "web" });
    return;
  }

  try {
    await supabaseRequest(config, "/rest/v1/suscripciones_novedades", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(subscription.payload)
    });
  } catch (error) {
    if (error.code !== "23505") throw error;

    // Otra solicitud pudo crear la fila entre la consulta y el INSERT. Volvemos
    // a localizarla de forma case-insensitive y actualizamos por su ID real.
    const racedExisting = await findExistingByEmail(config, "suscripciones_novedades", subscription.email);
    if (!racedExisting) {
      throw new Error("No se pudo localizar la suscripción existente.");
    }
    await patchNewsletterById(config, racedExisting.id, { consentimiento: true, origen: "web" });
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
  if (failure) throw new ValidationError(failure);
  if (!EMAIL_RE.test(email)) throw new ValidationError("Ingresá un email válido.");
  if (mensaje.length > 1000) throw new ValidationError("Mensaje puede tener como máximo 1000 caracteres.");

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
  if (emailLengthError) throw new ValidationError(emailLengthError);
  if (!EMAIL_RE.test(email)) throw new ValidationError("Ingresá un email válido.");
  if (body.consentimiento !== true) throw new ValidationError("Necesitamos tu consentimiento para enviarte novedades.");

  return { email, payload: { email, consentimiento: true, origen: "web" } };
}

export default async function handler(request, context) {
  const allowedMethods = ["POST", "OPTIONS"];
  const origin = getRequestOrigin(request);

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: "Origin no permitido." }), {
        status: 403,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    return new Response(null, {
      status: 204,
      headers: withCorsHeaders({}, origin, allowedMethods)
    });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Origin no permitido." }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo no permitido." }), {
      status: 405,
      headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "La solicitud no tiene un formato válido." }), {
      status: 400,
      headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
    });
  }

  try {
    const config = getSupabaseConfig();
    if (body?.tipo === "solicitud_vendedor") {
      const application = parseSellerApplication(body);
      await insertIdempotently(config, "solicitudes_vendedores", application.email, application.payload);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
      });
    }
    if (body?.tipo === "suscripcion_novedades") {
      const subscription = parseNewsletterSubscription(body);
      await renewNewsletterSubscription(config, subscription);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
      });
    }
    return new Response(JSON.stringify({ error: "Tipo de formulario no válido." }), {
      status: 400,
      headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
    });
  } catch (error) {
    console.error("Home forms submission failed:", { detail: error.message || "unknown" });
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
      });
    }
    return new Response(JSON.stringify({ error: "No pudimos procesar la solicitud." }), {
      status: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" }, origin, allowedMethods)
    });
  }
}
