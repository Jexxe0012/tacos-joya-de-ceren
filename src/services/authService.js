/**
 * authService — reglas de la sesión simulada del equipo, sin interfaz.
 *
 * Conserva el comportamiento del prototipo: las mismas cuentas de prueba,
 * la clave de demostración para registrar un administrador, el bloqueo
 * tras varios intentos fallidos y una sesión que sigue válida al recargar.
 *
 * Ninguna función de aquí muestra avisos ni toca el DOM. Cuando algo no
 * cumple una regla se lanza un ErrorAcceso que dice en qué campo está el
 * problema, y el formulario decide cómo mostrarlo.
 */

import { db } from "./storage.js";

/** Claves de localStorage que usa la sesión. No cambian desde el prototipo. */
export const CLAVE_SESION = "sesion";
const CLAVE_FALLOS = "loginFallos";
const CLAVE_BLOQUEO = "loginBloqueadoHasta";

export const ROL_ADMIN = "admin";
export const ROL_EMPLEADO = "empleado";
export const ROLES = [ROL_ADMIN, ROL_EMPLEADO];

/** Clave de demostración para registrar una cuenta de administrador. */
export const CLAVE_ADMIN = "TJC-ADMIN-2025";

/** Intentos seguidos antes de bloquear el acceso, y cuánto dura el bloqueo. */
export const MAX_INTENTOS = 5;
export const SEGUNDOS_BLOQUEO = 60;

/** Cuentas de prueba del prototipo. Se siembran solo si no hay usuarios. */
export const CUENTAS_PRUEBA = [
  { correo: "admin@joyadeceren.sv", pass: "admin123", rol: ROL_ADMIN, nombre: "Administrador" },
  { correo: "empleado@joyadeceren.sv", pass: "empleado123", rol: ROL_EMPLEADO, nombre: "Empleado" }
];

/**
 * Error de acceso con el campo que lo causó.
 * "campo" permite marcar el input correcto: "correo", "contrasena",
 * "rol", "nombre", "confirmacion", "claveAdmin" o "" si es general.
 */
export class ErrorAcceso extends Error {
  constructor(mensaje, campo = "", { cuentaIntento = false } = {}) {
    super(mensaje);
    this.name = "ErrorAcceso";
    this.campo = campo;
    // Solo los intentos que llegaron a compararse con los datos guardados
    // cuentan para el bloqueo: un campo vacío no es un intento de entrar.
    this.cuentaIntento = cuentaIntento;
  }
}

/** Ruta de inicio de cada rol. El administrador ve el resumen; el empleado, sus turnos. */
export function rutaInicio(rol) {
  return rol === ROL_ADMIN ? "/dashboard" : "/turnos";
}

/** Siembra las cuentas de prueba. Llamarla dos veces deja el mismo resultado. */
export function sembrarCuentasPrueba() {
  return db.seed("usuarios", CUENTAS_PRUEBA);
}

/** Normaliza un correo para comparar: sin espacios y en minúsculas. */
function normalizarCorreo(correo) {
  return String(correo ?? "").trim().toLowerCase();
}

/** Busca la cuenta por correo, sin distinguir mayúsculas. */
export function buscarCuenta(correo) {
  const buscado = normalizarCorreo(correo);
  return db.getAll("usuarios").find(usuario => normalizarCorreo(usuario.correo) === buscado);
}

/** true si ya existe una cuenta con ese correo. */
export function correoRegistrado(correo) {
  return buscarCuenta(correo) !== undefined;
}

/**
 * Lee la sesión guardada.
 * Devuelve null si no hay sesión, si el texto está dañado o si el rol no
 * es uno de los dos conocidos: así una sesión inventada a mano no abre
 * pantallas de administrador.
 */
export function leerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
    return sesion && ROLES.includes(sesion.rol) ? sesion : null;
  } catch {
    return null;
  }
}

