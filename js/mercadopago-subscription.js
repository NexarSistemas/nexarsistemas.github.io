document.addEventListener("DOMContentLoaded", () => {
    const countdown = document.getElementById("subscription-countdown");
    if (!countdown) {
        return;
    }

    let remainingSeconds = 15;
    countdown.textContent = String(remainingSeconds);

    const redirectTimer = window.setInterval(() => {
        remainingSeconds -= 1;
        countdown.textContent = String(Math.max(remainingSeconds, 0));

        if (remainingSeconds <= 0) {
            window.clearInterval(redirectTimer);
            window.location.href = "./index.html";
        }
    }, 1000);
});
