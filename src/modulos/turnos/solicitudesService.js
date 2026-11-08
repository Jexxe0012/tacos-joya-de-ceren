/**
 * solicitudesService — las peticiones de día libre o cambio de turno.
 *
 * El empleado envía una y el administrador la acepta o la rechaza.
 * Regla de negocio: cada empleado puede tener como máximo una solicitud
 * pendiente, para que la lista del administrador no se llene de
 * repetidas.
 */

import { db } from "../../services/storage.js";

export const COLECCION = "solicitudes";

export const MIN_MENSAJE = 5;
export const MAX_MENSAJE = 300;

export function listarSolicitudes() {
  return db.getAll(COLECCION);
}

export function solicitudesDe(solicitudes, empleadoId) {
  return solicitudes
    .filter(solicitud => String(solicitud.empleadoId) === String(empleadoId))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function pendientes(solicitudes) {
  return solicitudes
    .filter(solicitud => solicitud.estado === "pendiente")
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

/** Se consulta contra los datos guardados, no contra los de la pantalla. */
export function tienePendiente(empleadoId) {
  return listarSolicitudes().some(solicitud =>
    String(solicitud.empleadoId) === String(empleadoId) && solicitud.estado === "pendiente"
  );
}

export function crearSolicitud({ empleadoId, mensaje }) {
  return db.create(COLECCION, {
    empleadoId,
    mensaje,
    fecha: new Date().toISOString(),
    estado: "pendiente"
  });
}

export function responderSolicitud(id, estado) {
  return db.update(COLECCION, id, { estado });
}
