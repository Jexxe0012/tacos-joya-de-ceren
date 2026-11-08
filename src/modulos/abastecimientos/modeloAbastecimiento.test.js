import assert from "node:assert/strict";
import { test } from "node:test";
import { fechaHoyLocal } from "../../utils/fechas.js";
import { cargarDemanda, proyectarCobertura, validarProyeccion } from "./modeloAbastecimiento.js";

test("conserva la referencia y separa ejemplos de ventas reales", () => {
  assert.equal(cargarDemanda([], "2026-11-07").promedio, 174);
  const demanda = cargarDemanda([{ fecha: "2026-11-07", cantidad: 14 }, { fecha: "2026-11-07", cantidad: 500, ejemplo: true }], "2026-11-07");
  assert.equal(demanda.promedio, 2); assert.equal(demanda.real, true);
  assert.deepEqual(demanda.valores, [0, 0, 0, 0, 0, 0, 14]);
});
test("mantiene cobertura y día de seguridad al cruzar el mes", () => {
  const resultado = proyectarCobertura({ insumoId: "res", fecha: "2026-10-31", cantidad: 20, porcion: .1 }, { promedio: 100 });
  assert.equal(resultado.cobertura, 2); assert.equal(resultado.agotamiento, "2026-11-02");
  assert.equal(resultado.fechaPedido, "2026-11-01"); assert.equal(resultado.critico, true);
});
test("valida fecha y los incrementos del formulario original", () => {
  const errores = validarProyeccion({ insumoId: "res", fecha: fechaHoyLocal(), cantidad: "1.23", porcion: "0.0005" });
  assert.ok(errores.cantidad); assert.ok(errores.porcion); assert.equal(errores.fecha, undefined);
  assert.ok(validarProyeccion({ insumoId: "ajeno", fecha: "2026-02-31", cantidad: 1, porcion: .1 }).fecha);
});
