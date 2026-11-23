import assert from "node:assert/strict";
import { test } from "node:test";
import { leerSesion, sembrarCuentasPrueba } from "../services/authService.js";
import { sembrarInventario } from "../modulos/inventario/semillaInventario.js";
import { sembrarRecetas } from "../modulos/recetas/semillaRecetas.js";
import { sembrarTurnos } from "../modulos/turnos/semillaTurnos.js";
import { fechaHoyLocal } from "../utils/fechas.js";

function memoria(datos) {
  return {
    getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: clave => datos.delete(clave)
  };
}

function almacen() {
  const datos = new Map();
  globalThis.localStorage = memoria(datos);
  return datos;
}
test("el arranque conserva IDs y listas vacías sin crear ventas de demostración", async () => {
  almacen();
  localStorage.setItem("recetas", "[]"); localStorage.setItem("turnos", "[]");
  const inventario = JSON.stringify([{ id: 17, nombre: "Existencia anterior", cantidad: 4 }]);
  localStorage.setItem("inventario", inventario);
  const { inicializarDatos } = await import("./inicializar.js?conservacion");
  await inicializarDatos(); await inicializarDatos();
  assert.equal(localStorage.getItem("recetas"), "[]");
  assert.equal(localStorage.getItem("turnos"), "[]");
  assert.equal(localStorage.getItem("inventario"), inventario);
  assert.equal(localStorage.getItem("ventas"), null); assert.equal(localStorage.getItem("mermas"), null);
});
test("el primer arranque carga el JSON completo una sola vez", async () => {
  almacen();
  const { inicializarDatos } = await import("./inicializar.js?primera-vez");
  await inicializarDatos();
  const recetas = localStorage.getItem("recetas"), turnos = JSON.parse(localStorage.getItem("turnos"));
  assert.ok(JSON.parse(recetas).length > 0); assert.ok(turnos.length > 0);
  assert.ok(turnos.every(turno => turno.empleadoId));
  const ventas = JSON.parse(localStorage.getItem("ventas"));
  const usuarios = JSON.parse(localStorage.getItem("usuarios"));
  const empleado = usuarios.find(usuario => usuario.correo === "empleado@joyadeceren.sv");
  assert.equal(new Set(ventas.map(venta => venta.fecha)).size, 14);
  assert.ok(ventas.some(venta => venta.fecha === fechaHoyLocal()));
  assert.ok(ventas.every(venta => venta.ejemplo && venta.origen === "demostracion-inicial"));
  assert.equal(JSON.parse(localStorage.getItem("mermas")).length, 5);
  assert.ok(turnos.some(turno => turno.empleadoId === empleado.id));
  assert.ok(turnos.every(turno => usuarios.some(usuario => usuario.id === turno.empleadoId)));
  await inicializarDatos();
  const { inicializarDatos: recargar } = await import("./inicializar.js?recarga");
  await recargar();
  assert.equal(localStorage.getItem("recetas"), recetas);
  assert.deepEqual(JSON.parse(localStorage.getItem("ventas")), ventas);
});

function cargarSemillasAnteriores() {
  sembrarCuentasPrueba();
  sembrarRecetas();
  sembrarInventario();
  sembrarTurnos();
}

test("actualiza las semillas intactas aunque haya ventas y mermas guardadas como listas vacías", async () => {
  almacen();
  cargarSemillasAnteriores();
  localStorage.setItem("ventas", "[]");
  localStorage.setItem("mermas", "[ ]");
  const cuentas = JSON.parse(localStorage.getItem("usuarios"));
  const { inicializarDatos } = await import("./inicializar.js?migracion");
  await inicializarDatos();
  assert.deepEqual(JSON.parse(localStorage.getItem("usuarios")).slice(0, 2), cuentas);
  assert.equal(JSON.parse(localStorage.getItem("inventario")).length, 18);
  assert.equal(JSON.parse(localStorage.getItem("recetas")).length, 5);
  assert.ok(JSON.parse(localStorage.getItem("ventas")).length > 0);
});

test("una modificación del inventario anterior impide cargar datos de demostración", async () => {
  almacen();
  cargarSemillasAnteriores();
  const inventario = JSON.parse(localStorage.getItem("inventario"));
  inventario[0].cantidad += 1;
  const guardado = JSON.stringify(inventario);
  localStorage.setItem("inventario", guardado);
  const { inicializarDatos } = await import("./inicializar.js?inventario-editado");
  await inicializarDatos();
  assert.equal(localStorage.getItem("inventario"), guardado);
  assert.equal(localStorage.getItem("ventas"), null);
});

test("la demostración guarda su sesión y sus datos por separado", async () => {
  const anteriores = almacen();
  const ventasLocales = JSON.stringify([{ id: "venta-usuario", cantidad: 14 }]);
  const sesionLocal = JSON.stringify({ id: "usuario", rol: "admin" });
  localStorage.setItem("ventas", ventasLocales);
  localStorage.setItem("sesion", sesionLocal);
  const esperado = new Map(anteriores);
  const anteriorUbicacion = globalThis.location;
  const anteriorSesion = globalThis.sessionStorage;
  globalThis.location = { search: "?demo=1" };
  globalThis.sessionStorage = memoria(new Map());
  try {
    const { inicializarDatos } = await import("./inicializar.js?demostracion-aislada");
    await inicializarDatos();
    assert.equal(leerSesion(), null);
    assert.equal(JSON.parse(sessionStorage.getItem("ventas")).length, 1090);
    assert.equal(JSON.parse(sessionStorage.getItem("mermas")).length, 5);
    assert.deepEqual(anteriores, esperado);
    globalThis.location = { search: "" };
    assert.equal(leerSesion().id, "usuario");
    assert.equal(localStorage.getItem("ventas"), ventasLocales);
  } finally {
    globalThis.location = anteriorUbicacion;
    globalThis.sessionStorage = anteriorSesion;
  }
});
