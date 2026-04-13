document.addEventListener("DOMContentLoaded", () => {

    // BOTÓN MAIL
    const buttons = document.querySelectorAll(".demoBtn");

    buttons.forEach(btn => {
        btn.onclick = () => {
            window.location.href =
                "mailto:NexarSistemas@outlook.com.ar?subject=Solicitud%20de%20demo";
        };
    });

    // ANIMACIÓN SCROLL (nueva)
    const cards = document.querySelectorAll(".card");

    // Estado inicial
    cards.forEach(card => {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px)";
        card.style.transition = "all 0.6s ease";
    });

    // Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, {
        threshold: 0.2
    });

    // Observar cada card
    cards.forEach(card => {
        observer.observe(card);
    });

});