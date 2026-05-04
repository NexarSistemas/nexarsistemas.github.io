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

    const status = getParam("status", "collection_status") || "approved";
    const paymentId = getParam("payment_id", "collection_id");
    const orderId = getParam("merchant_order_id");
    const reference = getParam("external_reference");
    const preferenceId = getParam("preference_id");

    const statusLabel = {
        approved: "Aprobado",
        accredited: "Aprobado",
        success: "Aprobado"
    }[status.toLowerCase()] || status;

    const assignText = (id, value, fallback) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || fallback;
        }
    };

    assignText("mp-status", statusLabel, "Aprobado");
    assignText("mp-payment-id", paymentId, "Pendiente de identificacion");
    assignText("mp-payment-id-detail", paymentId, "No informado");
    assignText("mp-order-id", orderId, "No informado");
    assignText("mp-reference", reference, "No informada");
    assignText("mp-preference-id", preferenceId, "No informada");
});
