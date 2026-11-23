/**
 * validaciones — reglas compartidas por todos los formularios.
 *
 * Cada regla recibe un valor y devuelve el mensaje que verá el usuario,
 * o "" si el valor está bien. No tocan el DOM ni muestran avisos: el
 * formulario guarda el mensaje en su estado y React lo pinta.
 *
 * Son las mismas reglas del objeto global Valida, sin la parte que
 * marcaba los campos a mano con clases de Bootstrap.
 */

import { FORMATO_FECHA, fechaHoyLocal, haceDias } from "./fechas.js";

/** Formato de correo: el mismo que valida HTML5. */
export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nombres de persona: letras con tildes, ñ, ü y espacios. */
export const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;

/**
 * Sin "min" el texto es opcional; con min 1 o más, es obligatorio.
 * "mensaje" es lo que se muestra cuando el texto no cumple el "patron".
 */
export function texto(valor, { min = 0, max = Infinity, patron, mensaje } = {}) {
  const limpio = String(valor ?? "").trim();
  if (!limpio) return min > 0 ? "Este campo es obligatorio." : "";
  if (limpio.length < min) return `Escribe al menos ${min} caracteres.`;
  if (limpio.length > max) return `Escribe como máximo ${max} caracteres.`;
  if (patron && !patron.test(limpio)) return mensaje || "El formato no es válido.";
  return "";
}

/** min y max incluyen el límite: para "mayor que 0" se usa min: 0.01. */
export function numero(valor, { min, max, entero = false } = {}) {
  const limpio = String(valor ?? "").trim();
  const n = Number(limpio);
  // Number("") da 0, por eso el vacío se revisa aparte.
  if (limpio === "" || !Number.isFinite(n)) return "Ingresa un número.";
  if (entero && !Number.isInteger(n)) return "Ingresa un número entero, sin decimales.";
  if (min !== undefined && n < min) return `El valor mínimo es ${min}.`;
  if (max !== undefined && n > max) return `El valor máximo es ${max}.`;
  return "";
}

/** Fechas en texto "AAAA-MM-DD", comparadas como texto en hora local. */
export function fecha(valor, { noFutura = false, noPasada = false, maxDiasAtras } = {}) {
  if (!valor) return "Elige una fecha.";
  if (!FORMATO_FECHA.test(valor)) return "La fecha no es válida.";
  const hoy = fechaHoyLocal();
  if (noFutura && valor > hoy) return "La fecha no puede ser posterior a hoy.";
  if (noPasada && valor < hoy) return "La fecha no puede ser anterior a hoy.";
  if (maxDiasAtras !== undefined && valor < haceDias(maxDiasAtras)) {
    return `La fecha no puede ser de hace más de ${maxDiasAtras} días.`;
  }
  return "";
}

/** Hora "HH:MM" tal como la entrega un input type="time". */
export function hora(valor) {
  if (!valor) return "Elige una hora.";
  if (!/^\d{2}:\d{2}$/.test(valor)) return "La hora no es válida.";
  const [horas, minutos] = valor.split(":").map(Number);
  if (horas > 23 || minutos > 59) return "La hora no es válida.";
  return "";
}

/** Correo electrónico obligatorio con formato válido. */
export function correo(valor) {
  return texto(valor, {
    min: 1,
    patron: REGEX_CORREO,
    mensaje: "El correo no tiene un formato válido."
  });
}

/** Nombre de persona: de 3 a 60 caracteres, solo letras y espacios. */
export function nombrePersona(valor) {
  return texto(valor, {
    min: 3,
    max: 60,
    patron: REGEX_NOMBRE,
    mensaje: "Usa solo letras y espacios."
  });
}

/**
 * Contraseña nueva: 8 o más caracteres, con al menos una letra y un número.
 * Son revisiones separadas, y no una sola regex, para que cada mensaje diga
 * qué falta. No pasa por texto() porque ese quita los espacios de los
 * extremos, y en una contraseña cuentan.
 */
export function contrasenaNueva(valor) {
  const clave = String(valor ?? "");
  if (!clave) return "Este campo es obligatorio.";
  if (clave.length < 8) return "Usa al menos 8 caracteres.";
  if (!/[a-záéíóúüñ]/i.test(clave)) return "Incluye al menos una letra.";
  if (!/[0-9]/.test(clave)) return "Incluye al menos un número.";
  return "";
}

/**
 * Confirmación de contraseña. Mientras lo escrito todavía puede llegar a
 * ser la contraseña (es su inicio) no se marca error, así no regaña desde
 * la primera letra; para eso se pasa parcial: true.
 */
export function confirmacion(valor, original, { parcial = false } = {}) {
  const repetida = String(valor ?? "");
  const clave = String(original ?? "");
  if (!repetida) return parcial ? "" : "Repite la contraseña.";
  if (parcial && clave.startsWith(repetida) && repetida.length < clave.length) return "";
  return repetida === clave ? "" : "Las contraseñas no coinciden.";
}

/**
 * Revisa un objeto de valores contra un objeto de reglas del mismo nombre.
 * Devuelve solo los campos con error: { correo: "..." }. Un objeto vacío
 * significa que el formulario puede enviarse.
 *
 *   const errores = revisar({ correo, pass }, { correo: validaciones.correo, ... });
 */
export function revisar(valores, reglas) {
  const errores = {};
  for (const [campo, regla] of Object.entries(reglas)) {
    const mensaje = regla(valores[campo], valores);
    if (mensaje) errores[campo] = mensaje;
  }
  return errores;
}

/** true si revisar() no encontró ningún error. */
export function sinErrores(errores) {
  return Object.keys(errores).length === 0;
}
