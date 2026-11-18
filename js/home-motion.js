(() => {
    if (!("IntersectionObserver" in window) || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.remove("reveal-pending");
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: "0px 0px 80px 0px" });

    document.querySelectorAll("main > .section").forEach((section) => {
        if (section.getBoundingClientRect().top > window.innerHeight + 80) {
            section.classList.add("reveal-pending");
            observer.observe(section);
            requestAnimationFrame(() => section.classList.add("reveal-ready"));
        }
    });
})();
