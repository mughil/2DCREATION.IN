(function () {
  "use strict";

  var MEASUREMENT_ID = "G-W3P1LD9WVC";
  var STORAGE_KEY = "2dc_analytics_consent";
  var analyticsLoaded = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });

  function readPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function savePreference(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      /* The choice still applies for the current page when storage is unavailable. */
    }
  }

  function deleteAnalyticsCookies() {
    var names = ["_ga", "_ga_W3P1LD9WVC"];
    names.forEach(function (name) {
      document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
      document.cookie = name + "=; Max-Age=0; Path=/; Domain=.2dcreation.in; SameSite=Lax";
    });
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function updateConsent(value) {
    var granted = value === "granted";
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: granted ? "granted" : "denied"
    });

    if (granted) loadAnalytics();
    else deleteAnalyticsCookies();
  }

  var savedPreference = readPreference();
  if (savedPreference === "granted" || savedPreference === "denied") {
    updateConsent(savedPreference);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var banner = document.createElement("section");
    banner.className = "analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "analytics-consent-title");
    banner.setAttribute("aria-describedby", "analytics-consent-copy");
    banner.innerHTML =
      '<div class="analytics-consent__copy">' +
        '<strong id="analytics-consent-title">Analytics choice</strong>' +
        '<p id="analytics-consent-copy">We use Google Analytics only with your permission to understand website usage and improve our services. Advertising storage remains disabled.</p>' +
        '<a href="privacy.html">Read the privacy policy</a>' +
      '</div>' +
      '<div class="analytics-consent__actions">' +
        '<button type="button" data-consent="denied">Decline</button>' +
        '<button type="button" class="analytics-consent__accept" data-consent="granted">Accept analytics</button>' +
      '</div>';

    var settings = document.createElement("button");
    settings.type = "button";
    settings.className = "analytics-settings";
    settings.textContent = "Analytics settings";
    settings.setAttribute("aria-label", "Change analytics consent settings");

    function showBanner() {
      banner.hidden = false;
      settings.hidden = true;
    }

    function hideBanner() {
      banner.hidden = true;
      settings.hidden = false;
    }

    banner.querySelectorAll("[data-consent]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-consent");
        savePreference(value);
        updateConsent(value);
        hideBanner();
      });
    });

    settings.addEventListener("click", showBanner);
    document.body.appendChild(banner);
    document.body.appendChild(settings);

    if (savedPreference === "granted" || savedPreference === "denied") hideBanner();
    else showBanner();
  });
})();
