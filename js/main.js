// main.js

// ==============================
// 1. Scroll suave en navegación
// ==============================

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);

        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});


// ==============================
// 2. Animación al hacer scroll
// ==============================

const elements = document.querySelectorAll('.card');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.2
});

elements.forEach(el => observer.observe(el));


// ==============================
// Botón "Solicitar demo" → enviar mail
// ==============================

const button = document.querySelector('button');

if (button) {
    button.addEventListener('click', () => {

        const email = "NexarSistemas@outlook.com.ar";
        const subject = encodeURIComponent("Solicitud de demo - Nexar Sistemas");
        
        const body = encodeURIComponent(
`Hola,

Me gustaría solicitar una demo de los sistemas Nexar.

Estoy interesado en:
- Nexar Almacén / Nexar Finanzas (especificar)

Tipo de negocio:
(Tu respuesta)

Cantidad de usuarios estimados:
(Tu respuesta)

Mensaje adicional:
(Tu respuesta)

Gracias.`
        );

        const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

        window.location.href = mailtoLink;
    });
}


// ==============================
// 4. Debug simple (opcional)
// ==============================

console.log("Nexar Web cargada correctamente");