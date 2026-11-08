/**
 * fechas — una sola forma de trabajar con fechas en todo el sistema.
 *
 * Las fechas se guardan y se comparan como texto "AAAA-MM-DD" en hora
 * local. En ese formato, comparar los textos da el mismo orden que
 * comparar las fechas, sin líos de zona horaria.
 *
 * No se usa toISOString(), porque trabaja en UTC: en El Salvador,
 * después de las 6:00 p. m. devolvería la fecha de mañana.
 */

/** Formato que usa toda la app para guardar y comparar fechas. */
export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Convierte un Date a "AAAA-MM-DD" en hora local. */
export function aTextoLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Fecha de hoy en hora local, con formato "AAAA-MM-DD". */
export function fechaHoyLocal() {
  return aTextoLocal(new Date());
}

/** Fecha de hace "dias" días, en hora local y el mismo formato. */
export function haceDias(dias) {
  const fecha = new Date();
  // setDate ajusta solo el cambio de mes y de año.
  fecha.setDate(fecha.getDate() - dias);
  return aTextoLocal(fecha);
}

/** Fecha dentro de "dias" días, en hora local y el mismo formato. */
export function enDias(dias) {
  return haceDias(-dias);
}

/**
 * Convierte "AAAA-MM-DD" a un Date en hora local, validando el valor.
 * Devuelve null si el texto no tiene el formato o si el día no existe
 * (por ejemplo "2026-02-31", que new Date corre al 3 de marzo).
 */
export function aFechaLocal(texto) {
  if (typeof texto !== "string" || !FORMATO_FECHA.test(texto)) return null;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const existe = fecha.getFullYear() === anio
    && fecha.getMonth() === mes - 1
    && fecha.getDate() === dia;
  return existe ? fecha : null;
}

/** true si el texto es una fecha local válida en formato "AAAA-MM-DD". */
export function esFechaValida(texto) {
  return aFechaLocal(texto) !== null;
}

/**
 * Días completos entre dos fechas en texto, contando desde la primera.
 * Devuelve null si alguna fecha no es válida.
 */
export function diasEntre(desde, hasta) {
  const inicio = aFechaLocal(desde);
  const fin = aFechaLocal(hasta);
  if (!inicio || !fin) return null;
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((fin - inicio) / MS_POR_DIA);
}

/**
 * Nombre del día y fecha en español, para mostrar en pantalla.
 * El texto de salida nunca se guarda ni se compara: para eso se usa
 * siempre el formato "AAAA-MM-DD".
 */
export function fechaLegible(texto, opciones = { weekday: "long", day: "numeric", month: "long" }) {
  const fecha = aFechaLocal(texto);
  if (!fecha) return "";
  return fecha.toLocaleDateString("es-SV", opciones);
}

/** Hora "HH:MM" a minutos desde medianoche. Devuelve null si no es válida. */
export function horaAMinutos(hora) {
  if (typeof hora !== "string" || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const [horas, minutos] = hora.split(":").map(Number);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}
