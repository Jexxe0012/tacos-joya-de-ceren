import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import EncabezadoReporte from "./EncabezadoReporte.jsx";
import GraficasReportes from "./GraficasReportes.jsx";

function Selector({ id, etiqueta, nombre, opciones, ...atributos }) {
  return (
    <div className="col-12 col-md-6 col-xl-3">
      <label className="form-label" htmlFor={id}>{etiqueta}</label>
      <select className="form-select" id={id} name={nombre} required {...atributos}>
        {opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
      <div className="invalid-feedback" id={`${id}-error`} />
    </div>
  );
}

function Fecha({ id, etiqueta, nombre, inicial, requerida, onInput }) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={id}>{etiqueta}</label>
      <input className="form-control" type="date" id={id} name={nombre} defaultValue={inicial}
        required={requerida} max={UI.fechaHoy()} aria-describedby={`${id}-error`}
        onFocus={evento => { evento.currentTarget.max = UI.fechaHoy(); }} onInput={onInput} />
      <div className="invalid-feedback" id={`${id}-error`} />
    </div>
  );
}

const opcionesPeriodo = [
  ["7", "Últimos 7 días"],
  ["30", "Últimos 30 días"],
  ["personalizado", "Rango personalizado"]
];

function Filtros({ iniciales, reporte, alAplicar }) {
  const formulario = useRef(null);
  const validar = useRef(null);
  const [periodo, fijarPeriodo] = useState(iniciales.periodo);
  const [recetas, fijarRecetas] = useState(opcionesRecetasReporte);
  const [aplicando, fijarAplicando] = useState(false);
  const personalizado = periodo === "personalizado";

  useEffect(() => {
    const form = formulario.current;
    // Valida vincula sus eventos a los campos de esta instancia del formulario.
    validar.current ??= Valida.enVivo(form, reglasFiltrosReporte(() => leerFiltrosReporte(form)));
  }, []);

  function cambiarPeriodo(evento) {
    const nuevoPeriodo = evento.target.value;
    fijarPeriodo(nuevoPeriodo);
    if (nuevoPeriodo !== "personalizado") {
      const { fechaInicio, fechaFin } = formulario.current.elements;
      Valida.limpiar(fechaInicio);
      Valida.limpiar(fechaFin);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (aplicando || !validar.current?.()) return;
    fijarAplicando(true);
    try {
      alAplicar(leerFiltrosReporte(evento.currentTarget));
      fijarRecetas(opcionesRecetasReporte());
      await UI.aviso("Reporte actualizado");
    } finally {
      fijarAplicando(false);
    }
  }

  return (
    <>
      <h2 className="h6 fw-semibold mb-3" id="titulo-filtros">Filtrar reportes</h2>
      <form id="formulario-filtros" ref={formulario} noValidate onSubmit={enviar}>
        <div className="row g-3 align-items-end">
          <Selector id="filtro-periodo" etiqueta="Período" nombre="periodo" opciones={opcionesPeriodo}
            value={periodo} onChange={cambiarPeriodo} aria-describedby="filtro-periodo-error" />
          <Selector id="filtro-insumo" etiqueta="Producto de merma" nombre="insumo" opciones={opcionesProductosReporte()}
            defaultValue={iniciales.insumo} aria-describedby="filtro-insumo-error" />
          <Selector id="filtro-receta" etiqueta="Receta vendida" nombre="receta" opciones={recetas}
            defaultValue={iniciales.receta} onFocus={() => fijarRecetas(refrescarRecetasReporte(reporte.rango))}
            aria-describedby="ayuda-receta filtro-receta-error" />
          <div className="col-12 col-md-6 col-xl-3 d-grid">
            <button className="btn btn-app-primary" type="submit" id="btn-aplicar-filtros"
              disabled={aplicando} aria-busy={aplicando || undefined}>Aplicar filtros</button>
          </div>
        </div>
        <fieldset className="mt-3" id="rango-personalizado" aria-describedby="ayuda-rango"
          hidden={!personalizado} disabled={!personalizado}>
          <legend className="h6">Fechas del reporte</legend>
          <p className="small text-body-secondary" id="ayuda-rango">
            Selecciona hasta 90 días, incluyendo ambas fechas. La fecha final no puede ser posterior a hoy.
          </p>
          <div className="row g-3">
            <Fecha id="filtro-fecha-inicio" etiqueta="Fecha inicial" nombre="fechaInicio"
              inicial={iniciales.fechaInicio} requerida={personalizado}
              onInput={() => revalidarFinReporte(formulario.current.elements.fechaFin, leerFiltrosReporte(formulario.current))} />
            <Fecha id="filtro-fecha-fin" etiqueta="Fecha final" nombre="fechaFin"
              inicial={iniciales.fechaFin} requerida={personalizado} />
          </div>
        </fieldset>
      </form>
      <p className="small text-body-secondary mt-3 mb-0" id="ayuda-receta">
        Las recetas vendibles se toman de Recetas: tacos, bebidas y complementos. Crear una receta no registra una venta.
      </p>
      <p className="small text-body-secondary mt-3 mb-0" id="resumen-filtros" role="status" aria-atomic="true">
        {reporte.resumen}
      </p>
    </>
  );
}

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

function Indicadores({ reporte }) {
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

function Resultados({ reporte }) {
  return (
    <>
      {reporte.sinDatos && (
        <p className="reportes-vacio p-3 mb-4" id="vacio-reportes" role="status">
          Sin datos para estos filtros. Selecciona otro período, receta o producto, o registra ventas y mermas.
        </p>
      )}
      {reporte.avisos.length > 0 && (
        <p className="small mb-4" id="aviso-datos" role="status">{reporte.avisos.join(" ")}</p>
      )}
      <section aria-labelledby="titulo-indicadores">
        <Indicadores reporte={reporte} />
      </section>
      <div className="row g-3 mt-2" id="graficas-reportes">
        <GraficasReportes reporte={reporte} />
      </div>
    </>
  );
}

function Reportes({ iniciales, reporteInicial, destinoResultados }) {
  const [reporte, fijarReporte] = useState(reporteInicial);
  return (
    <>
      <EncabezadoReporte reporte={reporte} />
      <section className="reportes-filtros app-panel p-3 p-md-4 mb-4" id="filtros-reportes" aria-labelledby="titulo-filtros">
        <Filtros iniciales={iniciales} reporte={reporte} alAplicar={filtros => fijarReporte(calcularReporte(filtros))} />
      </section>
      {createPortal(<Resultados reporte={reporte} />, destinoResultados)}
    </>
  );
}

if (Guard.requireRole("admin")) {
  const iniciales = filtrosInicialesReporte();
  const destinoResultados = document.getElementById("resultados-reportes");
  createRoot(document.getElementById("reportes-react")).render(
    <Reportes iniciales={iniciales} reporteInicial={calcularReporte(iniciales)} destinoResultados={destinoResultados} />
  );
}
