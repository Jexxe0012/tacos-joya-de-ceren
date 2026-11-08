/**
 * FormularioTurno — crear, editar o borrar un turno.
 *
 * Además de las reglas de cada campo, revisa que el empleado no quede
 * con dos turnos a la vez. Ese cruce depende de los demás turnos, así
 * que se comprueba al guardar y se marca en la hora de inicio.
 */

import { useMemo, useRef } from "react";
import CapaModal from "../../components/CapaModal.jsx";
import { useFormulario } from "../../hooks/useFormulario.js";
import { aviso, confirmar, error as mostrarError } from "../../services/dialogos.js";
import { fechaHoyLocal } from "../../utils/fechas.js";
import { reglasTurno } from "./reglasTurno.js";
import {
  ESTACIONES,
  MESES,
  buscarCruce,
  eliminarTurno,
  formatoHora,
  guardarTurno
} from "./turnosService.js";

function valoresDe(turno, previos) {
  return {
    empleadoId: turno?.empleadoId ?? previos.empleadoId ?? "",
    fecha: turno?.fecha ?? previos.fecha ?? fechaHoyLocal(),
    horaInicio: turno?.horaInicio ?? "14:00",
    horaFin: turno?.horaFin ?? "21:00",
    estacion: turno?.estacion ?? "",
    notas: turno?.notas ?? "",
    esRecurrenteSemanal: Boolean(turno?.esRecurrenteSemanal)
  };
}

function FormularioTurno({ turno, previos = {}, empleados, turnos, alCerrar }) {
  const editando = Boolean(turno);
  const reglas = useMemo(() => reglasTurno(turno?.id ?? ""), [turno]);
  const form = useFormulario(valoresDe(turno, previos), reglas);
  const primerCampo = useRef(null);

  const alEnviar = form.enviar(async valores => {
    const datos = {
      empleadoId: valores.empleadoId,
      fecha: valores.fecha,
      horaInicio: valores.horaInicio,
      horaFin: valores.horaFin,
      estacion: valores.estacion,
      notas: valores.notas,
      esRecurrenteSemanal: Boolean(valores.esRecurrenteSemanal)
    };

    // Un empleado no puede tener dos turnos a la vez.
    const cruce = buscarCruce(turnos, datos, turno?.id ?? "");
    if (cruce) {
      // Si el choque es en una semana siguiente, se dice qué día es.
      const dia = new Date(`${cruce.fecha}T00:00:00`);
      const cuando = cruce.fecha > datos.fecha ? ` del ${dia.getDate()} ${MESES[dia.getMonth()]}` : "";
      form.marcarError(
        "horaInicio",
        `Se cruza con el turno${cuando} de ${formatoHora(cruce.horaInicio)}–`
        + `${formatoHora(cruce.horaFin)} (${cruce.estacion}).`
      );
      return;
    }

    try {
      guardarTurno(turno?.id ?? "", datos);
    } catch (fallo) {
      await mostrarError("No se pudo guardar el turno", fallo.message);
      return;
    }

    alCerrar();
    aviso(editando ? "Turno actualizado" : "Turno creado");
  });

  /** Un turno semanal es un solo registro: al borrarlo se va de todas las semanas. */
  async function borrar() {
    const confirmado = await confirmar({
      titulo: "¿Borrar este turno?",
      texto: turno?.esRecurrenteSemanal
        ? "Este turno se repite cada semana: se borrará de todas las semanas."
        : "Esta acción no se puede deshacer.",
      boton: "Sí, borrar",
      peligro: true
    });
    if (!confirmado) return;

    try {
      eliminarTurno(turno.id);
    } catch (fallo) {
      await mostrarError("No se pudo borrar el turno", fallo.message);
      return;
    }
    alCerrar();
    aviso("Turno borrado");
  }

  const error = nombre => (form.errores[nombre]
    ? <div className="invalid-feedback d-block">{form.errores[nombre]}</div>
    : null);
  const clase = nombre => (form.errores[nombre] ? "is-invalid" : undefined);

  return (
    <CapaModal
      ancho
      idTitulo="modal-turno-title"
      titulo={editando ? "Editar turno" : "Crear turno"}
      subtitulo="Asigna un turno a un empleado."
      alCerrar={alCerrar}
      enfocarAlAbrir={primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="turno-empleado">Empleado</label>
        <select id="turno-empleado" ref={primerCampo} className={clase("empleadoId")}
          {...form.campo("empleadoId")}>
          <option value="">— Selecciona —</option>
          {empleados.map(empleado => (
            <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>
          ))}
        </select>
        {error("empleadoId")}

        <label htmlFor="turno-fecha">Fecha</label>
        <input type="date" id="turno-fecha" className={clase("fecha")} {...form.campo("fecha")} />
        {error("fecha")}

        <div className="modal-row">
          <div>
            <label htmlFor="turno-hora-inicio">Hora inicio</label>
            <input type="time" id="turno-hora-inicio" className={clase("horaInicio")}
              {...form.campo("horaInicio")} />
            {error("horaInicio")}
          </div>
          <div>
            <label htmlFor="turno-hora-fin">Hora fin</label>
            <input type="time" id="turno-hora-fin" className={clase("horaFin")}
              {...form.campo("horaFin")} />
            {error("horaFin")}
          </div>
        </div>

        <label htmlFor="turno-estacion">Estación</label>
        <select id="turno-estacion" className={clase("estacion")} {...form.campo("estacion")}>
          <option value="">— Selecciona —</option>
          {ESTACIONES.map(estacion => <option key={estacion} value={estacion}>{estacion}</option>)}
        </select>
        {error("estacion")}

        <label htmlFor="turno-notas">Notas (opcional)</label>
        <textarea id="turno-notas" className={clase("notas")} maxLength={300} {...form.campo("notas")} />
        {error("notas")}

        <label className="checkbox-label">
          <input type="checkbox" id="turno-recurrente"
            checked={Boolean(form.valores.esRecurrenteSemanal)}
            onChange={evento => form.cambiar("esRecurrenteSemanal", evento.target.checked)} />
          Repetir este turno cada semana
        </label>

        <div className="modal-actions">
          {editando && (
            <button type="button" className="btn-danger" onClick={borrar}>Borrar</button>
          )}
          <button type="button" className="btn-cancel" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="btn-submit" disabled={form.enviando}>
            {editando ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </CapaModal>
  );
}

export default FormularioTurno;
