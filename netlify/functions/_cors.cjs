const ALLOWED_EXACT_ORIGINS = new Set([
  "https://nexarsistemas.com.ar",
  "https://www.nexarsistemas.com.ar",
  "https://nexarsistemas.github.io"
]);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (ALLOWED_EXACT_ORIGINS.has(origin)) {
    return true;
  }

  return /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);
}

function buildCorsHeaders(origin, methods) {
  if (!origin || !isAllowedOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function withCorsHeaders(baseHeaders, origin, methods) {
  return {
    ...(baseHeaders || {}),
    ...buildCorsHeaders(origin, methods)
  };
}

function getRequestOrigin(eventOrRequest) {
  if (!eventOrRequest) {
    return "";
  }

  if (typeof eventOrRequest.headers?.get === "function") {
    return String(eventOrRequest.headers.get("origin") || "").trim();
  }

  const headers = eventOrRequest.headers || {};
  return String(headers.origin || headers.Origin || "").trim();
}

function handleOptions(eventOrRequest, methods) {
  const origin = getRequestOrigin(eventOrRequest);
  if (!isAllowedOrigin(origin)) {
    return {
      statusCode: 403,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Origin no permitido." })
    };
  }

  return {
    statusCode: 204,
    headers: withCorsHeaders({}, origin, methods),
    body: ""
  };
}

function rejectDisallowedOrigin(eventOrRequest, methods) {
  const origin = getRequestOrigin(eventOrRequest);
  if (isAllowedOrigin(origin)) {
    return null;
  }

  return {
    statusCode: 403,
    headers: withCorsHeaders({ "Content-Type": "application/json" }, origin, methods),
    body: JSON.stringify({ error: "Origin no permitido." })
  };
}

module.exports = {
  buildCorsHeaders,
  getRequestOrigin,
  handleOptions,
  isAllowedOrigin,
  rejectDisallowedOrigin,
  withCorsHeaders
};
