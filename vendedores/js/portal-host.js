(function () {
  if (!window.NEXAR_RUNTIME_CONFIG) {
    window.NEXAR_RUNTIME_CONFIG = {
      backendOrigin: "https://nexarsistemas.com.ar",
      functionBasePath: "/.netlify/functions",
      getFunctionUrl(functionName) {
        return `${this.backendOrigin}${this.functionBasePath}/${functionName}`;
      }
    };
  }
})();
