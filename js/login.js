/**
 * login.js — Lógica del login y registro de Tacos Joya de Cerén.
 * 
 * Requiere que DB (de storage.js) esté cargado antes que este script.
 */

/* ============================================
   Usuarios de prueba (seed)
   ============================================ */

/**
 * Siembra 2 usuarios de prueba si la colección "usuarios" está vacía.
 * Se ejecuta al cargar la página. Es idempotente: si ya hay usuarios,
 * no hace nada gracias a DB.seed().
 */
DB.seed("usuarios", [
  {
    correo: "admin@joyadeceren.sv",
    pass: "admin123",
    rol: "admin",
    nombre: "Administrador"
  },
  {
    correo: "empleado@joyadeceren.sv",
    pass: "empleado123",
    rol: "empleado",
    nombre: "Empleado"
  }
]);

/* ============================================
   Toggle entre vista de login y de registro
   ============================================ */

const loginView    = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const cardTitle    = document.getElementById("card-title");
const cardSubtitle = document.getElementById("card-subtitle");

/**
 * Muestra una vista y oculta la otra usando el atributo hidden.
 * También cambia el título y subtítulo de la tarjeta, limpia los
 * mensajes de error y pone el foco en el primer campo de la vista
 * nueva (para quien navega con teclado).
 */
function mostrarVista(vista) {
  const esRegistro = vista === "registro";

  loginView.hidden    = esRegistro;
  registerView.hidden = !esRegistro;

  cardTitle.textContent    = esRegistro ? "Crear cuenta" : "Bienvenido";
  cardSubtitle.textContent = esRegistro
    ? "Completa tus datos para registrarte"
    : "Ingresa al sistema según tu rol";

  document.getElementById("login-error").textContent    = "";
  document.getElementById("register-error").textContent = "";

  document.getElementById(esRegistro ? "reg-nombre" : "email").focus();
}

document.getElementById("show-register").addEventListener("click", () => mostrarVista("registro"));
document.getElementById("show-login").addEventListener("click", () => mostrarVista("login"));

/* ============================================
   Campo dinámico: clave de administrador
   ============================================ */

/**
 * Cuando el usuario elige un rol en el formulario de registro,
 * mostramos u ocultamos el campo "Clave de administrador".
 * Solo aparece si eligió el rol "admin".
 */
document.querySelectorAll('input[name="reg-role"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const adminKeyField = document.getElementById('admin-key-field');
    adminKeyField.hidden = e.target.value !== 'admin';
    // Limpiar el input si se oculta, así no queda basura al enviar
    if (adminKeyField.hidden) {
      document.getElementById('reg-admin-key').value = '';
    }
  });
});

/* ============================================
   Handler del login: validar y mostrar errores
   ============================================ */

/**
 * Regex para validar formato de correo electrónico.
 * Acepta cualquier cosa sin espacios/@ + "@" + algo + "." + algo.
 * No es "perfecto" pero es el estándar que usa HTML5.
 */
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_KEY = 'TJC-ADMIN-2025';

