(function () {
  const PUBLIC_API_URL =
    "https://mychatbot-production-d980.up.railway.app";

  function isDanyBotMobileApp() {
    return (
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "ionic:" ||
      window.location.origin === "http://localhost" ||
      window.location.origin === "https://localhost"
    );
  }

  window.isDanyBotMobileApp =
    isDanyBotMobileApp;

  window.DANYBOT_API_DEBUG = {
    lastUrl: null,
    redirected: false,
    location: window.location.href,
    origin: window.location.origin,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port
  };

  const originalFetch =
    window.fetch.bind(window);

  window.fetch = function (
    resource,
    options
  ) {
    let finalResource = resource;

    if (
      isDanyBotMobileApp() &&
      typeof resource === "string" &&
      resource.startsWith("/api")
    ) {
      finalResource =
        PUBLIC_API_URL + resource;

      window.DANYBOT_API_DEBUG.redirected =
        true;
    } else {
      window.DANYBOT_API_DEBUG.redirected =
        false;
    }

    window.DANYBOT_API_DEBUG.lastUrl =
      String(finalResource);

    window.DANYBOT_API_DEBUG.location =
      window.location.href;

    window.DANYBOT_API_DEBUG.origin =
      window.location.origin;

    window.DANYBOT_API_DEBUG.protocol =
      window.location.protocol;

    window.DANYBOT_API_DEBUG.hostname =
      window.location.hostname;

    window.DANYBOT_API_DEBUG.port =
      window.location.port;

    return originalFetch(
      finalResource,
      options
    );
  };
})();
