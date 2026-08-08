// ==============================================
// DANYBOT - LOGIN BIOMÉTRICO ANDROID
// ==============================================

const DANYBOT_BIOMETRIC_SESSION_KEY =
  'danybot_biometric_session_v1';

const DANYBOT_BIOMETRIC_ENABLED_KEY =
  'danybotBiometricEnabled';


function isDanyBotNativeBiometricApp() {
  return Boolean(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}


function getDanyBotBiometricPlugin() {
  return (
    window.Capacitor?.Plugins?.BiometricAuthNative ||
    null
  );
}


function getDanyBotSecureStoragePlugin() {
  return (
    window.Capacitor?.Plugins?.SecureStorage ||
    null
  );
}


// ==============================================
// JWT
// ==============================================

function getDanyBotJwtPayload(token) {
  try {
    if (!token) {
      return null;
    }

    const payloadPart =
      token.split('.')[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload =
      payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const paddedPayload =
      normalizedPayload +
      '='.repeat(
        (4 - normalizedPayload.length % 4) % 4
      );

    return JSON.parse(
      atob(paddedPayload)
    );

  } catch (error) {
    console.error(
      'No se pudo leer el JWT biométrico:',
      error
    );

    return null;
  }
}


function isDanyBotBiometricTokenExpired(token) {
  const payload =
    getDanyBotJwtPayload(token);

  if (!payload || !payload.exp) {
    return true;
  }

  return (
    Date.now() >=
    Number(payload.exp) * 1000
  );
}


// ==============================================
// ALMACENAMIENTO SEGURO ANDROID
// ==============================================

async function saveDanyBotSecureBiometricSession(
  user,
  token
) {
  const SecureStorage =
    getDanyBotSecureStoragePlugin();

  if (!SecureStorage) {
    throw new Error(
      'SecureStorage no está disponible.'
    );
  }

  const sessionData = JSON.stringify({
    user,
    token
  });

  await SecureStorage.internalSetItem({
    prefixedKey:
      `capacitor-storage_${DANYBOT_BIOMETRIC_SESSION_KEY}`,

    data:
      sessionData,

    sync:
      false,

    access:
      0
  });
}


async function getDanyBotSecureBiometricSession() {
  const SecureStorage =
    getDanyBotSecureStoragePlugin();

  if (!SecureStorage) {
    return null;
  }

  const result =
    await SecureStorage.internalGetItem({
      prefixedKey:
        `capacitor-storage_${DANYBOT_BIOMETRIC_SESSION_KEY}`,

      sync:
        false
    });

  if (!result?.data) {
    return null;
  }

  try {
    return JSON.parse(result.data);

  } catch (error) {
    console.error(
      'Sesión biométrica inválida:',
      error
    );

    return null;
  }
}


async function removeDanyBotSecureBiometricSession() {
  const SecureStorage =
    getDanyBotSecureStoragePlugin();

  if (SecureStorage) {
    try {
      await SecureStorage.internalRemoveItem({
        prefixedKey:
          `capacitor-storage_${DANYBOT_BIOMETRIC_SESSION_KEY}`,

        sync:
          false
      });

    } catch (error) {
      console.warn(
        'No se pudo eliminar la sesión biométrica:',
        error
      );
    }
  }

  localStorage.removeItem(
    DANYBOT_BIOMETRIC_ENABLED_KEY
  );
}


// ==============================================
// AUTENTICACIÓN BIOMÉTRICA
// ==============================================

async function authenticateDanyBotBiometric() {
  const BiometricAuth =
    getDanyBotBiometricPlugin();

  if (!BiometricAuth) {
    throw new Error(
      'BiometricAuth no está disponible.'
    );
  }

  const biometry =
    await BiometricAuth.checkBiometry();

  if (!biometry?.isAvailable) {
    throw new Error(
      biometry?.reason ||
      'La biometría no está disponible.'
    );
  }

  /*
   * Usamos el puente nativo que ya fue probado
   * correctamente en este proyecto Android.
   */
  await BiometricAuth.internalAuthenticate({
    reason:
      'Confirma tu identidad para acceder a DANYBOT',

    androidTitle:
      'Acceso a DANYBOT',

    androidSubtitle:
      'Usa tu huella para continuar',

    allowDeviceCredential:
      false
  });
}


// ==============================================
// ACTIVAR HUELLA DESPUÉS DE LOGIN NORMAL
// ==============================================

async function offerDanyBotBiometricAccess(
  user,
  token
) {
  /*
   * WEB no cambia absolutamente nada.
   */
  if (!isDanyBotNativeBiometricApp()) {
    return;
  }

  try {
    const BiometricAuth =
      getDanyBotBiometricPlugin();

    const SecureStorage =
      getDanyBotSecureStoragePlugin();

    if (!BiometricAuth || !SecureStorage) {
      return;
    }

    const biometry =
      await BiometricAuth.checkBiometry();

    if (!biometry?.isAvailable) {
      return;
    }

    /*
     * Si el usuario YA tenía la huella activada,
     * simplemente actualizamos el token seguro
     * con el token nuevo del login actual.
     *
     * No volvemos a preguntarle.
     */
    const biometricAlreadyEnabled =
      localStorage.getItem(
        DANYBOT_BIOMETRIC_ENABLED_KEY
      ) === 'true';

    if (biometricAlreadyEnabled) {
      await saveDanyBotSecureBiometricSession(
        user,
        token
      );

      return;
    }

    /*
     * Primera activación.
     */
    const result =
        await Swal.fire({
            title:
            '¿Activar acceso con huella?',

            text:
            'La próxima vez podrás entrar a DANYBOT usando la huella de este dispositivo.',

            icon:
            'question',

            showCancelButton:
            true,

            confirmButtonText:
            'Activar huella',

            cancelButtonText:
            'Ahora no',

            confirmButtonColor:
            '#3c0000',

            width:
            '88%',

            padding:
            '1.1rem',

            customClass: {
            popup:
                'danybot-biometric-popup',

            title:
                'danybot-biometric-title',

            htmlContainer:
                'danybot-biometric-text',

            actions:
                'danybot-biometric-actions',

            confirmButton:
                'danybot-biometric-confirm',

            cancelButton:
                'danybot-biometric-cancel'
            }
        });

    if (!result.isConfirmed) {
      return;
    }

    /*
     * Confirmamos que realmente sea el dueño
     * del dispositivo antes de activar.
     */
    await authenticateDanyBotBiometric();

    await saveDanyBotSecureBiometricSession(
      user,
      token
    );

    localStorage.setItem(
      DANYBOT_BIOMETRIC_ENABLED_KEY,
      'true'
    );

    await Swal.fire({
      title:
        'Huella activada',

      text:
        'Ya puedes ingresar a DANYBOT con tu huella.',

      icon:
        'success',

      timer:
        1800,

      showConfirmButton:
        false
    });

  } catch (error) {
    /*
     * IMPORTANTE:
     * si falla la activación biométrica,
     * NO dañamos el login normal.
     */
    console.warn(
      'No se activó el acceso biométrico:',
      error
    );
  }
}


// ==============================================
// LOGIN CON HUELLA
// ==============================================

async function loginWithDanyBotBiometric() {
  const button =
    document.getElementById(
      'biometricLoginButton'
    );

  if (button) {
    button.disabled = true;
  }

  try {
    /*
     * Primero se valida la huella.
     *
     * Solo después leemos la sesión protegida.
     */
    await authenticateDanyBotBiometric();

    const secureSession =
      await getDanyBotSecureBiometricSession();

    if (
      !secureSession?.user ||
      !secureSession?.token
    ) {
      await removeDanyBotSecureBiometricSession();

      await showAuthMessage({
        title:
          'Acceso biométrico no disponible',

        text:
          'Inicia sesión nuevamente con tu correo o Google.',

        icon:
          'info'
      });

      return;
    }

    /*
     * El JWT de DANYBOT dura 7 días.
     */
    if (
      isDanyBotBiometricTokenExpired(
        secureSession.token
      )
    ) {
      await removeDanyBotSecureBiometricSession();

      await showAuthMessage({
        title:
          'Sesión vencida',

        text:
          'Por seguridad, inicia sesión nuevamente. Después podrás volver a usar tu huella.',

        icon:
          'info'
      });

      return;
    }

    /*
     * Restauramos exactamente la misma sesión
     * que utiliza actualmente DANYBOT.
     */
    saveUserSession(
      secureSession.user,
      secureSession.token
    );

    redirectToDashboard();

  } catch (error) {
    console.warn(
      'Acceso biométrico cancelado o rechazado:',
      error
    );

  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


// ==============================================
// BOTÓN DEL LOGIN
// ==============================================

async function setupDanyBotBiometricLogin() {
  const button =
    document.getElementById(
      'biometricLoginButton'
    );

  if (!button) {
    return;
  }

  button.hidden = true;

  if (!isDanyBotNativeBiometricApp()) {
    return;
  }

  if (
    localStorage.getItem(
      DANYBOT_BIOMETRIC_ENABLED_KEY
    ) !== 'true'
  ) {
    return;
  }

  const BiometricAuth =
    getDanyBotBiometricPlugin();

  if (!BiometricAuth) {
    return;
  }

  try {
    const biometry =
      await BiometricAuth.checkBiometry();

    if (!biometry?.isAvailable) {
      return;
    }

    button.hidden = false;

    button.addEventListener(
      'click',
      loginWithDanyBotBiometric
    );

  } catch (error) {
    console.warn(
      'No se pudo preparar el login biométrico:',
      error
    );
  }
}


window.offerDanyBotBiometricAccess =
  offerDanyBotBiometricAccess;

window.loginWithDanyBotBiometric =
  loginWithDanyBotBiometric;


document.addEventListener(
  'DOMContentLoaded',
  setupDanyBotBiometricLogin
);