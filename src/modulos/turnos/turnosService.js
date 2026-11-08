/**
 * turnosService — calendario, turnos y sus reglas de negocio.
 *
 * Un turno es un registro con empleado, fecha, horario y estación. Si
 * lleva esRecurrenteSemanal, ese único registro vale para el mismo día
 * de todas las semanas siguientes: borrarlo lo quita de todas.
 *
 * Las horas se guardan y se comparan como texto "HH:MM", igual que las
 * fechas: en ese formato el orden de los textos es el orden real.
 */

import { db } from "../../services/storage.js";
import { aTextoLocal } from "../../utils/fechas.js";

export const COLECCION = "turnos";

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const ESTACIONES = ["Cocina", "Plancha", "Caja", "Apoyo", "Mesero", "Domicilio"];

/** Un turno no puede durar más de esto. */
export const MAX_HORAS_TURNO = 12;

// ---------- Fechas ----------

/** El lunes de la semana a la que pertenece esa fecha. */
export function lunesDe(fecha) {
  const dia = new Date(fecha);
  const diaSemana = dia.getDay(); // 0 = domingo, 1 = lunes, …
  dia.setDate(dia.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  dia.setHours(0, 0, 0, 0);
  return dia;
}

export function sumarDias(fecha, dias) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export function mismaFecha(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Etiqueta del rango de la semana: "14–20 sep" o "28 sep – 4 oct". */
export function etiquetaSemana(lunes, domingo) {
  if (lunes.getMonth() === domingo.getMonth()) {
    return `${lunes.getDate()}–${domingo.getDate()} ${MESES[domingo.getMonth()]}`;
  }
  return `${lunes.getDate()} ${MESES[lunes.getMonth()]} – ${domingo.getDate()} ${MESES[domingo.getMonth()]}`;
}

/** "14:00" se muestra como "2 p.m.". */
export function formatoHora(hora24) {
  const [horas, minutos] = String(hora24).split(":").map(Number);
  if (horas === 0) return minutos === 0 ? "12 a.m." : `12:${String(minutos).padStart(2, "0")} a.m.`;
  if (horas === 12) return minutos === 0 ? "12 p.m." : `12:${String(minutos).padStart(2, "0")} p.m.`;
  const sufijo = horas < 12 ? "a.m." : "p.m.";
  const doce = horas > 12 ? horas - 12 : horas;
  return minutos === 0 ? `${doce} ${sufijo}` : `${doce}:${String(minutos).padStart(2, "0")} ${sufijo}`;
}

/** Fecha y hora de una solicitud: "14 sep · 9:05". */
export function fechaHumana(iso) {
  const fecha = new Date(iso);
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${fecha.getHours()}:${minutos}`;
}

export function horasEntre(inicio, fin) {
  const [h1, m1] = String(inicio).split(":").map(Number);
  const [h2, m2] = String(fin).split(":").map(Number);
  return (h2 + m2 / 60) - (h1 + m1 / 60);
}

/** El mismo formato de fecha que guardan los turnos. */
export const aIso = aTextoLocal;

// ---------- Consultas ----------

export function listarTurnos() {
  return db.getAll(COLECCION);
}

export function listarEmpleados() {
  return db.getAll("usuarios").filter(usuario => usuario.rol === "empleado");
}

/**
 * Turnos que aplican a una fecha. Cuenta los de fecha exacta y los
 * semanales del mismo día de la semana que empezaron antes o ese mismo
 * día.
 */
export function turnosDeFecha(turnos, fecha, empleadoId = null) {
  const iso = aIso(fecha);
  const diaSemana = fecha.getDay();

  return turnos.filter(turno => {
    if (empleadoId && turno.empleadoId !== empleadoId) return false;
    if (turno.fecha === iso) return true;
    if (turno.esRecurrenteSemanal) {
      const original = new Date(`${turno.fecha}T00:00:00`);
      return original.getDay() === diaSemana && original <= fecha;
    }
    return false;
  });
}

/**
 * Busca un turno del mismo empleado que se cruce con el horario dado.
 *
 * Dos horarios se cruzan si cada uno empieza antes de que termine el
 * otro. Si el turno nuevo se repite cada semana, también puede chocar
 * con turnos del mismo día de la semana en semanas siguientes. Al
 * editar, el turno no se compara consigo mismo.
 */
export function buscarCruce(turnos, datos, idPropio = "") {
  const dia = new Date(`${datos.fecha}T00:00:00`);
  let candidatos = turnosDeFecha(turnos, dia, datos.empleadoId);

  if (datos.esRecurrenteSemanal) {
    const siguientes = turnos.filter(turno =>
      turno.empleadoId === datos.empleadoId
      && turno.fecha > datos.fecha
      && new Date(`${turno.fecha}T00:00:00`).getDay() === dia.getDay()
    );
    candidatos = candidatos.concat(siguientes);
  }

  return candidatos.find(turno =>
    String(turno.id) !== String(idPropio)
    && datos.horaInicio < turno.horaFin
    && turno.horaInicio < datos.horaFin
  );
}

/** Los cuatro indicadores de la semana que ve el administrador. */
export function indicadoresSemana(turnos, empleados, lunes) {
  const hoy = new Date();
  const enTurno = empleados.filter(empleado => turnosDeFecha(turnos, hoy, empleado.id).length > 0).length;

  let totalHoras = 0;
  let totalTurnos = 0;
  for (let i = 0; i < 7; i += 1) {
    const dia = sumarDias(lunes, i);
    for (const empleado of empleados) {
      for (const turno of turnosDeFecha(turnos, dia, empleado.id)) {
        totalTurnos += 1;
        totalHoras += horasEntre(turno.horaInicio, turno.horaFin);
      }
    }
  }

  return {
    enTurno,
    libres: Math.max(0, empleados.length - enTurno),
    horas: totalHoras,
    turnos: totalTurnos
  };
}

// ---------- Escrituras ----------

export function guardarTurno(id, datos) {
  if (id) return db.update(COLECCION, id, datos);
  return db.create(COLECCION, datos);
}

export function eliminarTurno(id) {
  return db.remove(COLECCION, id);
}
