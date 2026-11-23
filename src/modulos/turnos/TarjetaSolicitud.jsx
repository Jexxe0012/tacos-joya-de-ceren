/**
 * TarjetaSolicitud — una solicitud de día libre o cambio de turno.
 *
 * El empleado la ve solo para consultar su estado; el administrador la
 * ve con los botones de aceptar y rechazar mientras siga pendiente.
 */

import { fechaHumana } from "./turnosService.js";

function TarjetaSolicitud({ solicitud, nombre, conAcciones = false, alResponder, ocupado = false }) {
  return (
    <div className={`solicitud-card ${solicitud.estado}`}>
      <div className="solicitud-info">
        <div className="solicitud-header">
          <span className="solicitud-nombre">{nombre}</span>
          <span className="solicitud-fecha">{fechaHumana(solicitud.fecha)}</span>
          <span className={`solicitud-estado ${solicitud.estado}`}>{solicitud.estado}</span>
        </div>
        <div className="solicitud-mensaje">{solicitud.mensaje}</div>
      </div>

      {conAcciones && solicitud.estado === "pendiente" && (
        <div className="solicitud-actions">
          <button type="button" className="btn-accept" disabled={ocupado}
            onClick={() => alResponder(solicitud, "aceptada")}>
            Aceptar
          </button>
          <button type="button" className="btn-reject" disabled={ocupado}
            onClick={() => alResponder(solicitud, "rechazada")}>
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}

export default TarjetaSolicitud;
