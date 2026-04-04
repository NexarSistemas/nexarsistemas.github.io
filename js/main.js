document.addEventListener("DOMContentLoaded", () => {

    // BOTÓN MAIL
    const buttons = document.querySelectorAll("#demoBtn");

    buttons.forEach(btn => {
        btn.onclick = () => {
            window.location.href =
                "mailto:NexarSistemas@outlook.com.ar?subject=Solicitud%20de%20demo";
        };
    });

    // ANIMACIÓN SIMPLE
    const cards = document.querySelectorAll(".card");

    cards.forEach((card, i) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "all 0.5s ease";

        setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, i * 120);
    });

});