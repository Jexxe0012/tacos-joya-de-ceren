import AyudaContextual from "../../components/AyudaContextual.jsx";
import DialogoConsulta from "../../components/DialogoConsulta.jsx";
import { presentarIndicadoresReporte, diasEnRango } from "./modeloReporte.js";

function Indicador({ id, titulo, valor, detalle, claseValor = "", ayuda, children }) {
  const encabezado = <h3 className="h6 text-body-secondary mb-0" id={`titulo-${id}`}>{titulo}</h3>;
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <article className="app-panel h-100 p-3 p-md-4" aria-labelledby={`titulo-${id}`}>
        <div className="mb-2">
          {ayuda ? (
            <AyudaContextual tema="Eficiencia de porción" encabezado={encabezado}>
              {ayuda}
            </AyudaContextual>
          ) : <div className="app-ayuda-encabezado reportes-titulo-indicador">{encabezado}</div>}
        </div>
        <p className={`reportes-indicador-valor fw-bold mb-2 ${claseValor}`} id={`valor-${id}`}>{valor}</p>
        <p className="small text-body-secondary mb-0" id={`detalle-${id}`}>{detalle}</p>
        {children}
      </article>
    </div>
  );
}

export default function Indicadores({ reporte }) {
  const { indicadores, rango } = reporte;
  const valores = presentarIndicadoresReporte(indicadores, diasEnRango(rango.inicio, rango.fin));
  return (
    <>
      <h2 className="h5 fw-semibold mb-3" id="titulo-indicadores">Resumen del período</h2>
      <div className="row g-3">
        <Indicador id="ventas" titulo="Ventas" valor={valores.ventas} detalle={valores.detalleVentas} />
        <Indicador id="mermas" titulo="Mermas" valor={valores.mermas} detalle={valores.detalleMermas}
          claseValor="reportes-valor-merma" />
        <Indicador id="eficiencia" titulo="Eficiencia de porción (peso)" valor={valores.eficiencia}
          detalle={valores.detalleEficiencia}
          ayuda={
            <>
              <p>Divide el peso estándar de las ventas entre el peso de las salidas por «Consumo en cocina» y multiplica por 100.</p>
              <p>Selecciona «Todas las recetas» para compararlos. El cálculo usa las fichas actuales y los ingredientes de peso vinculados. Excluye mermas, litros y unidades. Interpreta el resultado como una comparación de pesos.</p>
            </>
          }>
          {valores.filas.length > 0 && (
            <DialogoConsulta
              id="datos-eficiencia"
              titulo="Eficiencia por producto"
              textoBoton="Ver comparación por producto"
              ancho
            >
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
            </DialogoConsulta>
          )}
        </Indicador>
      </div>
    </>
  );
}

