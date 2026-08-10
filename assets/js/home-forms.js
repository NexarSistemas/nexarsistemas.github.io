document.addEventListener("DOMContentLoaded", () => {
  const config = window.NEXAR_SUPABASE_CONFIG || {};
  const supabaseUrl = typeof config.url === "string" ? config.url.trim() : "";
  const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
  const hasConfig = Boolean(
    supabaseUrl &&
      anonKey &&
      !supabaseUrl.includes("TU-PROYECTO") &&
      !anonKey.includes("TU_SUPABASE_ANON_KEY_AQUI")
  );

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setStatus(container, message, type) {
    container.replaceChildren();
    const status = document.createElement("div");
    status.className = `status-message status-${type}`;
    status.textContent = message;
    container.append(status);
  }

  async function insert(tableName, payload) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { inserted: true };
    }

    const error = await response.json().catch(() => ({}));
    if (error.code === "23505") {
      return { duplicate: true };
    }

    throw new Error(error.message || error.error || `Supabase respondio con estado ${response.status}.`);
  }

  function bindSellerApplication() {
    const form = document.getElementById("sellerApplicationForm");
    if (!form) return;

    const status = document.getElementById("seller-application-status");
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.textContent;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nombre = form.elements.nombre.value.trim();
      const email = form.elements.email.value.trim().toLowerCase();
      const whatsapp = form.elements.whatsapp.value.trim();
      const localidad = form.elements.localidad_provincia.value.trim();
      const mensaje = form.elements.mensaje.value.trim();

      if (!nombre || !email || !whatsapp || !localidad) {
        setStatus(status, "Completá los campos obligatorios para enviar tu solicitud.", "error");
        return;
      }
      if (!isValidEmail(email)) {
        setStatus(status, "Ingresá un email válido.", "error");
        form.elements.email.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = "Enviando...";
      setStatus(status, "Enviando tu solicitud...", "loading");
      try {
        const result = await insert("solicitudes_vendedores", {
          nombre,
          email,
          whatsapp,
          localidad_provincia: localidad,
          mensaje: mensaje || null,
          estado: "pendiente",
          origen: "web"
        });
        form.reset();
        setStatus(
          status,
          result.duplicate
            ? "Ya recibimos una solicitud con este email. Te contactaremos pronto."
            : "Tu solicitud fue enviada correctamente. Te contactaremos pronto.",
          "success"
        );
      } catch (error) {
        console.error("Solicitud de vendedor: error al enviar a Supabase.", error);
        setStatus(status, "No pudimos enviar la solicitud. Intentá nuevamente en unos minutos.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    });
  }

  function bindNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;

    const status = document.getElementById("newsletter-status");
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.textContent;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = form.elements.email.value.trim().toLowerCase();
      const consentimiento = form.elements.consentimiento.checked;

      if (!isValidEmail(email)) {
        setStatus(status, "Ingresá un email válido.", "error");
        form.elements.email.focus();
        return;
      }
      if (!consentimiento) {
        setStatus(status, "Necesitamos tu consentimiento para enviarte novedades.", "error");
        form.elements.consentimiento.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = "Suscribiendo...";
      setStatus(status, "Registrando tu suscripción...", "loading");
      try {
        const result = await insert("suscripciones_novedades", {
          email,
          consentimiento: true,
          origen: "web"
        });
        form.reset();
        setStatus(
          status,
          result.duplicate
            ? "Este email ya está suscripto a las novedades de Nexar."
            : "¡Listo! Tu suscripción fue registrada.",
          "success"
        );
      } catch (error) {
        console.error("Suscripción a novedades: error al enviar a Supabase.", error);
        setStatus(status, "No pudimos registrar la suscripción. Intentá nuevamente en unos minutos.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    });
  }

  if (!hasConfig) {
    console.warn("Formularios de home: falta configurar Supabase.");
    return;
  }

  bindSellerApplication();
  bindNewsletter();
});
