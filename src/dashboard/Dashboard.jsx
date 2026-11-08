import IndicadoresDashboard from "./componentes/IndicadoresDashboard.jsx";
import GraficaVentas from "./componentes/GraficaVentas.jsx";
import AlertasOperativas from "./componentes/AlertasOperativas.jsx";
import AbastecimientoPrevisto from "./componentes/AbastecimientoPrevisto.jsx";
import PedidosActivos from "./componentes/PedidosActivos.jsx";

function Dashboard() {
  return (
    <>
      <section className="mb-4">
        <h1 className="h3 fw-bold mb-2">
          Resumen de operación
        </h1>

        <p className="text-body-secondary mb-0">
          Indicadores de ventas, consumo, mermas y cobertura.
        </p>
      </section>

      <IndicadoresDashboard />

      <div className="row g-3 mt-1">
        <section className="col-12 col-xl-8" aria-label="Ventas por día">
          <GraficaVentas />
        </section>
        <section className="col-12 col-xl-4" aria-label="Alertas operativas">
          <AlertasOperativas />
        </section>
      </div>

      <div className="row g-3 mt-1">
        <section className="col-12 col-xl-8" aria-label="Abastecimiento previsto">
          <AbastecimientoPrevisto />
        </section>
        <section className="col-12 col-xl-4" aria-label="Pedidos activos">
          <PedidosActivos />
        </section>
      </div>
    </>
  );
}

export default Dashboard;