/** Guarda la sesión con la forma que ya esperaba el prototipo. */
function guardarSesion(usuario) {
  const sesion = {
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    rol: usuario.rol,
    loginAt: Date.now()
  };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

/** Borra la sesión persistida. El aviso y la navegación son de la interfaz. */
export function borrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

// ---------- Bloqueo tras varios intentos fallidos ----------

/**
 * Los fallos y la hora de desbloqueo viven en localStorage, no en una
 * variable, para que recargar la página no salte el bloqueo.
 */
export function msDeBloqueo() {
  const hasta = Number(localStorage.getItem(CLAVE_BLOQUEO));
  const restan = hasta - Date.now();
  return restan > 0 ? restan : 0;
}

export function estaBloqueado() {
  return msDeBloqueo() > 0;
}

export function limpiarBloqueo() {
  localStorage.removeItem(CLAVE_BLOQUEO);
  localStorage.removeItem(CLAVE_FALLOS);
}

/** Suma un fallo y, al llegar al máximo, bloquea el acceso. */
function registrarFallo() {
  const fallos = Number(localStorage.getItem(CLAVE_FALLOS)) + 1;
  if (fallos < MAX_INTENTOS) {
    localStorage.setItem(CLAVE_FALLOS, String(fallos));
    return false;
  }
  localStorage.removeItem(CLAVE_FALLOS);
  localStorage.setItem(CLAVE_BLOQUEO, String(Date.now() + SEGUNDOS_BLOQUEO * 1000));
  return true;
}

// ---------- Operaciones ----------

/**
 * Valida la cuenta y establece la sesión. Devuelve la sesión creada.
 *
 * Lanza ErrorAcceso con el campo que falló. Cuando el error viene de
 * comparar con los datos guardados también suma un intento, y al llegar
 * al máximo el error trae bloqueado: true.
 */
export function iniciarSesion({ correo, contrasena, rol }) {
  if (estaBloqueado()) {
    throw new ErrorAcceso(
      `Espera ${Math.ceil(msDeBloqueo() / 1000)} segundos antes de volver a intentarlo.`,
      ""
    );
  }

  const fallar = (mensaje, campo) => {
    const bloqueado = registrarFallo();
    const error = new ErrorAcceso(mensaje, campo, { cuentaIntento: true });
    error.bloqueado = bloqueado;
    throw error;
  };

  const usuario = buscarCuenta(correo);
  if (!usuario) fallar("No existe una cuenta con ese correo.", "correo");
  if (usuario.pass !== contrasena) fallar("Contraseña incorrecta.", "contrasena");
  if (usuario.rol !== rol) fallar("El perfil elegido no coincide con tu cuenta.", "rol");

  limpiarBloqueo();
  return guardarSesion(usuario);
}

/**
 * Crea una cuenta nueva y devuelve el usuario guardado. No inicia sesión:
 * el prototipo deja al usuario en el login con su correo y perfil listos.
 *
 * Las reglas de formato las revisa el formulario con utils/validaciones.
 * Aquí quedan las que necesitan los datos guardados o la clave de
 * demostración, para que no se puedan saltar desde la interfaz.
 */
export function registrarUsuario({ nombre, correo, contrasena, rol, claveAdmin = "" }) {
  const limpio = normalizarCorreo(correo);
  if (!ROLES.includes(rol)) {
    throw new ErrorAcceso("Selecciona un perfil (Admin o Empleado).", "rol");
  }
  if (correoRegistrado(limpio)) {
    throw new ErrorAcceso("Ya existe una cuenta con ese correo.", "correo");
  }
  if (rol === ROL_ADMIN && claveAdmin.trim() !== CLAVE_ADMIN) {
    throw new ErrorAcceso(
      claveAdmin.trim() ? "La clave de administrador no es correcta." : "Escribe la clave de administrador.",
      "claveAdmin"
    );
  }
  return db.create("usuarios", {
    nombre: String(nombre).trim(),
    correo: limpio,
    pass: contrasena,
    rol
  });
}
