import TarjetaIndicador from "./TarjetaIndicador.jsx";
const numero = valor => valor.toLocaleString("es-SV", { maximumFractionDigits: 2 });
export default function IndicadoresDashboard({ resumen }) {
  const { promedio, kg, consumo, recetasSinFicha, reporte, criticos, inventarioValido } = resumen;
  return <section className="row g-3">
    <div className="col-12 col-sm-6 col-xl-3"><TarjetaIndicador titulo="Ventas previstas" valor={promedio === null ? "Sin datos" : numero(promedio)} descripcion="Estimación diaria: promedio de ventas reales de los últimos 7 días." /></div>
    <div className="col-12 col-sm-6 col-xl-3"><TarjetaIndicador titulo="Consumo esperado" valor={kg === null ? "Sin datos" : `${numero(kg)} kg`} descripcion="Promedio diario según ventas y fichas actuales. Solo peso en el total.">
      <details className="small mt-3"><summary>Ver detalle por insumo</summary>
        <p className="mt-2">Estimación con las porciones de las recetas actuales; los precios históricos de las ventas se conservan.</p>
        {recetasSinFicha > 0 && <p>Hay ventas o ingredientes sin ficha válida. La estimación es parcial.</p>}
        <ul className="list-unstyled">{consumo.map(item => <li key={item.id}>{item.nombre}: {numero(item.cantidad)} {item.unidad}</li>)}</ul>
        {!consumo.length && <p>Registra ventas y recetas con ingredientes para estimar el consumo.</p>}
      </details>
    </TarjetaIndicador></div>
    <div className="col-12 col-sm-6 col-xl-3"><TarjetaIndicador titulo="Merma semanal" valor={reporte.indicadores.mermaKg === null ? "Sin peso registrado" : `${numero(reporte.indicadores.mermaKg)} kg`} descripcion={reporte.indicadores.sinPeso ? "Hay mermas en otras unidades; consulta su costo en Reportes." : "Últimos siete días, convertido a kg cuando la unidad lo permite."} /></div>
    <div className="col-12 col-sm-6 col-xl-3"><TarjetaIndicador titulo="Inventario crítico" valor={!inventarioValido.length ? "Sin datos" : criticos.length} descripcion={!inventarioValido.length ? "Registra existencias y mínimos en Inventario." : "Productos agotados o en su mínimo de existencias."} /></div>
  </section>;
}
