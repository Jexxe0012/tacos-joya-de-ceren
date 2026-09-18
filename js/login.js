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

console.log("login.js cargado. Usuarios en DB:", DB.getAll("usuarios"));

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