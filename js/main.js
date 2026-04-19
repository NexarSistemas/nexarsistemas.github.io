document.addEventListener("DOMContentLoaded", () => {

    // BOTÓN MAIL
    const buttons = document.querySelectorAll(".demoBtn");

    buttons.forEach(btn => {
        btn.onclick = () => {
            window.location.href =
                "mailto:NexarSistemas@outlook.com.ar?subject=Solicitud%20de%20demo";
        };
    });

    // ================================
    // FORMULARIO DE CONTACTO - WHATSAPP
    // ================================

    // Tu número en base64. Para generarlo, abrí la consola del navegador
    // y ejecutá: btoa("549264XXXXXXXX")
    // Reemplazá "549264XXXXXXXX" por tu número real (código país + área + número)
    // Ejemplo Argentina San Juan: btoa("5492644123456")  →  "NTQ5MjY0NDEyMzQ1Ng=="
    const _wn = atob("NTQ5MjY0XXXXXXXX");  // ← reemplazá esto

    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const nombre   = document.getElementById("cf-nombre").value.trim();
            const email    = document.getElementById("cf-email").value.trim();
            const telefono = document.getElementById("cf-telefono").value.trim();
            const producto = document.getElementById("cf-producto").value;
            const consulta = document.getElementById("cf-consulta").value;
            const mensaje  = document.getElementById("cf-mensaje").value.trim();
            const btn      = document.getElementById("cf-submit");

            // Validación básica
            if (!nombre || !email || !producto || !consulta || !mensaje) {
                alert("Por favor completá todos los campos obligatorios.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert("Por favor ingresá un correo electrónico válido.");
                return;
            }

            // Construir el mensaje para WhatsApp
            const lineas = [
                `*📩 Consulta desde Nexar Sistemas*`,
                ``,
                `👤 *Nombre:* ${nombre}`,
                `📧 *Email:* ${email}`,
                telefono ? `📱 *Teléfono:* ${telefono}` : null,
                `🖥️ *Producto:* ${producto}`,
                `📋 *Tipo de consulta:* ${consulta}`,
                ``,
                `💬 *Mensaje:*`,
                mensaje
            ].filter(l => l !== null).join("\n");

            const url = `https://wa.me/${_wn}?text=${encodeURIComponent(lineas)}`;

            // Feedback visual
            btn.disabled = true;
            btn.textContent = "Abriendo WhatsApp...";

            window.open(url, "_blank");

            setTimeout(() => {
                document.getElementById("cf-success").style.display = "block";
                btn.disabled = false;
                btn.textContent = "Enviar por WhatsApp ✉️";
                contactForm.reset();
            }, 1500);
        });
    }

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

    // FAQ ACORDEÓN
    const faqQuestions = document.querySelectorAll(".faq-question");
    faqQuestions.forEach(q => {
        q.addEventListener("click", () => {
            const item = q.parentElement;
            item.classList.toggle("active");
        });
    });

});