(function () {
  const LOCAL_MOBILE_API_URL = "http://10.0.2.2:3000";

  window.DANYBOT_API_DEBUG = {
    lastUrl: null,
    redirected: false,
    location: window.location.href,
    origin: window.location.origin,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port
  };

  function shouldRedirectApiCalls() {
    const hostname = window.location.hostname;
    const port = window.location.port;

    const isBrowserBackend =
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      port === "3000";

    return !isBrowserBackend;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = function (resource, options) {
    let finalResource = resource;

    if (
      shouldRedirectApiCalls() &&
      typeof resource === "string" &&
      resource.startsWith("/api")
    ) {
      finalResource = LOCAL_MOBILE_API_URL + resource;
      window.DANYBOT_API_DEBUG.redirected = true;
    } else {
      window.DANYBOT_API_DEBUG.redirected = false;
    }

    window.DANYBOT_API_DEBUG.lastUrl = String(finalResource);
    window.DANYBOT_API_DEBUG.location = window.location.href;
    window.DANYBOT_API_DEBUG.origin = window.location.origin;
    window.DANYBOT_API_DEBUG.protocol = window.location.protocol;
    window.DANYBOT_API_DEBUG.hostname = window.location.hostname;
    window.DANYBOT_API_DEBUG.port = window.location.port;

    return originalFetch(finalResource, options);
  };
})();

window.isDanyBotMobileApp = function () {
  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    window.location.origin === "http://localhost" ||
    window.location.origin === "https://localhost"
  );
};