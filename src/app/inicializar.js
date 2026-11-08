/** Arranque único. Los datos de ejemplo solo se añaden si falta su colección. */
import { sembrarCuentasPrueba } from "../services/authService.js";
import sembrarRecetas from "../modulos/recetas/semillaRecetas.js";
import sembrarInventario from "../modulos/inventario/semillaInventario.js";
import sembrarTurnos from "../modulos/turnos/semillaTurnos.js";

let hecho = false;
export function inicializarDatos() {
  if (hecho) return;
  sembrarCuentasPrueba();
  // Una lista vacía guardada por el usuario también es un estado válido.
  // No reemplazamos registros existentes, vacíos ni contenido ilegible.
  for (const [clave, sembrar] of [
    ["recetas", sembrarRecetas],
    ["inventario", sembrarInventario],
    ["turnos", sembrarTurnos]
  ]) {
    if (localStorage.getItem(clave) === null) sembrar();
  }
  hecho = true;
}
export default inicializarDatos;
