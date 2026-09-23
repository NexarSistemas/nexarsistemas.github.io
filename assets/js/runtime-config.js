window.NEXAR_RUNTIME_CONFIG = (() => {
  const FALLBACK_BACKEND_ORIGIN = "https://api.nexarsistemas.com.ar";
  const location = window.location;
  const hostname = String(location.hostname || "").toLowerCase();

  function isLocalHost(host) {
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  }

  function getBackendOrigin() {
    if (isLocalHost(hostname)) {
      return location.origin;
    }

    return FALLBACK_BACKEND_ORIGIN;
  }

  return {
    backendOrigin: getBackendOrigin(),
    functionBasePath: "/.netlify/functions",
    getFunctionUrl(functionName) {
      return `${this.backendOrigin}${this.functionBasePath}/${functionName}`;
    }
  };
})();
