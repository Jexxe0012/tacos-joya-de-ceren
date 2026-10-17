/**
 * login.js — Lógica del login y registro de Tacos Joya de Cerén.
 * 
 * Requiere storage.js (DB), guard.js (Guard), ui.js (UI) y validacion.js
 * (Valida) cargados antes que este script.
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
 * También cambia el título y subtítulo de la tarjeta, quita las
 * marcas de error y pone el foco en el primer campo de la vista
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

  document.querySelectorAll(".is-invalid").forEach(campo => Valida.limpiar(campo));
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

const loginForm   = document.getElementById('login-form');
const loginBoton  = loginForm.querySelector('button[type="submit"]');
const rolesLogin  = loginForm.querySelector('.role-picker');
const campoCorreo = document.getElementById('email');
const campoPass   = document.getElementById('password');

/**
 * Validación mientras se escribe: formato del correo y largo mínimo
 * de la contraseña. Lo que depende de la DB (si el correo existe, si
 * la contraseña es la correcta) se revisa al enviar.
 * El mínimo es 6 y no 8 para que puedan entrar las cuentas creadas
 * antes de la regla nueva del registro.
 */
const validarLogin = Valida.enVivo(loginForm, {
  email: v => Valida.texto(v, { min: 1, patron: REGEX_EMAIL, mensaje: 'El correo no tiene un formato válido.' }),
  password: v => Valida.texto(v, { min: 6 })
});

// Al elegir un perfil se quita el error del grupo de perfiles.
loginForm.querySelectorAll('input[name="role"]').forEach(radio => {
  radio.addEventListener('change', () => Valida.limpiar(rolesLogin));
});

/* ============================================
   Bloqueo tras 5 intentos fallidos seguidos
   ============================================ */

/**
 * Los fallos y la hora de desbloqueo se guardan en localStorage, no en
 * una variable, para que recargar la página no salte el bloqueo.
 * Solo cuentan los intentos que llegan a compararse con la DB: un campo
 * vacío o mal escrito no es un intento de entrar.
 */
const MAX_INTENTOS = 5;
const SEGUNDOS_BLOQUEO = 60;
const TEXTO_BOTON_LOGIN = loginBoton.textContent;

function estaBloqueado() {
  return Number(localStorage.getItem('loginBloqueadoHasta')) > Date.now();
}

/**
 * Mientras dure el bloqueo, el botón queda desactivado y muestra los
 * segundos que faltan. Se actualiza cada segundo.
 */
function iniciarCuentaRegresiva() {
  const reactivar = Valida.bloquearEnvio(loginBoton);

  const actualizar = () => {
    const faltan = Math.ceil((Number(localStorage.getItem('loginBloqueadoHasta')) - Date.now()) / 1000);
    if (faltan > 0) {
      loginBoton.textContent = `Espera ${faltan} s`;
      return;
    }
    clearInterval(reloj);
    localStorage.removeItem('loginBloqueadoHasta');
    loginBoton.textContent = TEXTO_BOTON_LOGIN;
    reactivar();
  };

  const reloj = setInterval(actualizar, 1000);
  actualizar();
}

/**
 * Marca el campo que causó el error, le pone el foco (en el grupo de
 * perfiles, al primer perfil) y suma un fallo. Al quinto, bloquea.
 */
function marcarFallo(campo, mensaje) {
  Valida.marcar(campo, mensaje);
  (campo.querySelector('input') || campo).focus();

  const fallos = Number(localStorage.getItem('loginFallos')) + 1;
  if (fallos < MAX_INTENTOS) {
    localStorage.setItem('loginFallos', fallos);
    return;
  }
  localStorage.removeItem('loginFallos');
  localStorage.setItem('loginBloqueadoHasta', Date.now() + SEGUNDOS_BLOQUEO * 1000);
  UI.error('Demasiados intentos', `Espera ${SEGUNDOS_BLOQUEO} segundos antes de volver a intentarlo.`);
  iniciarCuentaRegresiva();
}

// Si se recarga la página durante un bloqueo, la cuenta regresiva sigue.
if (estaBloqueado()) iniciarCuentaRegresiva();

/**
 * Al hacer submit en el formulario de login:
 * 1. Revisar el formato de los campos y que haya un perfil elegido.
 * 2. Comparar con la DB; cada error se marca en el campo que lo causó.
 * 3. Si todo está bien, guardar la sesión, dar la bienvenida y redirigir.
 */
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // Enter dentro de un campo también envía el formulario: por eso se revisa aquí.
  if (estaBloqueado()) return;

  // 1. Formato. ?. evita error si ningún perfil está marcado.
  const formatoOk = validarLogin();
  const rolElegido = loginForm.querySelector('input[name="role"]:checked')?.value;
  if (!rolElegido) {
    Valida.marcar(rolesLogin, 'Selecciona tu perfil (Admin o Empleado).');
    if (formatoOk) rolesLogin.querySelector('input').focus();
  }
  if (!formatoOk || !rolElegido) return;

  // 2. DB. .toLowerCase() normaliza el correo (Ana@X == ana@x).
  // .find() devuelve el primer elemento que cumple, o undefined.
  const correo = campoCorreo.value.trim().toLowerCase();
  const usuario = DB.getAll('usuarios').find(u => u.correo.toLowerCase() === correo);

  if (!usuario) {
    marcarFallo(campoCorreo, 'No existe una cuenta con ese correo.');
    return;
  }
  if (usuario.pass !== campoPass.value) {
    marcarFallo(campoPass, 'Contraseña incorrecta.');
    return;
  }
  if (usuario.rol !== rolElegido) {
    marcarFallo(rolesLogin, 'El perfil elegido no coincide con tu cuenta.');
    return;
  }

  // 3. Todo OK: se reinicia el contador y se guarda la sesión (sin contraseña).
  localStorage.removeItem('loginFallos');
  localStorage.setItem('sesion', JSON.stringify({
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    rol: usuario.rol,
    loginAt: Date.now()
  }));

  // El aviso necesita un momento en pantalla: si redirigimos de inmediato,
  // desaparece junto con la página. Mientras tanto, el botón no responde.
  Valida.bloquearEnvio(loginBoton);
  UI.aviso(`Bienvenido, ${usuario.nombre}`);
  setTimeout(() => Guard.irAlInicio(), 1500);
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
  Guard.irAlInicio();
});