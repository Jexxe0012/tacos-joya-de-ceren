import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerResumenDashboard } from "./datosIndicadores.js";

const registros = () => ({ ventas: [], recetas: [], inventario: [], movimientos: [], mermas: [], vinculosInsumos: [] });
test("sin ventas reales no inventa previsión ni consumo", () => {
  const datos = registros(); datos.ventas.push({ fecha: "2026-11-07", cantidad: 100, ejemplo: true });
  const resumen = obtenerResumenDashboard(datos, "2026-11-07");
  assert.equal(resumen.promedio, null); assert.equal(resumen.kg, null);
  assert.equal(resumen.dias.length, 7); assert.equal(resumen.pedidos.length, 0);
});
test("comparte ventas y mermas con Reportes sin sumar litros como kilogramos", () => {
  const datos = registros();
  datos.ventas.push({ fecha: "2026-11-07", recetaId: "taco", cantidad: 14, total: 28, pedidoId: "pedido" });
  datos.recetas.push({ id: "taco", porciones: 2, ingredientes: [{ insumoId: "res", cantidad: 0.2 }, { insumoId: "crema", cantidad: 0.1 }] });
  datos.inventario.push({ id: "res", nombre: "Res", cantidad: 1, stockMinimo: 2, unidad: "kg" }, { id: "crema", nombre: "Crema", cantidad: 0, stockMinimo: 1, unidad: "l" });
  datos.mermas.push({ fecha: "2026-11-07", productoId: "res", cantidad: 500, unidad: "g" }, { fecha: "2026-11-07", productoId: "crema", cantidad: 2, unidad: "l" });
  const resumen = obtenerResumenDashboard(datos, "2026-11-07");
  assert.equal(resumen.promedio, 2); assert.ok(Math.abs(resumen.kg - .2) < 1e-9);
  assert.equal(resumen.reporte.indicadores.mermaKg, .5);
  assert.equal(resumen.reporte.indicadores.sinPeso, 1);
  assert.equal(resumen.criticos[0].nombre, "Crema");
  assert.equal(resumen.alertas.length, 3); assert.equal(resumen.pedidos[0].total, 28);
});
