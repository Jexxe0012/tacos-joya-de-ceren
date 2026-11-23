import assert from "node:assert/strict";
import { test } from "node:test";
import operacion from "../datos/operacion-inicial.json" with { type: "json" };
import { leerSesion, sembrarCuentasPrueba } from "../services/authService.js";
import { db } from "../services/storage.js";
import { listarEmpleados } from "../modulos/turnos/turnosService.js";
import { fechaHoyLocal } from "../utils/fechas.js";

function configurarNavegador(datos = new Map()) {
  globalThis.localStorage = {
    getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: clave => datos.delete(clave)
  };
  return datos;
}

test("el arranque normal carga las colecciones del JSON y conserva las relaciones", async () => {
  configurarNavegador();
  const { inicializarDatos } = await import("./inicializar.js?primera-vez");
  await inicializarDatos();

  for (const clave of ["recetas", "inventario", "turnos", "ventas", "movimientos", "mermas", "vinculosInsumos"]) {
    assert.deepEqual(db.getAll(clave).map(registro => registro.id), operacion[clave].map(registro => registro.id));
    assert.equal(localStorage.getItem(clave), null);
  }

  const ventas = db.getAll("ventas");
  assert.equal(new Set(ventas.map(venta => venta.fecha)).size, 14);
  assert.ok(ventas.some(venta => venta.fecha === fechaHoyLocal()));
  assert.ok(ventas.every(venta => venta.origen === "base-inicial" && !venta.ejemplo));
  const usuarios = db.getAll("usuarios");
  const empleado = usuarios.find(usuario => usuario.correo === "empleado@joyadeceren.sv");
  const equipo = listarEmpleados();
  const turnos = db.getAll("turnos");
  assert.equal(equipo.length, operacion.personal.length);
  assert.ok(turnos.some(turno => turno.empleadoId === empleado.id));
  assert.ok(turnos.every(turno => equipo.some(persona => persona.id === turno.empleadoId)));
});

test("el arranque usa el JSON con datos operativos anteriores y conserva las cuentas y sesión", async () => {
  const datos = configurarNavegador(new Map([
    ["ventas", "[]"],
    ["recetas", JSON.stringify([{ id: "vieja", nombre: "Receta anterior" }])],
    ["inventario", JSON.stringify([{ id: "anterior", cantidad: 999 }])],
    ["mermas", "contenido ilegible"]
  ]));
  sembrarCuentasPrueba();
  const cuenta = db.create("usuarios", { correo: "personal@joyadeceren.sv", rol: "empleado" });
  localStorage.setItem("sesion", JSON.stringify({ id: cuenta.id, rol: cuenta.rol }));
  const anteriores = new Map(datos);

  const { inicializarDatos } = await import("./inicializar.js?navegador-anterior");
  await inicializarDatos();

  assert.equal(db.getAll("ventas").length, operacion.ventas.length);
  assert.equal(db.getAll("mermas").length, operacion.mermas.length);
  assert.equal(db.getAll("inventario")[0].cantidad, operacion.inventario[0].cantidad);
  assert.equal(db.getById("recetas", "vieja"), undefined);
  assert.equal(leerSesion().id, cuenta.id);
  assert.deepEqual(datos, anteriores);
});

test("las escrituras operativas viven en memoria y una carga nueva vuelve al JSON", async () => {
  configurarNavegador();
  const { inicializarDatos } = await import("./inicializar.js?escrituras");
  await inicializarDatos();
  const venta = db.create("ventas", { cantidad: 22 });
  await inicializarDatos();

  assert.equal(db.getById("ventas", venta.id).cantidad, 22);
  assert.equal(localStorage.getItem("ventas"), null);
  const { inicializarDatos: recargar } = await import("./inicializar.js?recarga");
  await recargar();
  assert.equal(db.getById("ventas", venta.id), undefined);
  assert.equal(db.getAll("ventas").length, operacion.ventas.length);
});
