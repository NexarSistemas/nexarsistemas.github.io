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
    const status = getParam("status", "collection_status") || defaultStatus;
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
        rejected: "No aprobado",
        failure: "No aprobado",
        failed: "No aprobado"
    }[status.toLowerCase()] || status;

    const assignText = (id, value, fallback) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || fallback;
        }
    };

    assignText("mp-status", statusLabel, statusLabel);
    assignText("mp-payment-id", paymentId, "Pendiente de identificacion");
    assignText("mp-payment-id-detail", paymentId, "No informado");
    assignText("mp-order-id", orderId, "No informado");
    assignText("mp-reference", reference, "No informada");
    assignText("mp-preference-id", preferenceId, "No informada");
});
