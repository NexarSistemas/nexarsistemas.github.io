(function () {
  if (window.location.hostname !== "nexarsistemas.github.io") {
    return;
  }

  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.protocol = "https:";
  canonicalUrl.host = "nexarsistemas.com.ar";
  window.location.replace(canonicalUrl.toString());
})();
