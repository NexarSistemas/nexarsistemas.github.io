document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".demoBtn").forEach((button) => {
        button.addEventListener("click", () => {
            const contactSection = document.getElementById("contacto");
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    document.querySelectorAll(".downloadInquiry").forEach((link) => {
        link.addEventListener("click", () => {
            const productSelect = document.getElementById("cf-producto");
            const inquirySelect = document.getElementById("cf-consulta");
            const messageField = document.getElementById("cf-mensaje");
            const product = link.dataset.product;
            const inquiry = link.dataset.inquiry || "Solicitar descarga";

            if (productSelect && product) {
                productSelect.value = product;
            }
            if (inquirySelect) {
                inquirySelect.value = inquiry;
            }
            if (messageField && !messageField.value.trim()) {
                messageField.value = inquiry === "Solicitar licencia"
                    ? `Hola, quiero solicitar una licencia de ${product}.`
                    : `Hola, quiero solicitar la descarga de ${product}.`;
            }
        });
    });

    document.querySelectorAll(".faq-question").forEach((question) => {
        question.addEventListener("click", () => {
            question.parentElement.classList.toggle("active");
        });
    });
});
