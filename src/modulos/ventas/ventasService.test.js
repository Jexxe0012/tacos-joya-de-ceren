import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fechaHoyLocal } from "../../utils/fechas.js";
import { db } from "../../services/storage.js";
import { eliminarVentasDia, pedidoInicial, registrarPedido, validarPedido } from "./ventasService.js";

let datos;
let numeroEscritura;
let fallarEn;
beforeEach(() => {
  datos = new Map(); numeroEscritura = 0; fallarEn = Infinity;
  globalThis.localStorage = {
    getItem: clave => datos.get(clave) ?? null,
    setItem(clave, valor) { if (++numeroEscritura === fallarEn) throw new Error("cuota llena"); datos.set(clave, valor); },
    removeItem: clave => datos.delete(clave)
  };
  localStorage.setItem("sesion", JSON.stringify({ id: "usuario", rol: "empleado" }));
  localStorage.setItem("recetas", JSON.stringify([
    { id: "taco", nombre: "Taco", estado: "activa", precioVenta: 2 },
    { id: "bebida", nombre: "Bebida", estado: "activa", precioVenta: 1 }
  ]));
});
function pedido() {
  return { ...pedidoInicial(), lineas: [
    { recetaId: "taco", cantidad: 3, precioUnitario: 2 },
    { recetaId: "bebida", cantidad: 2, precioUnitario: 1 }
  ] };
}
test("guarda un pedido completo y preserva precios y nombres históricos", () => {
  const nuevo = pedido(); registrarPedido(nuevo);
  db.update("recetas", "taco", { nombre: "Nuevo taco", precioVenta: 5 });
  const ventas = db.getAll("ventas");
  assert.equal(ventas.length, 2);
  assert.equal(ventas[0].pedidoId, ventas[1].pedidoId);
  assert.equal(ventas[0].recetaNombre, "Taco");
  assert.equal(ventas[0].total, 6);
  assert.equal(ventas[0].fecha, fechaHoyLocal());
  assert.throws(() => registrarPedido(nuevo), /ya está guardado/);
  assert.equal(db.getAll("ventas").length, 2);
});
test("un fallo en la segunda línea revierte la primera y no notifica datos parciales", () => {
  const estados = []; const soltar = db.suscribir("ventas", () => estados.push(db.getAll("ventas").length));
  fallarEn = numeroEscritura + 2;
  assert.throws(() => registrarPedido(pedido()), /No se pudo guardar/);
  assert.equal(db.getAll("ventas").length, 0);
  assert.deepEqual(estados, [0]);
  soltar();
});
test("rechaza cantidades fraccionadas, fechas inválidas y pedidos fuera de rango", () => {
  const nuevo = pedido(); nuevo.lineas[0].cantidad = "1.5"; nuevo.fecha = "2026-02-31";
  let errores = validarPedido(nuevo, db.getAll("recetas"));
  assert.ok(errores.fecha); assert.ok(errores["cantidad-0"]);
  nuevo.lineas[0].precioUnitario = 1000001;
  errores = validarPedido(nuevo, db.getAll("recetas")); assert.ok(errores.total);
  assert.throws(() => registrarPedido(nuevo), /Revisa los campos/);
  assert.equal(db.getAll("ventas").length, 0);
});
test("solo un administrador puede eliminar las ventas del día", () => {
  registrarPedido(pedido());
  assert.throws(() => eliminarVentasDia(fechaHoyLocal()), /administrador/);
  assert.equal(db.getAll("ventas").length, 2);
  localStorage.setItem("sesion", JSON.stringify({ rol: "admin" }));
  eliminarVentasDia(fechaHoyLocal());
  assert.equal(db.getAll("ventas").length, 0);
});
