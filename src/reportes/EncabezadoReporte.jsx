import { useState } from "react";

export default function EncabezadoReporte({ reporte }) {
  const [exportando, fijarExportando] = useState(false);
  const disponible = ReportePDF.disponible();

  async function exportar() {
    if (exportando || !ReportePDF.disponible() || !Guard.requireRole("admin")) return;

    // Esta acción conserva el reporte aplicado al pulsar el botón.
    const usuario = Guard.getSesion().nombre || "Administrador";
    const generado = new Date();
    fijarExportando(true);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      await ReportePDF.descargar(reporte, usuario, generado);
      await UI.aviso("Reporte descargado");
    } catch (error) {
      console.error("No se pudo exportar Reportes:", error);
      await UI.error("No se pudo descargar el reporte", "Intenta de nuevo. Si el problema continúa, recarga la página.");
    } finally {
      fijarExportando(false);
    }
  }

  return (
    <div className="row mb-4">
      <div className="col-12 d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
        <div>
          <h1 className="h3 fw-bold mb-2">Reportes de operación</h1>
          <p className="text-body-secondary mb-0">Ventas, consumo, mermas y proyecciones para tomar decisiones.</p>
        </div>
        <button className="btn btn-app-secondary flex-shrink-0" type="button" id="btn-descargar-pdf"
          aria-describedby={disponible ? undefined : "estado-exportacion"} aria-busy={exportando || undefined}
          disabled={!disponible || exportando} onClick={exportar}>
          {exportando ? "Generando PDF…" : "Descargar reporte PDF"}
        </button>
      </div>
      {!disponible && (
        <div className="col-12">
          <p className="small text-body-secondary mt-2 mb-0" id="estado-exportacion" role="status">
            No se pudo cargar la descarga en PDF. Revisa tu conexión y recarga la página.
          </p>
        </div>
      )}
    </div>
  );
}
