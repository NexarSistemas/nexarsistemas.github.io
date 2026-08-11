document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
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

    if (!tokenIsValid) {
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
