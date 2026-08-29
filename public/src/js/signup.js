function signupT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key) || fallback;
  }

  return fallback;
}

function getSignupLanguage() {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
  ) {
    return window.DANYBOT_I18N.getLanguage();
  }

  return "es";
}

function getSignupResponseText(data, key, fallback) {
  if (getSignupLanguage() === "en") {
    return signupT(key, fallback);
  }

  return (
    data?.error ||
    data?.mensaje ||
    data?.message ||
    signupT(key, fallback)
  );
}
const input = document.querySelector("#phone");
const LOGIN_PAGE = "login_google.html";

const phoneInput = window.intlTelInput(input, {
  initialCountry: "auto",
  geoIpLookup: function(callback) {
    fetch("https://ipapi.co/json")
      .then((res) => res.json())
      .then((data) => callback(data.country_code))
      .catch(() => callback("us"));
  },
  utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js"
});

function showSignupMessage({ title, text, icon }) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonColor: "#960018"
    });
  }

  alert(text || title);
  return Promise.resolve();
}

function getSignupData() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const date_of_birth = document.getElementById("date-of-birth").value;
  const phone_number = phoneInput.getNumber() || document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirm_password = document.getElementById("confirm-password").value;

  return {
    name,
    email,
    date_of_birth,
    phone_number,
    password,
    confirm_password
  };
}

function setSubmitButtonLoading(isLoading) {
  const submitButton = document.getElementById("btn-submit");

  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;

  submitButton.textContent = isLoading
    ? signupT("signup.sendingCode", "Enviando código...")
    : signupT("signup.createAccount", "Crear cuenta");
}

async function sendVerificationCode(signupData) {
  const response = await fetch("/api/auth/send-verification-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
      date_of_birth: signupData.date_of_birth,
      phone_number: signupData.phone_number
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getSignupResponseText(data, "signup.verificationSendFailed", "No se pudo enviar el código de verificación."));
  }

  return data;
}

async function verifyEmailCode(email, code) {
  const response = await fetch("/api/auth/verify-email-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      code
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getSignupResponseText(data, "signup.verificationFailed", "No se pudo verificar el código."));
  }

  return data;
}

async function openVerificationCodeModal(email) {
  const result = await Swal.fire({
    title: signupT("signup.verifyEmailTitle", "Verifica tu correo"),
    html: `
      <p>
        ${signupT("signup.verificationSentText", "Te enviamos un código de verificación a:")}
      </p>
      <strong>${email}</strong>
      <p style="margin-top: 12px;">
        ${signupT("signup.checkInboxText", "Revisa tu bandeja de entrada o spam.")}
      </p>
    `,
    input: "text",
    inputLabel: signupT("signup.verificationCode", "Código de verificación"),
    inputPlaceholder: signupT("signup.verificationPlaceholder", "Ej: 123456"),
    inputAttributes: {
      maxlength: 6,
      autocapitalize: "off",
      autocorrect: "off"
    },
    showCancelButton: true,
    confirmButtonText: signupT("signup.verifyCreateAccount", "Verificar y crear cuenta"),
    cancelButtonText: signupT("signup.cancel", "Cancelar"),
    confirmButtonColor: "#960018",
    cancelButtonColor: "#6b7280",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (code) => {
      const cleanCode = String(code || "").trim();

      if (!cleanCode) {
        Swal.showValidationMessage(signupT("signup.enterVerificationCode", "Ingresa el código que llegó a tu correo."));
        return false;
      }

      try {
        const data = await verifyEmailCode(email, cleanCode);
        return data;
      } catch (error) {
        Swal.showValidationMessage(error.message);
        return false;
      }
    }
  });

  return result;
}

document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.target;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const signupData = getSignupData();

  if (signupData.password !== signupData.confirm_password) {
    await showSignupMessage({
      title: signupT("signup.passwordsDifferentTitle", "Contraseñas diferentes"),
      text: signupT("signup.passwordsMismatch", "Las contraseñas no coinciden."),
      icon: "warning"
    });
    return;
  }

  try {
    setSubmitButtonLoading(true);

    await sendVerificationCode(signupData);

    setSubmitButtonLoading(false);

    const verificationResult = await openVerificationCodeModal(signupData.email);

    if (!verificationResult.isConfirmed) {
      setSubmitButtonLoading(false);
      return;
    }

    localStorage.setItem("userEmail", signupData.email);

    await showSignupMessage({
      title: signupT("signup.accountCreatedTitle", "Cuenta creada"),
      text: getSignupResponseText(verificationResult.value, "signup.accountCreatedText", "Tu cuenta fue creada y el correo fue verificado correctamente."),
      icon: "success"
    });

    window.location.href = LOGIN_PAGE;

  } catch (error) {
    console.error("Error en registro:", error);

    setSubmitButtonLoading(false);

    await showSignupMessage({
      title: signupT("signup.accountCreateFailedTitle", "No se pudo crear la cuenta"),
      text: error.message || signupT("signup.accountCreateFailedText", "Ocurrió un error al registrarte."),
      icon: "error"
    });
  }
});

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}
