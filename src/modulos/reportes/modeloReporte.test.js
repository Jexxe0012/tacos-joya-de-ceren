import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularReporte, catalogosReporte, validarFiltrosReporte } from "./modeloReporte.js";

const filtros = { periodo: "personalizado", insumo: "todos", receta: "todas", fechaInicio: "2026-10-01", fechaFin: "2026-10-30" };

function registrosPrueba() {
  return {
    inventario: [{ id: "res-inv", nombre: "Carne de res", unidad: "kg", costoUnitario: 8 }],
    recetas: [{ id: "taco", nombre: "Taco de res", categoria: "taco", porciones: 1,
      ingredientes: [{ insumoId: "res", cantidad: 0.1 }] }],
    ventas: [{ fecha: "2026-10-16", recetaId: "taco", recetaNombre: "Taco de res", cantidad: 4, total: 8 }],
    mermas: [{ fecha: "2026-10-16", productoId: "res-inv", cantidad: "500 g" }],
    movimientos: [{ fecha: "2026-10-16", productoId: "res-inv", tipo: "salida",
      motivo: "Consumo en cocina", cantidad: 0.5, unidad: "kg" }],
    vinculosInsumos: [{ insumoId: "res", productoId: "res-inv", factor: 1,
      unidadInsumo: "kg", unidadProducto: "kg" }]
  };
}

test("mantiene unidades antiguas, costos y eficiencia al migrar el cálculo", () => {
  const reporte = calcularReporte(filtros, registrosPrueba());
  assert.equal(reporte.indicadores.ventas, 4);
  assert.equal(reporte.indicadores.ingresos, 8);
  assert.equal(reporte.indicadores.mermaKg, 0.5);
  assert.equal(reporte.indicadores.costoMerma, 4);
  assert.equal(reporte.indicadores.eficiencia, 80);
  assert.equal(reporte.series.ventas.length, 30);
  assert.equal(reporte.series.demanda.length, 7);
  assert.equal(reporte.series.ventas.filter(dia => dia.valor === null).length, 29);
});

test("una receta eliminada conserva el precio y nombre históricos de la venta", () => {
  const registros = registrosPrueba();
  registros.recetas = [];
  const reporte = calcularReporte({ ...filtros, receta: "taco" }, registros);
  assert.equal(reporte.indicadores.ingresos, 8);
  assert.match(reporte.receta, /Taco de res.*histórica/);
  assert.equal(reporte.indicadores.eficiencia, null);
  assert.ok(catalogosReporte(registros).recetas.some(([id]) => id === "taco"));
});

test("una merma en litros mantiene su costo sin convertirla a kilogramos", () => {
  const registros = registrosPrueba();
  registros.inventario.push({ id: "aceite", nombre: "Aceite", unidad: "l", costoUnitario: 3 });
  registros.mermas = [{ fecha: "2026-10-16", productoId: "aceite", cantidad: 2, unidad: "l" }];
  const reporte = calcularReporte({ ...filtros, insumo: "aceite" }, registros);
  assert.equal(reporte.indicadores.ventas, 4);
  assert.equal(reporte.indicadores.mermaKg, null);
  assert.equal(reporte.indicadores.costoMerma, 6);
  assert.equal(reporte.indicadores.sinPeso, 1);
});

test("validación rechaza fechas inexistentes, rangos mayores de 90 días y opciones ajenas", () => {
  const catalogos = catalogosReporte(registrosPrueba());
  const invalido = validarFiltrosReporte({ ...filtros, receta: "ajena", fechaInicio: "2026-02-31" }, catalogos);
  assert.ok(invalido.fechaInicio);
  assert.ok(invalido.receta);
  const extenso = validarFiltrosReporte({ ...filtros, fechaInicio: "2026-01-01" }, catalogos);
  assert.match(extenso.fechaFin, /90 días/);
});
