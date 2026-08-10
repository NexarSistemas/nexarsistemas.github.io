document.addEventListener("DOMContentLoaded", () => {
  if (window.location.hostname === "nexarsistemas.github.io") {
    const target = new URL(window.location.href);
    target.host = "nexarsistemas.com.ar";
    target.protocol = "https:";
    window.location.replace(target.toString());
    return;
  }

  const HOME_FORMS_ENDPOINT = "/.netlify/functions/home-form-submissions";

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

  function validateLength(value, label, minimum, maximum) {
    if (value.length < minimum || value.length > maximum) {
      return `${label} debe tener entre ${minimum} y ${maximum} caracteres.`;
    }

    return "";
  }

  async function submitHomeForm(payload) {
    const response = await fetch(HOME_FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `No pudimos completar el envío (${response.status}).`);
    }

    return result;
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

      const nombreError = validateLength(nombre, "Nombre y apellido", 2, 200);
      if (nombreError) {
        setStatus(status, nombreError, "error");
        return;
      }
      const emailLengthError = validateLength(email, "Email", 4, 254);
      if (emailLengthError) {
        setStatus(status, emailLengthError, "error");
        form.elements.email.focus();
        return;
      }
      if (!isValidEmail(email)) {
        setStatus(status, "Ingresá un email válido.", "error");
        form.elements.email.focus();
        return;
      }
      const whatsappError = validateLength(whatsapp, "WhatsApp", 5, 60);
      if (whatsappError) {
        setStatus(status, whatsappError, "error");
        form.elements.whatsapp.focus();
        return;
      }
      const localidadError = validateLength(localidad, "Localidad / provincia", 2, 200);
      if (localidadError) {
        setStatus(status, localidadError, "error");
        form.elements.localidad_provincia.focus();
        return;
      }
      if (mensaje.length > 1000) {
        setStatus(status, "Mensaje puede tener como máximo 1000 caracteres.", "error");
        form.elements.mensaje.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = "Enviando...";
      setStatus(status, "Enviando tu solicitud...", "loading");
      try {
        await submitHomeForm({
          tipo: "solicitud_vendedor",
          nombre,
          email,
          whatsapp,
          localidad_provincia: localidad,
          mensaje: mensaje || null
        });
        form.reset();
        setStatus(status, "Tu solicitud fue recibida. Te contactaremos pronto.", "success");
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

      const emailLengthError = validateLength(email, "Email", 4, 254);
      if (emailLengthError) {
        setStatus(status, emailLengthError, "error");
        form.elements.email.focus();
        return;
      }
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
        await submitHomeForm({
          tipo: "suscripcion_novedades",
          email,
          consentimiento: true
        });
        form.reset();
        setStatus(status, "¡Listo! Procesamos tu suscripción.", "success");
      } catch (error) {
        console.error("Suscripción a novedades: error al enviar a Supabase.", error);
        setStatus(status, "No pudimos registrar la suscripción. Intentá nuevamente en unos minutos.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    });
  }

  bindSellerApplication();
  bindNewsletter();
});
