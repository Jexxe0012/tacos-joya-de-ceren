/**
 * TurnosEmpleado — "Mis turnos".
 *
 * El empleado ve su semana, puede moverse entre semanas, registrar una
 * merma rápida y enviar solicitudes. No gestiona turnos: eso es del
 * administrador.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useColeccion } from "../../hooks/useColeccion.js";
import { error as mostrarError } from "../../services/dialogos.js";
import { COLECCION as COLECCION_INVENTARIO } from "../inventario/inventarioService.js";
import FormularioSolicitud from "./FormularioSolicitud.jsx";
import MermaRapida from "./MermaRapida.jsx";
import TarjetaSolicitud from "./TarjetaSolicitud.jsx";
import {
  COLECCION as COLECCION_SOLICITUDES,
  solicitudesDe,
  tienePendiente
} from "./solicitudesService.js";
import {
  COLECCION,
  DIAS_SEMANA,
  aIso,
  etiquetaSemana,
  formatoHora,
  lunesDe,
  mismaFecha,
  sumarDias,
  turnosDeFecha
} from "./turnosService.js";

/** El saludo cambia con la hora del día. */
function saludoDe(hora) {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

function TurnosEmpleado({ sesion }) {
  const { registros: turnos, problema } = useColeccion(COLECCION);
  const { registros: solicitudes } = useColeccion(COLECCION_SOLICITUDES);
  const { registros: productos } = useColeccion(COLECCION_INVENTARIO);

  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [mermaAbierta, setMermaAbierta] = useState(false);
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice)),
    [lunes]
  );
  const mias = useMemo(() => solicitudesDe(solicitudes, sesion.id), [solicitudes, sesion.id]);

  const hoy = new Date();
  const primerNombre = String(sesion.nombre ?? "").split(" ")[0];

  function avisarPendiente() {
    mostrarError(
      "Ya tienes una solicitud pendiente",
      "Espera a que el administrador la responda para enviar otra."
    );
  }

  /** Con una solicitud pendiente, el formulario ni se abre: se explica por qué. */
  function abrirSolicitud() {
    if (tienePendiente(sesion.id)) {
      avisarPendiente();
      return;
    }
    setSolicitudAbierta(true);
  }

  return (
    <section>
      <h1 className="emp-greeting">Mis turnos</h1>
      <p className="emp-subtitle">{saludoDe(hoy.getHours())}, {primerNombre}</p>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="week-nav">
        <button type="button" aria-label="Semana anterior"
          onClick={() => setLunes(sumarDias(lunes, -7))}>←</button>
        <span className="week-label">{etiquetaSemana(lunes, sumarDias(lunes, 6))}</span>
        <button type="button" aria-label="Semana siguiente"
          onClick={() => setLunes(sumarDias(lunes, 7))}>→</button>
      </div>

      <div className="emp-week">
        {dias.map((dia, indice) => {
          const delDia = turnosDeFecha(turnos, dia, sesion.id);
          return (
            <div className={`day-card${mismaFecha(dia, hoy) ? " day-today" : ""}`} key={aIso(dia)}>
              <div className="day-header">{DIAS_SEMANA[indice]}</div>
              <div className="day-number">{dia.getDate()}</div>

              {delDia.length === 0 && <div className="day-libre">Libre</div>}
              {delDia.map(turno => (
                <div className="day-turno" key={turno.id}>
                  <div className="turno-hours">
                    {formatoHora(turno.horaInicio)}–{formatoHora(turno.horaFin)}
                  </div>
                  <div className="turno-station">{turno.estacion}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <h2 className="quick-actions-title">Acciones rápidas</h2>
      <div className="quick-actions">
        <Link to="/recetas" className="action-card">
          <div className="action-title">Consultar receta</div>
          <div className="action-desc">Ver porciones estándar</div>
        </Link>

        <button type="button" className="action-card" onClick={() => setMermaAbierta(true)}>
          <div className="action-title">Registrar merma</div>
          <div className="action-desc">Descontar inventario</div>
        </button>

        <div className="action-card alert">
          <div className="action-title">Alerta merma</div>
          <div className="action-desc">Sin alertas actualmente</div>
        </div>
      </div>

      <div className="solicitud-actions-container">
        <h2 className="quick-actions-title" style={{ margin: 0 }}>Mis solicitudes</h2>
        <button type="button" className="btn btn-app-primary" onClick={abrirSolicitud}>
          + Nueva solicitud
        </button>
      </div>

      <div className="solicitudes-list">
        {mias.length === 0 && (
          <div className="solicitudes-empty">No has enviado solicitudes todavía.</div>
        )}
        {mias.map(solicitud => (
          <TarjetaSolicitud key={solicitud.id} solicitud={solicitud} nombre={sesion.nombre} />
        ))}
      </div>

      {mermaAbierta && (
        <MermaRapida productos={productos} sesion={sesion} alCerrar={() => setMermaAbierta(false)} />
      )}

      {solicitudAbierta && (
        <FormularioSolicitud empleadoId={sesion.id} alCerrar={() => setSolicitudAbierta(false)}
          alAvisarPendiente={avisarPendiente} />
      )}
    </section>
  );
}

export default TurnosEmpleado;
