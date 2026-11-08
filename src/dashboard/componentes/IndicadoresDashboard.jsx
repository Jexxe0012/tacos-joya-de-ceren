import { useMemo } from "react";
import TarjetaIndicador from "./TarjetaIndicador.jsx";
import { obtenerIndicadoresDashboard } from "../datosIndicadores.js";

function IndicadoresDashboard() {
  const indicadores = useMemo(() => obtenerIndicadoresDashboard(), []);

  return (
    <section className="row g-3">

      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Ventas previstas"
          valor={indicadores.ventas.valor}
          descripcion={indicadores.ventas.descripcion}
        />
      </div>

      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Consumo esperado"
          valor={indicadores.consumo.valor}
          descripcion={indicadores.consumo.descripcion}
        >
          <button className="dashboard-consumo-boton" type="button" data-bs-toggle="collapse"
            data-bs-target="#detalle-consumo-insumos" aria-expanded="false"
            aria-controls="detalle-consumo-insumos">
            Ver detalle por insumo
          </button>
          <div className="collapse" id="detalle-consumo-insumos">
            <div className="dashboard-consumo-detalle">
              <p className="mb-2">{indicadores.consumo.nota}</p>
              <ul className="list-unstyled mb-0" aria-label="Consumo estimado por insumo">
                {indicadores.consumo.insumos.map(insumo => (
                  <li className="dashboard-consumo-insumo" key={insumo.id}>
                    <span>{insumo.nombre}</span>
                    <strong>{insumo.valor}</strong>
                  </li>
                ))}
                {indicadores.consumo.sinIngredientes && (
                  <li>Las recetas no tienen ingredientes válidos registrados.</li>
                )}
              </ul>
            </div>
          </div>
        </TarjetaIndicador>
      </div>

      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Merma semanal"
          valor={indicadores.merma.valor}
          descripcion={indicadores.merma.descripcion}
        />
      </div>

      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Inventario crítico"
          valor={indicadores.inventario.valor}
          descripcion={indicadores.inventario.descripcion}
        />
      </div>

    </section>
  );
}

export default IndicadoresDashboard;
