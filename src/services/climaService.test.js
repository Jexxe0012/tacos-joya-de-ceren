import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { consultarClima } from "./climaService.js";
const fetchOriginal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchOriginal; });
const diario = () => ({ time: ["2026-11-07"], temperature_2m_max: [31], temperature_2m_min: [22], precipitation_probability_max: [85] });
function responder(daily) { globalThis.fetch = async () => ({ ok: true, json: async () => ({ daily }) }); }
test("consulta ubicación, zona horaria y siete días y conserva valores ausentes", async () => {
  let direccion;
  globalThis.fetch = async url => { direccion = url; return { ok: true, json: async () => ({ daily: { ...diario(), temperature_2m_min: [null] } }) }; };
  const resultado = await consultarClima({ forzar: true });
  assert.equal(direccion.searchParams.get("latitude"), "13.8225036");
  assert.equal(direccion.searchParams.get("timezone"), "America/El_Salvador");
  assert.equal(direccion.searchParams.get("forecast_days"), "7");
  assert.equal(resultado.dias[0].minima, null); assert.equal(resultado.dias[0].lluvia, 85);
});
test("rechaza respuestas incompletas, vacías y probabilidades fuera de rango", async () => {
  responder({ ...diario(), temperature_2m_max: [] }); await assert.rejects(consultarClima({ forzar: true }), /incompleto/);
  responder({ ...diario(), time: ["2026-02-31"] }); await assert.rejects(consultarClima({ forzar: true }), /no tiene pronóstico/);
  responder({ ...diario(), precipitation_probability_max: [110] }); await assert.rejects(consultarClima({ forzar: true }), /inválidas/);
});
test("propaga cancelación y explica fallos externos en español", async () => {
  globalThis.fetch = async () => { throw new DOMException("Cancelado", "AbortError"); };
  await assert.rejects(consultarClima({ forzar: true }), { name: "AbortError" });
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(consultarClima({ forzar: true }), /Revisa tu conexión/);
});
