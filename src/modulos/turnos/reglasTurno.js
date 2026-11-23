/**
 * reglasTurno — reglas del formulario de turno y de la solicitud.
 *
 * Separadas de las operaciones: reciben valores y devuelven el mensaje
 * que verá el usuario.
 */

import { fecha as reglaFecha, hora as reglaHora, texto } from "../../utils/validaciones.js";
import { MAX_HORAS_TURNO, horasEntre } from "./turnosService.js";
import { MAX_MENSAJE, MIN_MENSAJE } from "./solicitudesService.js";

/**
 * Reglas del turno. Las fechas pasadas solo se rechazan al crear: un
 * turno que ya pasó sí se puede corregir.
 */
export function reglasTurno(idActual = "") {
  const editando = Boolean(idActual);

  return {
    empleadoId: valor => (valor ? "" : "Elige un empleado."),

    fecha: valor => reglaFecha(valor, { noPasada: !editando }),

    horaInicio: valor => (valor ? reglaHora(valor) : "Elige la hora de inicio."),

    // El fin va después del inicio y el turno no pasa de las horas máximas.
    horaFin: (valor, valores) => {
      if (!valor) return "Elige la hora de fin.";
      const mensaje = reglaHora(valor);
      if (mensaje) return mensaje;
      if (!valores.horaInicio) return "";
      if (valor <= valores.horaInicio) return "La hora de fin debe ser después de la hora de inicio.";
      if (horasEntre(valores.horaInicio, valor) > MAX_HORAS_TURNO) {
        return `Un turno no puede durar más de ${MAX_HORAS_TURNO} horas.`;
      }
      return "";
    },

    estacion: valor => (valor ? "" : "Elige una estación."),

    notas: valor => texto(valor, { max: 300 })
  };
}

/** El mensaje de la solicitud. texto() recorta antes de medir: "   " cuenta como vacío. */
export const reglasSolicitud = {
  mensaje: valor => texto(valor, { min: MIN_MENSAJE, max: MAX_MENSAJE })
};
