document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const status = params.get("status") || "";
    const action = params.get("action") || "";
    const tokenIsValid = /^[A-Za-z0-9_-]{1,100}$/.test(token);

    if (params.has("token")) {
        params.delete("token");
        const query = params.toString();
        const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState(null, "", cleanUrl);
    }

    const badge = document.getElementById("newsletter-badge");
    const icon = document.getElementById("newsletter-icon");
    const title = document.getElementById("newsletter-title");
    const message = document.getElementById("newsletter-message");
    const form = document.getElementById("newsletter-confirmation-form");
    const confirmToken = document.getElementById("confirm-token");

    const showResult = (result) => {
        badge.textContent = result.badge;
        icon.textContent = result.icon;
        icon.setAttribute("aria-label", result.title);
        title.textContent = result.title;
        message.textContent = result.message;
    };

    const results = {
        "confirmed:opt_in": {
            badge: "Preferencia confirmada",
            icon: "✓",
            title: "Suscripción confirmada",
            message: "Ya podés recibir Novedades Nexar."
        },
        "confirmed:opt_out": {
            badge: "Preferencia confirmada",
            icon: "✓",
            title: "Baja confirmada",
            message: "Dejaste de recibir Novedades Nexar."
        },
        already_confirmed: {
            badge: "Solicitud confirmada",
            icon: "✓",
            title: "Solicitud ya confirmada",
            message: "Esta solicitud ya fue confirmada anteriormente."
        },
        expired: {
            badge: "Enlace vencido",
            icon: "!",
            title: "Enlace vencido",
            message: "Volvé a solicitar el cambio desde la aplicación."
        },
        invalid: {
            badge: "Enlace inválido",
            icon: "!",
            title: "Enlace inválido",
            message: "El enlace no es válido."
        },
        error: {
            badge: "No pudimos aplicar el cambio",
            icon: "!",
            title: "No se pudo aplicar la preferencia",
            message: "Intentá nuevamente más tarde."
        }
    };

    const result = status === "confirmed" ? results[`confirmed:${action}`] : results[status];
    if (result) {
        showResult(result);
        return;
    }

    if (!tokenIsValid) {
        showResult(results.invalid);
        return;
    }

    confirmToken.value = token;
    form.hidden = false;
});
