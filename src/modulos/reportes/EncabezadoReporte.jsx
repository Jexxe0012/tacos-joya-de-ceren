import { useState } from "react";
import { useAuth } from "../../auth/useAuth.js";
import { aviso, error } from "../../services/dialogos.js";

export default function EncabezadoReporte({ reporte }) {
  const { sesion } = useAuth();
  const [exportando, setExportando] = useState(false);
  async function exportar() {
    if (exportando || sesion?.rol !== "admin") return;
    setExportando(true);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const { descargarReportePDF } = await import("./pdfService.js");
      await descargarReportePDF(reporte, sesion.nombre || "Administrador");
      await aviso("Reporte descargado");
    } catch (causa) {
      await error("No se pudo descargar el reporte", causa.message);
    } finally {
      setExportando(false);
    }
  }
  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
      <div><h1 className="h3 fw-bold mb-2">Reportes de operación</h1>
        <p className="text-body-secondary mb-0">Ventas, consumo, mermas y proyecciones para tomar decisiones.</p></div>
      <button className="btn btn-app-secondary" type="button" onClick={exportar} id="btn-descargar-pdf"
        disabled={exportando} aria-busy={exportando || undefined}>
        {exportando ? "Generando PDF…" : "Descargar reporte PDF"}
      </button>
    </div>
  );
}
