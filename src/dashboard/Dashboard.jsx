import { useMemo } from "react";
import { useRegistrosReporte } from "../modulos/reportes/useRegistrosReporte.js";
import { obtenerResumenDashboard } from "./datosIndicadores.js";
import IndicadoresDashboard from "./componentes/IndicadoresDashboard.jsx";
import GraficaVentas from "./componentes/GraficaVentas.jsx";
import AlertasOperativas from "./componentes/AlertasOperativas.jsx";
import AbastecimientoPrevisto from "./componentes/AbastecimientoPrevisto.jsx";
import PedidosActivos from "./componentes/PedidosActivos.jsx";

export default function Dashboard() {
  const { registros, problemas } = useRegistrosReporte();
  const resumen = useMemo(
    () => obtenerResumenDashboard(registros),
    [registros]
  );
  return (
    <>
      <section className="mb-4">
        <h1 className="h3 fw-bold mb-2">Resumen de operación</h1>
        <p className="text-body-secondary mb-0">
          Ventas, consumo estimado, mermas y existencias del sistema.
        </p>
      </section>
      {problemas?.map((mensaje) => (
        <p className="alert alert-warning" key={mensaje}>
          {mensaje}
        </p>
      ))}
      <IndicadoresDashboard resumen={resumen} />
      <div className="row g-3 mt-1">
        <section className="col-12 col-xl-8">
          <GraficaVentas dias={resumen.dias} />
        </section>
        <section className="col-12 col-xl-4">
          <AlertasOperativas alertas={resumen.alertas} />
        </section>
      </div>
      <div className="row g-3 mt-1">
        <section className="col-12 col-xl-8">
          <AbastecimientoPrevisto
            ingredientes={resumen.criticos}
            hayInventario={resumen.inventarioValido.length > 0}
          />
        </section>
        <section className="col-12 col-xl-4">
          <PedidosActivos pedidos={resumen.pedidos} />
        </section>
      </div>
    </>
  );
}
