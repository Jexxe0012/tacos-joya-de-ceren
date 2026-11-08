import assert from "node:assert/strict";
import { test } from "node:test";

function almacen() {
  const datos = new Map();
  globalThis.localStorage = { getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor), removeItem: clave => datos.delete(clave) };
  return datos;
}
test("el arranque conserva IDs y listas vacías sin crear ventas de demostración", async () => {
  almacen();
  localStorage.setItem("recetas", "[]"); localStorage.setItem("turnos", "[]");
  const inventario = JSON.stringify([{ id: 17, nombre: "Existencia anterior", cantidad: 4 }]);
  localStorage.setItem("inventario", inventario);
  const { inicializarDatos } = await import("./inicializar.js?conservacion");
  inicializarDatos(); inicializarDatos();
  assert.equal(localStorage.getItem("recetas"), "[]");
  assert.equal(localStorage.getItem("turnos"), "[]");
  assert.equal(localStorage.getItem("inventario"), inventario);
  assert.equal(localStorage.getItem("ventas"), null); assert.equal(localStorage.getItem("mermas"), null);
});
test("el primer arranque crea catálogos y turnos utilizables sin repetirlos", async () => {
  almacen(); const { inicializarDatos } = await import("./inicializar.js?primera-vez");
  inicializarDatos();
  const recetas = localStorage.getItem("recetas"), turnos = JSON.parse(localStorage.getItem("turnos"));
  assert.ok(JSON.parse(recetas).length > 0); assert.ok(turnos.length > 0);
  assert.ok(turnos.every(turno => turno.empleadoId));
  inicializarDatos(); assert.equal(localStorage.getItem("recetas"), recetas);
});
