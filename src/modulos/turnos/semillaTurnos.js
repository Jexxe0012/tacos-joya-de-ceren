/**
 * semillaTurnos — los turnos de ejemplo de la demostración.
 *
 * De lunes a viernes de la semana en curso, para el primer empleado
 * registrado. Si todavía no hay empleados no se siembra nada: un turno
 * sin dueño no se podría mostrar.
 */

import { db } from "../../services/storage.js";
import { COLECCION, aIso, lunesDe, sumarDias } from "./turnosService.js";

const ESTACIONES_SEMANA = ["Cocina", "Plancha", "Caja", "Cocina", "Plancha"];

export function sembrarTurnos() {
  if (db.getAll(COLECCION).length > 0) return false;

  const empleado = db.getAll("usuarios").find(usuario => usuario.rol === "empleado");
  if (!empleado) return false;

  const lunes = lunesDe(new Date());
  const turnos = ESTACIONES_SEMANA.map((estacion, indice) => ({
    empleadoId: empleado.id,
    fecha: aIso(sumarDias(lunes, indice)),
    horaInicio: "14:00",
    horaFin: "21:00",
    estacion,
    esRecurrenteSemanal: false
  }));

  return db.seed(COLECCION, turnos);
}

export default sembrarTurnos;
