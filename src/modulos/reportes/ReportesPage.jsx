import { useMemo, useState } from "react";
import { useRegistrosReporte } from "./useRegistrosReporte.js";
import { catalogosReporte, calcularReporte, filtrosInicialesReporte } from "./modeloReporte.js";
import EncabezadoReporte from "./EncabezadoReporte.jsx";
import FiltrosReporte from "./FiltrosReporte.jsx";
import ConexionesReporte from "./ConexionesReporte.jsx";
import IndicadoresReporte from "./IndicadoresReporte.jsx";
import GraficasReporte from "./GraficasReporte.jsx";

export default function ReportesPage() {
  const { registros, recargar, problemas } = useRegistrosReporte();
  const [aplicados, setAplicados] = useState(filtrosInicialesReporte);
  const catalogos = useMemo(() => catalogosReporte(registros), [registros]);
  const reporte = useMemo(() => calcularReporte(aplicados, registros), [aplicados, registros]);
  return (
    <>
      <EncabezadoReporte reporte={reporte} />
      <FiltrosReporte iniciales={aplicados} catalogos={catalogos} resumen={reporte.resumen}
        onAplicar={filtros => { recargar(); setAplicados(filtros); }} />
      <ConexionesReporte registros={registros} />
      {problemas.map(mensaje => <p className="alert alert-warning" role="status" key={mensaje}>{mensaje}</p>)}
      {reporte.sinDatos && <p className="reportes-vacio p-3 mb-4" id="vacio-reportes" role="status">Sin datos para estos filtros. Selecciona otro período, receta o producto.</p>}
      {!!reporte.avisos.length && <p className="small mb-4" role="status">{reporte.avisos.join(" ")}</p>}
      <section aria-labelledby="titulo-indicadores"><IndicadoresReporte reporte={reporte} /></section>
      <div className="row g-3 mt-2"><GraficasReporte reporte={reporte} /></div>
    </>
  );
}
