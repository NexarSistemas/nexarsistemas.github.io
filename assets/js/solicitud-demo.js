document.addEventListener("DOMContentLoaded", () => {
  const form =
    document.getElementById("contactForm") ||
    document.querySelector('form[data-contact-mode="supabase"]');

  if (!form) {
    console.warn("Solicitud demo: no se encontro el formulario de contacto.");
    return;
  }

  let statusContainer = document.getElementById("solicitud-demo-status");
  if (!statusContainer) {
    statusContainer = document.createElement("div");
    statusContainer.id = "solicitud-demo-status";
    statusContainer.setAttribute("aria-live", "polite");
    form.prepend(statusContainer);
  }

  const config = window.NEXAR_SUPABASE_CONFIG || {};
  const supabaseUrl = typeof config.url === "string" ? config.url.trim() : "";
  const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
  const hasConfig =
    supabaseUrl &&
    anonKey &&
    !supabaseUrl.includes("TU-PROYECTO") &&
    !anonKey.includes("TU_SUPABASE_ANON_KEY_AQUI");

  const submitButton =
    form.querySelector("#cf-submit") ||
    form.querySelector('button[type="submit"]') ||
    form.querySelector('input[type="submit"]');
  const successMessage = document.getElementById("cf-success");
  const originalButtonLabel = submitButton ? submitButton.textContent : "";

  const fieldSelectors = {
    nombre: ["#cf-nombre", '[name="nombre"]', '[id="nombre"]'],
    email: ["#cf-email", '[name="email"]', '[id="email"]'],
    telefono: ["#cf-telefono", '[name="telefono"]', '[id="telefono"]'],
    negocio: ['[name="negocio"]', '[id="negocio"]'],
    producto: ["#cf-producto", '[name="producto"]', '[id="producto"]'],
    plan_interes: [
      "#cf-consulta",
      '[name="plan_interes"]',
      '[id="plan_interes"]'
    ],
    mensaje: ["#cf-mensaje", '[name="mensaje"]', '[id="mensaje"]']
  };

  function getField(key) {
    const selectors = fieldSelectors[key] || [];
    for (const selector of selectors) {
      const element = form.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }

  function getValue(key) {
    const field = getField(key);
    if (!field) {
      return "";
    }

    if (typeof field.value === "string") {
      return field.value.trim();
    }

    return "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showStatus(message, type) {
    statusContainer.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    statusContainer.style.display = "block";
  }

  function hideStatus() {
    statusContainer.innerHTML = "";
    statusContainer.style.display = "none";
  }

  function focusField(key) {
    const field = getField(key);
    if (field && typeof field.focus === "function") {
      field.focus();
    }
  }

  if (!hasConfig) {
    const message =
      "Falta configurar Supabase en assets/js/supabase-config.js. Carga la URL publica y la anon key antes de probar el envio.";
    console.warn(`Solicitud demo: ${message}`);
    showStatus(message, "error");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideStatus();

    const nombre = getValue("nombre");
    const email = getValue("email");
    const telefono = getValue("telefono");
    const negocio = getValue("negocio");
    const producto = getValue("producto");
    const planInteres = getValue("plan_interes");
    const mensaje = getValue("mensaje");

    if (!nombre) {
      showStatus("Ingresa tu nombre para continuar.", "error");
      focusField("nombre");
      return;
    }

    if (!email) {
      showStatus("Ingresa tu correo electronico para continuar.", "error");
      focusField("email");
      return;
    }

    if (!isValidEmail(email)) {
      showStatus("Ingresa un correo electronico valido.", "error");
      focusField("email");
      return;
    }

    const payload = {
      nombre,
      email,
      telefono: telefono || null,
      negocio: negocio || null,
      producto: producto || null,
      plan_interes: planInteres || null,
      mensaje: mensaje || null,
      estado: "pendiente",
      origen: "web",
      leida: false
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    if (successMessage) {
      successMessage.style.display = "none";
    }

    showStatus("Enviando tu solicitud...", "loading");

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/solicitudes_demo`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let detail = "";

        try {
          const errorData = await response.json();
          detail = errorData.message || errorData.error_description || errorData.error || "";
        } catch (parseError) {
          detail = "";
        }

        throw new Error(detail || `Supabase respondio con estado ${response.status}.`);
      }

      form.reset();
      showStatus("Tu solicitud fue enviada correctamente. Te contactaremos pronto.", "success");

      if (successMessage) {
        successMessage.style.display = "block";
      }
    } catch (error) {
      console.error("Solicitud demo: error al enviar a Supabase.", error);
      showStatus(
        `No pudimos enviar la solicitud a Supabase. ${error.message || "Intenta nuevamente en unos minutos."}`,
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonLabel || "Enviar solicitud";
      }
    }
  });
});
