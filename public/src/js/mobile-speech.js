function getDanyBotSpeechPlugin() {
  if (!window.Capacitor || !window.Capacitor.Plugins) {
    return null;
  }

  return window.Capacitor.Plugins.SpeechRecognition || null;
}

function isDanyBotRunningInMobileApp() {
  return (
    window.location.origin === "http://localhost" ||
    window.location.origin === "https://localhost" ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:"
  );
}

async function startDanyBotNativeSpeech(options = {}) {
  const SpeechRecognition = getDanyBotSpeechPlugin();

  if (!isDanyBotRunningInMobileApp()) {
    return {
      success: false,
      reason: "No es app móvil"
    };
  }

  if (!SpeechRecognition) {
    return {
      success: false,
      reason: "Plugin de voz no disponible"
    };
  }

  try {
    const availability = await SpeechRecognition.available();

    if (!availability.available) {
      return {
        success: false,
        reason: "Reconocimiento de voz no disponible en este dispositivo"
      };
    }

    await SpeechRecognition.requestPermissions();

    const result = await SpeechRecognition.start({
      language: options.language || "es-CO",
      maxResults: 1,
      prompt: options.prompt || "Habla ahora",
      partialResults: false,
      popup: true
    });

    const text = result && result.matches && result.matches.length
      ? result.matches[0]
      : "";

    if (!text) {
      return {
        success: false,
        reason: "No se detectó texto"
      };
    }

    return {
      success: true,
      text
    };

  } catch (error) {
    console.error("Error en reconocimiento de voz nativo:", error);

    return {
      success: false,
      reason: error.message || "No se pudo usar el micrófono"
    };
  }
}

window.startDanyBotNativeSpeech = startDanyBotNativeSpeech;
window.isDanyBotRunningInMobileApp = isDanyBotRunningInMobileApp;
