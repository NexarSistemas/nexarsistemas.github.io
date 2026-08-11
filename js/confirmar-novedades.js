document.addEventListener("DOMContentLoaded", () => {
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
        const state = tokenIsValid
            ? { ...(window.history.state || {}), newsletterConfirmationToken: token }
            : window.history.state;
        window.history.replaceState(state, "", cleanUrl);
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

    if (!tokenIsValid) {
        document.body.dataset.statusDefault = "rejected";
        showResult({
            badge: "Enlace inválido",
            icon: "!",
            title: "Enlace inválido",
            message: "El enlace no es válido."
        });
        return;
    }

    confirmToken.value = token;
    form.hidden = false;
});
