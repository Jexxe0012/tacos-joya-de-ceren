import DialogoConsulta from "../../../components/DialogoConsulta.jsx";
import TarjetaIndicador from "./TarjetaIndicador.jsx";
const numero = (valor) =>
  valor.toLocaleString("es-SV", { maximumFractionDigits: 2 });
export default function IndicadoresDashboard({ resumen }) {
  const {
    promedio,
    kg,
    consumo,
    recetasSinFicha,
    reporte,
    criticos,
    inventarioValido
  } = resumen;
  return (
    <section className="row g-3 app-metricas">
      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Ventas previstas"
          valor={promedio === null ? "Sin datos" : numero(promedio)}
          descripcion="Unidades por día"
          ayuda="Promedio de las ventas registradas para la operación en los últimos 7 días."
        />
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Consumo esperado"
          valor={kg === null ? "Sin datos" : `${numero(kg)} kg`}
          descripcion={recetasSinFicha > 0 ? "Estimación parcial: faltan fichas válidas." : "Peso por día"}
          ayuda="Promedio diario según las ventas y las fichas actuales. El total incluye solo peso. Consulta las otras unidades en el detalle por insumo."
        >
          <DialogoConsulta titulo="Consumo diario por insumo" textoBoton="Ver detalle por insumo" ancho>
            {consumo.length ? (
              <table className="table table-sm mb-0">
                <thead><tr><th scope="col">Insumo</th><th scope="col">Consumo diario</th></tr></thead>
                <tbody>
                  {consumo.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">{item.nombre}</th>
                      <td>{numero(item.cantidad)} {item.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-0">Registra ventas y recetas con ingredientes para estimar el consumo.</p>
            )}
          </DialogoConsulta>
        </TarjetaIndicador>
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Merma semanal"
          valor={
            reporte.indicadores.mermaKg === null
              ? "Sin peso registrado"
              : `${numero(reporte.indicadores.mermaKg)} kg`
          }
          descripcion={
            reporte.indicadores.sinPeso
              ? "Hay mermas en otras unidades; consulta su costo en Reportes."
              : "Últimos 7 días"
          }
        />
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <TarjetaIndicador
          titulo="Inventario crítico"
          valor={!inventarioValido.length ? "Sin datos" : criticos.length}
          descripcion={
            !inventarioValido.length
              ? "Registra existencias y mínimos en Inventario."
              : "Agotados o en el mínimo"
          }
        />
      </div>
    </section>
  );
}
