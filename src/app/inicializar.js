/**
 * inicializar — arranque controlado de los datos de la aplicación.
 *
 * Antes cada página sembraba lo suyo al cargarse, así que los datos de
 * prueba aparecían o no según por dónde entrara el usuario. Con una sola
 * entrada, la siembra ocurre una vez, aquí, antes del primer render.
 *
 * Todo lo que se llama es idempotente: inicializar dos veces deja el
 * mismo resultado y no borra nada de lo que el usuario ya creó.
 */

import { sembrarCuentasPrueba } from "../services/authService.js";

let hecho = false;

export function inicializarDatos() {
  if (hecho) return;
  hecho = true;

  // Las cuentas con las que se entra a la demostración.
  sembrarCuentasPrueba();

  // Los demás módulos siembran sus propios datos de ejemplo cuando se
  // migran; cada uno se agrega a esta lista para que el arranque sea
  // siempre el mismo.
}

export default inicializarDatos;
