(() => {
  const CLARITY_PROJECT_ID = "ymxf7jer2e";
  const CONSENT_STORAGE_KEY = "nexar_cookie_consent";
  const hostname = String(window.location.hostname || "").toLowerCase();
  const pathname = String(window.location.pathname || "/");
  const isProductionHost = hostname === "nexarsistemas.com.ar" || hostname === "www.nexarsistemas.com.ar";
  const isVendorArea = pathname === "/vendedores" || pathname.startsWith("/vendedores/");

  if (!isProductionHost || isVendorArea) {
    return;
  }

  const getStoredConsent = () => {
    try {
      const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      return value === "accepted" || value === "rejected" ? value : null;
    } catch (_) {
      return null;
    }
  };

  const storeConsent = (value) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch (_) {
      // Si localStorage no está disponible, la elección se aplica igualmente a la sesión actual.
    }
  };

  window.clarity = window.clarity || function() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  const applyClarityConsent = (value) => {
    const analyticsGranted = value === "accepted";
    window.clarity("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: analyticsGranted ? "granted" : "denied"
    });
  };

  const initialConsent = getStoredConsent();
  applyClarityConsent(initialConsent === "accepted" ? "accepted" : "rejected");

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.clarity.ms/tag/" + CLARITY_PROJECT_ID;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  const ensureConsentStyles = () => {
    if (document.getElementById("nexar-cookie-consent-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "nexar-cookie-consent-styles";
    style.textContent = `
      .nexar-cookie-consent {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 1000;
        width: min(520px, calc(100vw - 40px));
        padding: 20px;
        border: 1px solid rgba(11, 34, 57, 0.14);
        border-radius: 16px;
        color: #152536;
        background: #ffffff;
        box-shadow: 0 18px 55px rgba(11, 34, 57, 0.2);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .nexar-cookie-consent[hidden] {
        display: none !important;
      }
      .nexar-cookie-consent h2 {
        margin: 0 0 8px;
        color: #0b2239;
        font-size: 18px;
        line-height: 1.25;
      }
      .nexar-cookie-consent p {
        margin: 0;
        color: #667584;
        font-size: 14px;
        line-height: 1.55;
      }
      .nexar-cookie-consent a {
        color: #0d7b50;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .nexar-cookie-consent-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .nexar-cookie-consent button {
        min-height: 42px;
        padding: 0 16px;
        border-radius: 9px;
        cursor: pointer;
        font: inherit;
        font-size: 14px;
        font-weight: 750;
      }
      .nexar-cookie-consent-reject {
        border: 1px solid #c7d2cc;
        color: #0b2239;
        background: #ffffff;
      }
      .nexar-cookie-consent-accept {
        border: 1px solid #16a36a;
        color: #ffffff;
        background: #16a36a;
      }
      .nexar-cookie-consent button:focus-visible,
      [data-cookie-preferences]:focus-visible {
        outline: 3px solid rgba(22, 163, 106, 0.42);
        outline-offset: 3px;
      }
      @media (max-width: 620px) {
        .nexar-cookie-consent {
          right: 12px;
          bottom: 12px;
          width: calc(100vw - 24px);
          padding: 18px;
        }
        .nexar-cookie-consent-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .nexar-cookie-consent button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  let banner = null;

  const closeBanner = () => {
    if (banner) {
      banner.hidden = true;
    }
  };

  const setConsent = (value) => {
    storeConsent(value);
    applyClarityConsent(value);
    closeBanner();
  };

  const ensureBanner = () => {
    if (banner) {
      return banner;
    }

    ensureConsentStyles();
    banner = document.createElement("section");
    banner.className = "nexar-cookie-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "nexar-cookie-consent-title");
    banner.innerHTML = `
      <h2 id="nexar-cookie-consent-title">Tu privacidad importa</h2>
      <p>
        Usamos cookies de analítica de Microsoft Clarity para entender cómo se utiliza el sitio y mejorarlo.
        Podés aceptar o rechazar estas cookies. <a href="./legal.html#cookies">Más información</a>.
      </p>
      <div class="nexar-cookie-consent-actions">
        <button type="button" class="nexar-cookie-consent-reject" data-consent-choice="rejected">Rechazar</button>
        <button type="button" class="nexar-cookie-consent-accept" data-consent-choice="accepted">Aceptar</button>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-consent-choice]");
      if (!button) {
        return;
      }
      setConsent(button.getAttribute("data-consent-choice"));
    });

    document.body.appendChild(banner);
    return banner;
  };

  const openPreferences = () => {
    const consentBanner = ensureBanner();
    consentBanner.hidden = false;
    const current = getStoredConsent();
    const targetSelector = current === "accepted"
      ? '[data-consent-choice="rejected"]'
      : '[data-consent-choice="accepted"]';
    const target = consentBanner.querySelector(targetSelector);
    if (target) {
      target.focus();
    }
  };

  const bindPreferenceButtons = () => {
    document.querySelectorAll("[data-cookie-preferences]").forEach((button) => {
      if (button.dataset.cookiePreferencesBound === "true") {
        return;
      }
      button.dataset.cookiePreferencesBound = "true";
      button.addEventListener("click", openPreferences);
    });
  };

  window.NexarCookieConsent = {
    get: getStoredConsent,
    open: openPreferences,
    set: setConsent
  };

  const initializeUi = () => {
    bindPreferenceButtons();
    if (!initialConsent) {
      openPreferences();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUi, { once: true });
  } else {
    initializeUi();
  }
})();
