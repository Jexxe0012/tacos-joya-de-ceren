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
    const campoClave = document.getElementById('reg-admin-key');
    adminKeyField.hidden = e.target.value !== 'admin';
    // Limpiar el input (y su error) si se oculta, así no queda basura al enviar
    if (adminKeyField.hidden) {
      campoClave.value = '';
      Valida.limpiar(campoClave);
    }
    // Al elegir un perfil se quita el error del grupo de perfiles.
    Valida.limpiar(e.target.closest('.role-picker'));
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

const registerForm  = document.getElementById('register-form');
const rolesRegistro = registerForm.querySelector('.role-picker');
const regPass       = document.getElementById('reg-password');
const regPass2      = document.getElementById('reg-password2');

// Solo letras (con tildes, ñ y ü) y espacios.
const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;

const rolRegistro = () => registerForm.querySelector('input[name="reg-role"]:checked')?.value;

/**
 * Regla de negocio que cruza datos: el correo no puede estar ya en la DB.
 * .some() devuelve true si al menos un usuario cumple.
 */
function correoRegistrado(correo) {
  const buscado = correo.trim().toLowerCase();
  return DB.getAll('usuarios').some(u => u.correo.toLowerCase() === buscado);
}

/**
 * Contraseña: 8 o más caracteres, con al menos una letra y un número.
 * Son revisiones separadas (y no una sola regex) para que cada mensaje
 * diga exactamente qué falta. No se usa Valida.texto porque quita los
 * espacios de los extremos, y en una contraseña cuentan.
 */
function reglaPassword(v) {
  if (!v) return 'Este campo es obligatorio.';
  if (v.length < 8) return 'Usa al menos 8 caracteres.';
  if (!/[a-záéíóúüñ]/i.test(v)) return 'Incluye al menos una letra.';
  if (!/[0-9]/.test(v)) return 'Incluye al menos un número.';
  return '';
}

function reglaConfirmacion(v) {
  if (!v) return 'Repite la contraseña.';
  return v === regPass.value ? '' : 'Las contraseñas no coinciden.';
}

// La clave solo se pide si eligió el perfil de administrador.
function reglaClaveAdmin(v) {
  if (rolRegistro() !== 'admin') return '';
  if (!v.trim()) return 'Escribe la clave de administrador.';
  return v.trim() === ADMIN_KEY ? '' : 'La clave de administrador no es correcta.';
}

/**
 * En el correo, primero el formato; si está bien (Valida.texto devuelve ""),
 * el || pasa a revisar si ya existe. Así el error aparece al salir del
 * campo, sin esperar al envío.
 */
const validarRegistro = Valida.enVivo(registerForm, {
  'reg-nombre': v => Valida.texto(v, { min: 3, max: 60, patron: REGEX_NOMBRE, mensaje: 'Usa solo letras y espacios.' }),
  'reg-email': v => Valida.texto(v, { min: 1, patron: REGEX_EMAIL, mensaje: 'El correo no tiene un formato válido.' })
    || (correoRegistrado(v) ? 'Ya existe una cuenta con ese correo.' : ''),
  'reg-password': reglaPassword,
  'reg-password2': reglaConfirmacion,
  'reg-admin-key': reglaClaveAdmin
});

/**
 * La confirmación se revisa mientras se escribe, y también si cambia la
 * contraseña de arriba. Mientras lo escrito todavía puede llegar a ser la
 * contraseña (es su inicio), no se marca error: así no regaña desde la
 * primera letra.
 */
function revisarConfirmacion() {
  const v = regPass2.value;
  const vaBien = regPass.value.startsWith(v) && v.length < regPass.value.length;
  if (!v || vaBien) {
    Valida.limpiar(regPass2);
    return;
  }
  const mensaje = reglaConfirmacion(v);
  if (mensaje) Valida.marcar(regPass2, mensaje);
  else Valida.limpiar(regPass2);
}
regPass.addEventListener('input', revisarConfirmacion);
regPass2.addEventListener('input', revisarConfirmacion);

/**
 * Al hacer submit en el formulario de registro:
 * 1. Revisar todos los campos y que haya un perfil elegido.
 * 2. Crear el usuario en DB y avisar con UI.exito.
 * 3. Volver al login con el correo y el perfil listos, para que entre
 *    con la contraseña que acaba de crear.
 */
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Validar.
  const camposOk = validarRegistro();
  const rolElegido = rolRegistro();
  if (!rolElegido) {
    Valida.marcar(rolesRegistro, 'Selecciona un perfil (Admin o Empleado).');
    if (camposOk) rolesRegistro.querySelector('input').focus();
  }
  if (!camposOk || !rolElegido) return;

  // 2. Crear el usuario. El correo va en minúsculas (Ana@X == ana@x).
  const reactivar = Valida.bloquearEnvio(registerForm.querySelector('button[type="submit"]'));
  const correo = document.getElementById('reg-email').value.trim().toLowerCase();
  DB.create('usuarios', {
    nombre: document.getElementById('reg-nombre').value.trim(),
    correo: correo,
    pass: regPass.value,
    rol: rolElegido
  });
  await UI.exito('Cuenta creada', 'Ya puedes iniciar sesión.');

  // 3. reset() también borra las marcas (lo hace Valida.enVivo). Los radios
  //    se desmarcan sin avisar, así que el campo de la clave se oculta a mano.
  registerForm.reset();
  document.getElementById('admin-key-field').hidden = true;
  reactivar();

  mostrarVista('login');
  campoCorreo.value = correo;
  campoPass.value = '';
  loginForm.querySelector(`input[name="role"][value="${rolElegido}"]`).checked = true;
  campoPass.focus();
});