document.addEventListener("DOMContentLoaded", async () => {
    const previewEndpoint = "https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference-preview";
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const storedToken = window.history.state && typeof window.history.state.newsletterConfirmationToken === "string"
        ? window.history.state.newsletterConfirmationToken
        : "";
    const token = tokenFromUrl === null ? storedToken : tokenFromUrl;
    const tokenIsValid = /^[A-Za-z0-9_-]{1,100}$/.test(token);

    if (params.has("token")) {
        params.delete("token");
        const query = params.toString();
        const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        const state = { ...(window.history.state || {}) };
        if (tokenIsValid) {
            state.newsletterConfirmationToken = token;
        } else {
            delete state.newsletterConfirmationToken;
        }
        window.history.replaceState(state, "", cleanUrl);
    }

    const badge = document.getElementById("newsletter-badge");
    const icon = document.getElementById("newsletter-icon");
    const title = document.getElementById("newsletter-title");
    const message = document.getElementById("newsletter-message");
    const email = document.getElementById("newsletter-email");
    const form = document.getElementById("newsletter-confirmation-form");
    const confirmToken = document.getElementById("confirm-token");

    const setVisualState = (status) => {
        if (status) {
            document.body.dataset.statusDefault = status;
        } else {
            delete document.body.dataset.statusDefault;
        }
    };

    const showResult = (result) => {
        badge.textContent = result.badge;
        icon.textContent = result.icon;
        icon.setAttribute("aria-label", result.title);
        title.textContent = result.title;
        message.textContent = result.message;
        email.hidden = true;
        form.hidden = true;
    };

    const showError = (result) => {
        setVisualState("rejected");
        showResult(result);
    };

    if (!tokenIsValid) {
        showError({
            badge: "Enlace inválido",
            icon: "!",
            title: "Enlace inválido",
            message: "El enlace no es válido."
        });
        return;
    }

    setVisualState("pending");
    showResult({
        badge: "Verificando solicitud",
        icon: "…",
        title: "Verificando solicitud",
        message: "Estamos verificando la solicitud."
    });

    try {
        const response = await fetch(`${previewEndpoint}?token=${encodeURIComponent(token)}`, { method: "GET" });
        const preview = await response.json();

        if (preview && preview.ok === true && preview.status === "pending" && (preview.action === "opt_in" || preview.action === "opt_out") && typeof preview.email_masked === "string" && preview.email_masked) {
            const isOptIn = preview.action === "opt_in";
            setVisualState("");
            showResult({
                badge: isOptIn ? "Confirmar suscripción" : "Confirmar baja",
                icon: "✓",
                title: isOptIn ? "Confirmar suscripción" : "Confirmar baja",
                message: isOptIn
                    ? "Confirmarás la suscripción a Novedades Nexar para:"
                    : "Confirmarás la baja de Novedades Nexar para:"
            });
            email.textContent = preview.email_masked;
            email.hidden = false;
            confirmToken.value = token;
            form.hidden = false;
            return;
        }

        const results = {
            confirmed: {
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
                badge: "No pudimos verificar la solicitud",
                icon: "!",
                title: "No se pudo verificar la solicitud",
                message: "Intentá nuevamente más tarde."
            }
        };
        if (preview && preview.ok === true && preview.status === "confirmed") {
            setVisualState("");
            showResult(results.confirmed);
            return;
        }
        showError(preview && preview.status !== "confirmed" && Object.prototype.hasOwnProperty.call(results, preview.status) ? results[preview.status] : results.error);
    } catch {
        showError({
            badge: "No pudimos verificar la solicitud",
            icon: "!",
            title: "No se pudo verificar la solicitud",
            message: "Intentá nuevamente más tarde."
        });
    }
});
