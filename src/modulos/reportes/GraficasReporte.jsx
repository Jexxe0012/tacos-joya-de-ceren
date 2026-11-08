import { useLayoutEffect, useRef, useState } from "react";
import { crearGraficaReporte } from "./graficaService.js";
import { datosGraficasReporte, datosGraficaMermasReporte } from "./series.js";

function LienzoGrafica({ grafica }) {
  const canvas = useRef(null);
  const desplazamiento = useRef(null);

  useLayoutEffect(() => {
    const instancia = crearGraficaReporte(canvas.current, grafica);
    if (desplazamiento.current) desplazamiento.current.scrollLeft = 0;
    return () => instancia.destroy();
  }, [grafica]);

  const lienzo = (
    <div className="reportes-grafica" style={{ minWidth: grafica.anchoMinimo }}>
      <canvas ref={canvas} id={`grafica-${grafica.tipo}`} role="img"
        aria-labelledby={`titulo-grafica-${grafica.tipo}`} aria-describedby={`descripcion-${grafica.tipo}`}>
        Consulta los valores en la tabla de datos debajo de la gráfica.
      </canvas>
    </div>
  );

  if (grafica.tipo !== "ventas") return lienzo;
  return (
    <div className="reportes-grafica-desplazable" id="desplazamiento-ventas" ref={desplazamiento}
      tabIndex={0} role="region" aria-label="Gráfica de ventas con desplazamiento horizontal">
      {lienzo}
    </div>
  );
}

function TablaGrafica({ tipo, filas, columnas, etiqueta, abierta }) {
  return (
    <details className="reportes-datos mt-3" id={`datos-${tipo}`} open={abierta || undefined}>
      <summary>Ver datos de la gráfica</summary>
      <div className="table-responsive mt-2" tabIndex={0} role="region" aria-label={etiqueta}>
        <table className="table table-sm mb-0">
          <caption className="visually-hidden">{etiqueta}</caption>
          <thead><tr>{columnas.map(columna => <th key={columna} scope="col">{columna}</th>)}</tr></thead>
          <tbody id={`tabla-${tipo}`}>
            {filas.length ? filas.map(([nombre, ...valores], indice) => (
              <tr key={`${nombre}-${indice}`}>
                <th scope="row">{nombre}</th>
                {valores.map((valor, columna) => <td key={columnas[columna + 1]}>{valor}</td>)}
              </tr>
            )) : <tr><td colSpan={columnas.length}>Sin datos en este período</td></tr>}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function TarjetaGrafica({ grafica, columnas, etiqueta, controles, children }) {
  const hayDatos = grafica.valores.some(valor => valor !== null);
  return (
    <div className="col-12 col-xl-6">
      <section className="app-panel h-100 p-3 p-md-4" aria-labelledby={`titulo-grafica-${grafica.tipo}`}>
        <h2 className="h6 fw-semibold mb-2" id={`titulo-grafica-${grafica.tipo}`}>{grafica.titulo}</h2>
        {controles}
        <p className="small text-body-secondary" id={`descripcion-${grafica.tipo}`}>{grafica.descripcion}</p>
        {hayDatos && <LienzoGrafica grafica={grafica} />}
        {!hayDatos && <p className="reportes-vacio p-3 mt-3" id={`vacio-${grafica.tipo}`}>Sin datos en este período</p>}
        <TablaGrafica tipo={grafica.tipo} filas={grafica.filas} columnas={columnas} etiqueta={etiqueta}
           />
        {children}
      </section>
    </div>
  );
}

function GraficaMermas({ mermas }) {
  const [unidad, fijarUnidad] = useState("kg");
  const controles = (
    <div className="btn-group btn-group-sm mb-3" role="group" aria-label="Medida de la gráfica de mermas">
      {[["kg", "Kilogramos"], ["USD", "Costo (USD)"]].map(([medida, titulo]) => (
        <button className={`btn btn-app-secondary${unidad === medida ? " active" : ""}`}
          type="button" id={`mermas-en-${medida.toLowerCase()}`} key={medida}
          aria-pressed={unidad === medida} onClick={() => fijarUnidad(medida)}>{titulo}</button>
      ))}
    </div>
  );
  return (
    <TarjetaGrafica grafica={datosGraficaMermasReporte(mermas, unidad)} controles={controles}
      columnas={["Producto", "Cantidad registrada", "Peso (kg)", "Costo estimado"]} etiqueta="Mermas registradas por producto">
      <p className="small text-body-secondary mt-3 mb-0">
        Costos estimados con los precios actuales de Inventario. No se convierten litros, cajas ni unidades a kg.
        Consulta los avisos del reporte si hay pesos o costos parciales.
      </p>
    </TarjetaGrafica>
  );
}

function HallazgoOperativo({ hallazgo }) {
  return (
    <div className="col-12">
      <section className="app-panel h-100 p-3 p-md-4" aria-labelledby="titulo-hallazgo">
        <h2 className="h6 fw-semibold mb-2" id="titulo-hallazgo">Hallazgo operativo</h2>
        <p className="small text-body-secondary mb-3">Según las mermas registradas y los filtros aplicados.</p>
        <div className="reportes-hallazgo ps-3">
          <h3 className="h6 fw-semibold" id="hallazgo-observacion">{hallazgo.titulo}</h3>
          <p className="small text-body-secondary" id="hallazgo-detalle">{hallazgo.detalle}</p>
          <h3 className="h6 fw-semibold mt-4">Sugerencia</h3>
          <p className="small mb-0" id="hallazgo-sugerencia">{hallazgo.sugerencia}</p>
        </div>
      </section>
    </div>
  );
}

export default function GraficasReportes({ reporte }) {
  const { ventas, ingresos, demanda } = datosGraficasReporte(reporte.series, reporte.rango);
  return (
    <>
      <TarjetaGrafica grafica={ventas} columnas={["Fecha", "Unidades vendidas"]} etiqueta="Ventas registradas por día" />
      <TarjetaGrafica grafica={ingresos} columnas={["Receta", "Ingresos (USD)"]} etiqueta="Ingresos registrados por receta" />
      <GraficaMermas mermas={reporte.series.mermas} />
      <TarjetaGrafica grafica={demanda} columnas={["Fecha prevista", "Unidades estimadas"]}
        etiqueta="Demanda estimada según ventas registradas">
        <p className="small text-body-secondary mt-3 mb-0">
          Estimación según las ventas registradas, no pedidos confirmados.
          Los días sin registros aparecen como «Sin datos» y no se cuentan como días con cero ventas.
        </p>
      </TarjetaGrafica>
      <HallazgoOperativo hallazgo={reporte.hallazgo} />
    </>
  );
}
