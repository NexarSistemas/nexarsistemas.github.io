document.addEventListener("DOMContentLoaded", () => {

    // ================================
    // BOTONES "SOLICITAR DEMO"
    // ================================
    const buttons = document.querySelectorAll(".demoBtn");
    buttons.forEach(btn => {
        btn.onclick = () => {
            // Scroll suave al formulario de contacto
            document.getElementById("contacto").scrollIntoView({ behavior: "smooth" });
        };
    });

    // ================================
    // ANIMACIÓN SCROLL EN CARDS
    // ================================
    const cards = document.querySelectorAll(".card");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: 0.2 });

    cards.forEach(card => {
        observer.observe(card);
    });

    // ================================
    // FAQ ACORDEÓN
    // ================================
    const faqQuestions = document.querySelectorAll(".faq-question");
    faqQuestions.forEach(q => {
        q.addEventListener("click", () => {
            const item = q.parentElement;
            item.classList.toggle("active");
        });
    });

    // ================================
    // FORMULARIO DE CONTACTO - WHATSAPP
    // ================================

    // Tu número en base64. Para generarlo:
    // 1. Abrí la consola del navegador (F12 → Console)
    // 2. Ejecutá: btoa("5492644123456")
    //    (54 = Argentina, 264 = San Juan sin el 0, luego tu número)
    // 3. Pegá el resultado entre las comillas del atob("...")
    const _wn = atob("NTQ5MjY0XXXXXXXX"); // ← reemplazá esto con tu base64

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
            const success  = document.getElementById("cf-success");

            // --- Validación ---
            if (!nombre || !email || !producto || !consulta || !mensaje) {
                alert("Por favor completá todos los campos obligatorios.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert("Por favor ingresá un correo electrónico válido.");
                return;
            }

            // --- Armar el mensaje ---
            const lineas = [
                `*📩 Consulta desde Nexar Sistemas*`,
                ``,
                `👤 *Nombre:* ${nombre}`,
                `📧 *Email:* ${email}`,
                telefono ? `📱 *Teléfono:* ${telefono}` : null,
                `🖥️ *Producto:* ${producto}`,
                `📋 *Consulta:* ${consulta}`,
                ``,
                `💬 *Mensaje:*`,
                mensaje
            ].filter(l => l !== null).join("\n");

            const url = `https://wa.me/${_wn}?text=${encodeURIComponent(lineas)}`;

            // --- Feedback visual ---
            btn.disabled = true;
            btn.textContent = "Abriendo WhatsApp...";
            success.style.display = "none";

            window.open(url, "_blank");

            setTimeout(() => {
                success.style.display = "block";
                btn.disabled = false;
                btn.textContent = "Enviar por WhatsApp ✉️";
                contactForm.reset();

                // Ocultar el mensaje de éxito después de 5 segundos
                setTimeout(() => {
                    success.style.display = "none";
                }, 5000);
            }, 1500);
        });
    }

});