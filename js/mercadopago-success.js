document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    const getParam = (...keys) => {
        for (const key of keys) {
            const value = params.get(key);
            if (value) {
                return value;
            }
        }
        return "";
    };

    const defaultStatus = document.body.dataset.statusDefault || "approved";
    const receivedStatus = getParam("status", "collection_status");
    const status = receivedStatus || defaultStatus;
    const normalizedStatus = status.toLowerCase();
    const paymentId = getParam("payment_id", "collection_id");
    const orderId = getParam("merchant_order_id");
    const reference = getParam("external_reference");
    const preferenceId = getParam("preference_id");

    const statusLabel = {
        approved: "Aprobado",
        accredited: "Aprobado",
        success: "Aprobado",
        pending: "Pendiente",
        in_process: "Pendiente",
        in_mediation: "Pendiente",
        rejected: "Rechazado",
        failure: "Fallido",
        failed: "Fallido",
        cancelled: "Cancelado",
        canceled: "Cancelado",
        error: "Error técnico",
        invalid: "Parámetros inválidos"
    }[normalizedStatus] || status;

    const assignText = (id, value, fallback) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || fallback;
        }
    };

    assignText("mp-status", statusLabel, statusLabel);
    assignText("mp-status-raw", status, defaultStatus);
    assignText("mp-payment-id", paymentId, "Pendiente de identificación");
    assignText("mp-payment-id-detail", paymentId, "No informado");
    assignText("mp-order-id", orderId, "No informado");
    assignText("mp-reference", reference, "No informada");
    assignText("mp-preference-id", preferenceId, "No informada");

    const warning = document.getElementById("payment-param-warning");
    if (warning && !paymentId && !orderId && !reference && !preferenceId) {
        warning.classList.add("is-visible");
    }

    if (document.body.dataset.statusDefault !== "rejected") {
        return;
    }

    const presentation = {
        cancelled: {
            badge: "Operación cancelada",
            icon: "×",
            iconLabel: "Pago cancelado",
            title: "El pago fue cancelado",
            message: "La operación se canceló antes de recibir una aprobación. Podés volver al origen y comenzar un nuevo intento cuando quieras."
        },
        canceled: {
            badge: "Operación cancelada",
            icon: "×",
            iconLabel: "Pago cancelado",
            title: "El pago fue cancelado",
            message: "La operación se canceló antes de recibir una aprobación. Podés volver al origen y comenzar un nuevo intento cuando quieras."
        },
        failure: {
            badge: "Mercado Pago informó una falla",
            icon: "!",
            iconLabel: "Pago fallido",
            title: "El pago falló",
            message: "Mercado Pago no pudo completar la operación. Revisá el medio utilizado o volvé a intentarlo desde el enlace original."
        },
        failed: {
            badge: "Mercado Pago informó una falla",
            icon: "!",
            iconLabel: "Pago fallido",
            title: "El pago falló",
            message: "Mercado Pago no pudo completar la operación. Revisá el medio utilizado o volvé a intentarlo desde el enlace original."
        },
        error: {
            badge: "Error técnico",
            icon: "!",
            iconLabel: "Error técnico",
            title: "No pudimos verificar el pago",
            message: "Ocurrió un error técnico al recibir el resultado. Conservá los datos de la operación y contactá a soporte antes de reintentar."
        },
        invalid: {
            badge: "Parámetros inválidos",
            icon: "!",
            iconLabel: "Parámetros inválidos",
            title: "No pudimos identificar la operación",
            message: "Los datos recibidos no permiten identificar el resultado con seguridad. Contactá a soporte y compartí la información visible en esta página."
        }
    }[normalizedStatus];

    if (!presentation) {
        return;
    }

    assignText("payment-badge", presentation.badge, "");
    assignText("payment-icon", presentation.icon, "");
    assignText("payment-title", presentation.title, "");
    assignText("payment-message", presentation.message, "");

    const icon = document.getElementById("payment-icon");
    if (icon) {
        icon.setAttribute("aria-label", presentation.iconLabel);
    }
});