/**
 * Al hacer submit en el formulario de login:
 * 1. Prevenir el submit HTML default (que recargaría la página).
 * 2. Leer los tres campos: correo, contraseña, rol elegido.
 * 3. Validar formato de cada uno; si falla, mostrar error y detener.
 * 4. Si todo pasa, por ahora solo log en consola.
 *    (El paso 5d-2 va a agregar la búsqueda en DB y la redirección.)
 */
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();

  // Leer valores. .trim() quita espacios al inicio/final.
  // .toLowerCase() normaliza el correo (Ana@X == ana@x).
  const correo = document.getElementById('email').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;

  // El radio marcado (si hay). ?. evita error si ninguno está marcado.
  const rolElegido = document.querySelector('input[name="role"]:checked')?.value;

  // Zona donde mostraremos errores. Limpiamos residuo de intentos anteriores.
  const errorBox = document.getElementById('login-error');
  errorBox.textContent = '';

  // Guard clauses: validamos y salimos apenas una falla.
  if (!correo) {
    errorBox.textContent = 'Ingresa tu correo electrónico.';
    return;
  }
  if (!REGEX_EMAIL.test(correo)) {
    errorBox.textContent = 'El correo no tiene un formato válido.';
    return;
  }
  if (!pass) {
    errorBox.textContent = 'Ingresa tu contraseña.';
    return;
  }
  if (pass.length < 6) {
    errorBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (!rolElegido) {
    errorBox.textContent = 'Selecciona tu perfil (Admin o Empleado).';
    return;
  }

  // Si llegamos acá, formato válido. La verificación contra DB viene en 5d-2.
  // Buscar el usuario en la DB por correo.
  // .find() devuelve el primer elemento que cumple, o undefined.
  const usuarios = DB.getAll('usuarios');
  const usuario = usuarios.find(u => u.correo.toLowerCase() === correo);

  if (!usuario) {
    errorBox.textContent = 'No existe una cuenta con ese correo.';
    return;
  }
  if (usuario.pass !== pass) {
    errorBox.textContent = 'Contraseña incorrecta.';
    return;
  }
  if (usuario.rol !== rolElegido) {
    errorBox.textContent = 'El rol seleccionado no coincide con tu cuenta.';
    return;
  }

  // Todo OK: guardamos la sesión activa (sin contraseña).
  localStorage.setItem('sesion', JSON.stringify({
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    rol: usuario.rol,
    loginAt: Date.now()
  }));

  // Redirigir según rol.
  if (usuario.rol === 'admin') {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'turnos.html';
  }
});

/* ============================================
   Handler del registro
   ============================================ */

/**
 * Al hacer submit en el formulario de registro:
 * 1. Prevenir el submit HTML default.
 * 2. Leer todos los campos.
 * 3. Validar formato, coincidencia de contraseñas, correo único.
 * 4. Si el rol es admin, validar la clave de administrador.
 * 5. Si todo OK: crear el usuario en DB, guardar sesión (auto-login),
 *    y redirigir según su rol.
 */
document.getElementById('register-form').addEventListener('submit', (e) => {
  e.preventDefault();

  // Leer valores
  const nombre = document.getElementById('reg-nombre').value.trim();
  const correo = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('reg-password').value;
  const pass2 = document.getElementById('reg-password2').value;
  const rolElegido = document.querySelector('input[name="reg-role"]:checked')?.value;
  const claveAdmin = document.getElementById('reg-admin-key').value.trim();

  const errorBox = document.getElementById('register-error');
  errorBox.textContent = '';

  // Validaciones de formato
  if (!nombre) {
    errorBox.textContent = 'Ingresa tu nombre completo.';
    return;
  }
  if (nombre.length < 2) {
    errorBox.textContent = 'El nombre debe tener al menos 2 caracteres.';
    return;
  }
  if (!correo) {
    errorBox.textContent = 'Ingresa tu correo electrónico.';
    return;
  }
  if (!REGEX_EMAIL.test(correo)) {
    errorBox.textContent = 'El correo no tiene un formato válido.';
    return;
  }
  if (!pass) {
    errorBox.textContent = 'Ingresa una contraseña.';
    return;
  }
  if (pass.length < 6) {
    errorBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (pass !== pass2) {
    errorBox.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  if (!rolElegido) {
    errorBox.textContent = 'Selecciona un perfil (Admin o Empleado).';
    return;
  }

  // Verificar que el correo no exista ya
  const existente = DB.getAll('usuarios').find(u => u.correo.toLowerCase() === correo);
  if (existente) {
    errorBox.textContent = 'Ya existe una cuenta con ese correo.';
    return;
  }

  // Si eligió admin, verificar la clave
  if (rolElegido === 'admin' && claveAdmin !== ADMIN_KEY) {
    errorBox.textContent = 'La clave de administrador es incorrecta.';
    return;
  }

  // Todo OK: crear el usuario
  const nuevoUsuario = DB.create('usuarios', {
    nombre: nombre,
    correo: correo,
    pass: pass,
    rol: rolElegido
  });

  // Auto-login: guardar sesión (sin contraseña)
  localStorage.setItem('sesion', JSON.stringify({
    id: nuevoUsuario.id,
    correo: nuevoUsuario.correo,
    nombre: nuevoUsuario.nombre,
    rol: nuevoUsuario.rol,
    loginAt: Date.now()
  }));

  // Redirigir según rol
  if (nuevoUsuario.rol === 'admin') {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'turnos.html';
  }
});