/**
 * FormularioSolicitud — pedir un día libre o un cambio de turno.
 *
 * Antes de guardar se vuelve a consultar si el empleado ya tiene una
 * solicitud pendiente: pudo enviarla desde otra pestaña mientras esta
 * ventana estaba abierta.
 */

import { useRef } from "react";
import CapaModal from "../../components/CapaModal.jsx";
import { useFormulario } from "../../hooks/useFormulario.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import { reglasSolicitud } from "./reglasTurno.js";
import { MAX_MENSAJE, crearSolicitud, tienePendiente } from "./solicitudesService.js";

function FormularioSolicitud({ empleadoId, alCerrar, alAvisarPendiente }) {
  const form = useFormulario({ mensaje: "" }, reglasSolicitud);
  const primerCampo = useRef(null);

  const alEnviar = form.enviar(async valores => {
    if (tienePendiente(empleadoId)) {
      alCerrar();
      alAvisarPendiente();
      return;
    }

    try {
      crearSolicitud({ empleadoId, mensaje: valores.mensaje });
    } catch (fallo) {
      await mostrarError("No se pudo enviar la solicitud", fallo.message);
      return;
    }

    alCerrar();
    aviso("Solicitud enviada");
  });

  return (
    <CapaModal
      idTitulo="modal-solicitud-title"
      titulo="Nueva solicitud"
      subtitulo="Cuéntale al administrador qué necesitas: día libre, cambio de turno, etc."
      alCerrar={alCerrar}
      enfocarAlAbrir={primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="solicitud-mensaje">Mensaje</label>
        <textarea id="solicitud-mensaje" ref={primerCampo} maxLength={MAX_MENSAJE}
          className={form.errores.mensaje ? "is-invalid" : undefined}
          placeholder="Ej: Necesito el domingo 12 libre por un tema familiar…"
          {...form.campo("mensaje")} />
        {form.errores.mensaje && (
          <div className="invalid-feedback d-block">{form.errores.mensaje}</div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="btn-submit" disabled={form.enviando}>Enviar</button>
        </div>
      </form>
    </CapaModal>
  );
}

export default FormularioSolicitud;
