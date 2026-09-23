(() => {
  const CLARITY_PROJECT_ID = "ymxf7jer2e";
  const hostname = String(window.location.hostname || "").toLowerCase();
  const pathname = String(window.location.pathname || "/");
  const isProductionHost = hostname === "nexarsistemas.com.ar" || hostname === "www.nexarsistemas.com.ar";
  const isVendorArea = pathname === "/vendedores" || pathname.startsWith("/vendedores/");

  if (!isProductionHost || isVendorArea) {
    return;
  }

  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
})();
