/**
 * TurnosAdmin — calendario semanal y gestión de turnos.
 *
 * Una fila por empleado y una columna por día. Un clic en un bloque
 * edita ese turno; un clic en el resto de la celda crea uno nuevo para
 * ese empleado y ese día.
 */

import { useMemo, useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import FormularioTurno from "./FormularioTurno.jsx";
import TarjetaSolicitud from "./TarjetaSolicitud.jsx";
import {
  COLECCION as COLECCION_SOLICITUDES,
  pendientes,
  responderSolicitud
} from "./solicitudesService.js";
import {
  COLECCION,
  DIAS_SEMANA,
  aIso,
  etiquetaSemana,
  formatoHora,
  indicadoresSemana,
  lunesDe,
  mismaFecha,
  sumarDias,
  turnosDeFecha
} from "./turnosService.js";

function TurnosAdmin() {
  const { registros: turnos, problema } = useColeccion(COLECCION);
  const { registros: solicitudes } = useColeccion(COLECCION_SOLICITUDES);
  const { registros: usuarios } = useColeccion("usuarios");

  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [enFormulario, setEnFormulario] = useState(null); // { turno } o { previos }
  const [respondiendo, setRespondiendo] = useState("");

  const empleados = useMemo(
    () => usuarios.filter(usuario => usuario.rol === "empleado"),
    [usuarios]
  );
  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice)),
    [lunes]
  );
  const indicadores = useMemo(
    () => indicadoresSemana(turnos, empleados, lunes),
    [turnos, empleados, lunes]
  );
  const porResponder = useMemo(() => pendientes(solicitudes), [solicitudes]);

  const hoy = new Date();

  async function responder(solicitud, estado) {
    if (respondiendo) return;
    setRespondiendo(solicitud.id);
    try {
      responderSolicitud(solicitud.id, estado);
      const nombre = usuarios.find(usuario => String(usuario.id) === String(solicitud.empleadoId))?.nombre
        ?? "Empleado desconocido";
      aviso(`Solicitud de ${nombre} ${estado}`, estado === "aceptada" ? "success" : "info");
    } catch (fallo) {
      await mostrarError("No se pudo responder la solicitud", fallo.message);
    } finally {
      setRespondiendo("");
    }
  }

  return (
    <section>
      <div className="admin-header">
        <div>
          <h1>Turnos y días libres</h1>
          <p className="subtitle">Organiza los turnos de los empleados durante la semana.</p>
        </div>
        <button type="button" className="btn btn-app-primary"
          onClick={() => setEnFormulario({ turno: null, previos: {} })}>
          + Crear turno
        </button>
      </div>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="week-nav">
        <button type="button" aria-label="Semana anterior"
          onClick={() => setLunes(sumarDias(lunes, -7))}>←</button>
        <span className="week-label">{etiquetaSemana(lunes, sumarDias(lunes, 6))}</span>
        <button type="button" aria-label="Semana siguiente"
          onClick={() => setLunes(sumarDias(lunes, 7))}>→</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">EN TURNO HOY</div>
          <div className="stat-value">{indicadores.enTurno}</div>
          <div className="stat-sub">empleados asignados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DÍA LIBRE HOY</div>
          <div className="stat-value">{indicadores.libres}</div>
          <div className="stat-sub">empleados descansan</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">HORAS SEMANALES</div>
          <div className="stat-value">{indicadores.horas.toFixed(1)} h</div>
          <div className="stat-sub">total de la semana</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TURNOS TOTALES</div>
          <div className="stat-value">{indicadores.turnos}</div>
          <div className="stat-sub">esta semana</div>
        </div>
      </div>

      <div className="admin-calendar-container">
        <h2 className="section-title">Calendario semanal</h2>
        <div className="admin-calendar-scroll">
          <table className="admin-calendar">
            {empleados.length === 0
              ? (
                <tbody>
                  <tr>
                    <td className="no-empleados" colSpan={8}>No hay empleados registrados aún.</td>
                  </tr>
                </tbody>
              )
              : (
                <>
                  <thead>
                    <tr>
                      <th className="col-employee">Empleado</th>
                      {dias.map((dia, indice) => (
                        <th key={aIso(dia)}>{DIAS_SEMANA[indice]} {dia.getDate()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empleados.map(empleado => (
                      <tr key={empleado.id}>
                        <td className="col-employee">{empleado.nombre}</td>
                        {dias.map(dia => {
                          const delDia = turnosDeFecha(turnos, dia, empleado.id);
                          const clases = ["cell"];
                          if (mismaFecha(dia, hoy)) clases.push("today");
                          if (delDia.length > 0) clases.push("has-turno");

                          return (
                            <td key={aIso(dia)} className={clases.join(" ")}
                              onClick={() => setEnFormulario({
                                turno: null,
                                previos: { empleadoId: empleado.id, fecha: aIso(dia) }
                              })}>
                              {delDia.length === 0 && <div className="cell-empty">Libre</div>}
                              {delDia.map(turno => (
                                <div className="cell-turno-block" key={turno.id}
                                  onClick={evento => {
                                    evento.stopPropagation();
                                    setEnFormulario({ turno, previos: {} });
                                  }}>
                                  <div className="cell-hours">
                                    {formatoHora(turno.horaInicio)}–{formatoHora(turno.horaFin)}
                                    {turno.esRecurrenteSemanal && (
                                      <span className="cell-recurrent-mark" title="Se repite cada semana"> ↻</span>
                                    )}
                                  </div>
                                  <div className="cell-station">{turno.estacion}</div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
          </table>
        </div>
        <p className="calendar-hint">
          Haz clic en una celda para crear o editar el turno. Los turnos con ↻ se repiten cada semana.
        </p>
      </div>

      <div className="admin-solicitudes-container">
        <h2 className="section-title">Solicitudes pendientes</h2>
        <div className="solicitudes-list">
          {porResponder.length === 0 && (
            <div className="solicitudes-empty">No hay solicitudes pendientes.</div>
          )}
          {porResponder.map(solicitud => (
            <TarjetaSolicitud key={solicitud.id} solicitud={solicitud} conAcciones
              ocupado={String(respondiendo) === String(solicitud.id)}
              alResponder={responder}
              nombre={usuarios.find(usuario => String(usuario.id) === String(solicitud.empleadoId))?.nombre
                ?? "Empleado desconocido"} />
          ))}
        </div>
      </div>

      {enFormulario && (
        <FormularioTurno turno={enFormulario.turno} previos={enFormulario.previos}
          empleados={empleados} turnos={turnos} alCerrar={() => setEnFormulario(null)} />
      )}
    </section>
  );
}

export default TurnosAdmin;
