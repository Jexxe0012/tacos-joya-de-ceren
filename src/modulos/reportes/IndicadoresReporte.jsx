import { presentarIndicadoresReporte, diasEnRango } from "./modeloReporte.js";

function Indicador({ id, titulo, valor, detalle, claseValor = "", children }) {
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <article className="app-panel h-100 p-3 p-md-4" aria-labelledby={`titulo-${id}`}>
        <h3 className="h6 text-body-secondary mb-3" id={`titulo-${id}`}>{titulo}</h3>
        <p className={`reportes-indicador-valor fw-bold mb-2 ${claseValor}`} id={`valor-${id}`}>{valor}</p>
        <p className="small text-body-secondary mb-0" id={`detalle-${id}`}>{detalle}</p>
        {children}
      </article>
    </div>
  );
}

export default function Indicadores({ reporte }) {
  const { indicadores, rango, alcance } = reporte;
  const valores = presentarIndicadoresReporte(indicadores, diasEnRango(rango.inicio, rango.fin));
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h2 className="h5 fw-semibold mb-0" id="titulo-indicadores">Resumen del período</h2>
        <span className="badge rounded-pill app-estado app-estado-atencion" id="estado-datos">
          {indicadores.ejemplos ? "Incluye ventas de ejemplo" : "Registros del sistema"}
        </span>
      </div>
      <p className="small text-body-secondary mb-3" id="alcance-reportes">Datos guardados en este navegador. {alcance}</p>
      <div className="row g-3">
        <Indicador id="ventas" titulo="Ventas" valor={valores.ventas} detalle={valores.detalleVentas} />
        <Indicador id="mermas" titulo="Mermas" valor={valores.mermas} detalle={valores.detalleMermas}
          claseValor="reportes-valor-merma" />
        <Indicador id="eficiencia" titulo="Eficiencia de porción (peso)" valor={valores.eficiencia}
          detalle={valores.detalleEficiencia}>
          <details className="small mt-3" id="datos-eficiencia" hidden={!valores.filas.length}>
            <summary>Ver comparación por producto</summary>
            <div className="table-responsive mt-2">
              <table className="table table-sm mb-0">
                <caption>Consumo estándar de las ventas y salidas de cocina del período, en kg</caption>
                <thead><tr><th scope="col">Producto</th><th scope="col">Estándar</th><th scope="col">Real</th></tr></thead>
                <tbody id="tabla-eficiencia">
                  {valores.filas.map(fila => (
                    <tr key={fila.id}>
                      <th scope="row">{fila.nombre}</th><td>{fila.estandar}</td><td>{fila.real}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Indicador>
      </div>
      <p className="small text-body-secondary mt-3 mb-0">
        Eficiencia en peso = kg estándar de las ventas ÷ kg de salidas por Consumo en cocina × 100.
        Usa las fichas actuales y los ingredientes de peso vinculados usados en esas ventas; excluye mermas, litros y unidades.
        Para compararla, selecciona Todas las recetas. No representa por sí sola la calidad de la porción.
      </p>
    </>
  );
}

