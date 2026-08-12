document.addEventListener("DOMContentLoaded", async () => {
    const previewEndpoint = "https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference-preview";
    const confirmationEndpoint = "https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference";
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
    const closeNote = document.getElementById("newsletter-close-note");

    const setVisualState = (status) => {
        if (status) {
            document.body.dataset.statusDefault = status;
        } else {
            delete document.body.dataset.statusDefault;
        }
    };

    const showResult = (result, { completed = false } = {}) => {
        badge.textContent = result.badge;
        icon.textContent = result.icon;
        icon.setAttribute("aria-label", result.title);
        title.textContent = result.title;
        message.textContent = result.message;
        email.hidden = true;
        form.hidden = true;
        closeNote.hidden = !completed;
        form.closest(".payment-panel").classList.toggle("newsletter-confirmation-complete", completed);
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
        } else {
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
        }
    } catch {
        showError({
            badge: "No pudimos verificar la solicitud",
            icon: "!",
            title: "No se pudo verificar la solicitud",
            message: "Intentá nuevamente más tarde."
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        form.hidden = true;
        setVisualState("pending");
        showResult({
            badge: "Confirmando solicitud",
            icon: "…",
            title: "Confirmando solicitud",
            message: "Estamos aplicando tu preferencia."
        });

        try {
            const response = await fetch(confirmationEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({ confirm_token: confirmToken.value }).toString()
            });
            const contentType = response.headers && response.headers.get("content-type");
            const result = contentType && !contentType.includes("application/json")
                ? { text: await response.text() }
                : await response.json();

            if (!response.ok || !result || (Object.prototype.hasOwnProperty.call(result, "ok") && result.ok !== true)) {
                throw new Error("newsletter confirmation failed");
            }

            const successResults = {
                opt_in: {
                    badge: "Suscripción confirmada",
                    icon: "✓",
                    title: "Suscripción confirmada",
                    message: "Tu suscripción a Novedades Nexar ya está activa."
                },
                opt_out: {
                    badge: "Baja confirmada",
                    icon: "✓",
                    title: "Baja confirmada",
                    message: "Ya no recibirás Novedades Nexar."
                },
                confirmed: {
                    badge: "Solicitud confirmada",
                    icon: "✓",
                    title: "Solicitud ya confirmada",
                    message: "Esta solicitud ya fue confirmada anteriormente."
                }
            };
            const normalizedText = typeof result.text === "string"
                ? result.text.normalize("NFC").trim().replace(/\s+/gu, " ")
                : "";
            const successKey = result.status === "confirmed"
                ? "confirmed"
                : result.action || ({
                    "Suscripción confirmada. Ya podés recibir Novedades Nexar.": "opt_in",
                    "Baja confirmada. Dejaste de recibir Novedades Nexar.": "opt_out",
                    "Esta solicitud ya fue confirmada.": "confirmed"
                })[normalizedText];
            if (!Object.prototype.hasOwnProperty.call(successResults, successKey)) {
                throw new Error("unexpected newsletter confirmation response");
            }

            setVisualState("");
            showResult(successResults[successKey], { completed: true });
        } catch {
            showError({
                badge: "No pudimos confirmar la solicitud",
                icon: "!",
                title: "No se pudo confirmar la solicitud",
                message: "Intentá nuevamente más tarde."
            });
        }
    });
});
