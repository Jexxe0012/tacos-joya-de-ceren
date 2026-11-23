/** Prepara las colecciones antes de montar las vistas. */
import { sembrarCuentasPrueba } from "../services/authService.js";
import sembrarRecetas from "../modulos/recetas/semillaRecetas.js";
import sembrarInventario from "../modulos/inventario/semillaInventario.js";
import sembrarTurnos from "../modulos/turnos/semillaTurnos.js";

import { cargarDemostracion } from "./demostracionInicial.js";

let arranque;
export function inicializarDatos() {
  arranque ??= prepararDatos();
  return arranque;
}

async function prepararDatos() {
  sembrarCuentasPrueba();
  try {
    await cargarDemostracion();
  } catch (error) {
    console.warn("No se pudo cargar la demostración. Se usarán los catálogos disponibles.", error);
  }
  // Una lista vacía guardada por el usuario también es un estado válido.
  // No reemplazamos registros existentes, vacíos ni contenido ilegible.
  for (const [clave, sembrar] of [
    ["recetas", sembrarRecetas],
    ["inventario", sembrarInventario],
    ["turnos", sembrarTurnos]
  ]) {
    if (localStorage.getItem(clave) === null) sembrar();
  }
}
export default inicializarDatos;
