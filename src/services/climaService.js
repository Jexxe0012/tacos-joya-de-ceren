import { aFechaLocal } from "../utils/fechas.js";

export const ubicacionRestaurante = {
  nombre: "Tacos Joya de Cerén",
  latitud: 13.8225036,
  longitud: -89.3608276,
  mapa: "https://maps.app.goo.gl/frPASAN69BMa8bAE7"
};

let cache = null;
const duracionCache = 15 * 60 * 1000;

export async function consultarClima({ signal, forzar = false } = {}) {
  if (!forzar && cache && Date.now() - cache.consultadoEn.getTime() < duracionCache) return cache;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: ubicacionRestaurante.latitud,
    longitude: ubicacionRestaurante.longitud,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "America/El_Salvador",
    forecast_days: "7"
  });
  const limite = AbortSignal.timeout(12000);
  let respuesta;
  try { respuesta = await fetch(url, { signal: signal ? AbortSignal.any([signal, limite]) : limite }); }
  catch (causa) {
    if (causa.name === "AbortError" || causa.name === "TimeoutError") throw causa;
    throw new Error("No se pudo consultar el clima. Revisa tu conexión e intenta de nuevo.", { cause: causa });
  }
  if (!respuesta.ok) throw new Error("El proveedor del clima no está disponible. Intenta de nuevo.");
  let datos;
  try { datos = await respuesta.json(); }
  catch { throw new Error("El proveedor devolvió un pronóstico ilegible."); }
  const diario = datos.daily;
  const campos = ["time", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max"];
  if (!diario || campos.some(campo => !Array.isArray(diario[campo]))
    || campos.some(campo => diario[campo].length !== diario.time.length)) {
    throw new Error("El proveedor devolvió un pronóstico incompleto.");
  }
  const numero = valor => typeof valor === "number" && Number.isFinite(valor) ? valor : null;
  const dias = diario.time.map((fecha, indice) => ({
    fecha,
    maxima: numero(diario.temperature_2m_max[indice]),
    minima: numero(diario.temperature_2m_min[indice]),
    lluvia: numero(diario.precipitation_probability_max[indice])
  })).filter(dia => aFechaLocal(dia.fecha));
  if (!dias.length || dias.every(dia => dia.maxima === null && dia.minima === null && dia.lluvia === null)) {
    throw new Error("El proveedor no tiene pronóstico para esta consulta.");
  }
  if (dias.some(dia => dia.lluvia !== null && (dia.lluvia < 0 || dia.lluvia > 100))) {
    throw new Error("El proveedor devolvió probabilidades de lluvia inválidas.");
  }
  cache = { dias, consultadoEn: new Date() };
  return cache;
}
