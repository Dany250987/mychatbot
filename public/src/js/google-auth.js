function handleCredentialResponse(response) {
    const data = jwt_decode(response.credential);
    console.log("✅ Usuario autenticado:", data);
  
    const name = data.name;
    const email = data.email;
  
    // 🔁 ENVÍA al backend
    fetch('/api/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      console.log("📥 Usuario logueado con Google:", data.user);
    })
    .catch(err => {
      console.error("❌ Error al enviar a la API:", err);
    });
  }
  
  
  