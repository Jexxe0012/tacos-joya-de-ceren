/**
 * Recetas — catálogo de recetas y fichas técnicas.
 *
 * Reemplaza a pages/recetas.html con js/recetas.js. Conserva el listado
 * con sus filtros, el resumen del catálogo, la ficha de consulta y, para
 * el administrador, la creación, la edición y la baja.
 *
 * Los datos salen de useColeccion, así que la pantalla se actualiza
 * sola cuando algo escribe en "recetas", incluso desde otra pestaña.
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth.js";
import Modal from "../../components/Modal.jsx";
import { useColeccion } from "../../hooks/useColeccion.js";
import { aviso, confirmar, error as mostrarError } from "../../services/dialogos.js";
import { ROL_ADMIN } from "../../services/authService.js";
import FichaReceta from "./FichaReceta.jsx";
import FormularioReceta from "./FormularioReceta.jsx";
import TarjetaReceta from "./TarjetaReceta.jsx";
import { reglaBusqueda } from "./reglasReceta.js";
import sembrarRecetas from "./semillaRecetas.js";
import {
  CATEGORIAS,
  COLECCION,
  LIMITES,
  categoriaSeVende,
  costoPorPorcion,
  enteros,
  eliminarReceta,
  filtrarRecetas,
  margenPorPorcion,
  moneda,
  ventasDeReceta
} from "./recetasService.js";

const FILTROS_INICIALES = { texto: "", categoria: "todas", estado: "todos", orden: "nombre" };

function Recetas() {
  const { sesion } = useAuth();
  const esAdmin = sesion.rol === ROL_ADMIN;
  const { registros: recetas, problema } = useColeccion(COLECCION);

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [enFicha, setEnFicha] = useState(null);
  const [enFormulario, setEnFormulario] = useState(null); // { receta } o { receta: null }
  const [eliminando, setEliminando] = useState("");

  // Las recetas de ejemplo se siembran una sola vez, al abrir el módulo.
  useEffect(() => {
    sembrarRecetas();
  }, []);

  // El texto con error no cambia el listado: se conserva el último válido.
  const [textoAplicado, setTextoAplicado] = useState("");

  const visibles = useMemo(
    () => filtrarRecetas(recetas, { ...filtros, texto: textoAplicado }),
    [recetas, filtros, textoAplicado]
  );

  const indicadores = useMemo(() => calcularIndicadores(recetas, esAdmin), [recetas, esAdmin]);

  function cambiarBusqueda(valor) {
    setFiltros(previos => ({ ...previos, texto: valor }));
    const mensaje = reglaBusqueda(valor);
    setErrorBusqueda(mensaje);
    if (!mensaje) setTextoAplicado(valor);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    setTextoAplicado("");
    setErrorBusqueda("");
  }

  /** La ficha se vuelve a leer del catálogo, por si cambió mientras estaba abierta. */
  const recetaEnFicha = enFicha ? recetas.find(receta => String(receta.id) === String(enFicha)) : null;

  function abrirFicha(receta) {
    setEnFicha(receta.id);
  }

  function abrirFormulario(receta = null) {
    if (!esAdmin) return;
    setEnFicha(null);
    setEnFormulario({ receta });
  }

  /**
   * Las ventas guardan una copia del nombre y del precio, así que una
   * receta eliminada sigue siendo identificable en su historial. Se
   * avisa de cuántas hay antes de confirmar.
   */
  async function borrar(receta) {
    if (!esAdmin || eliminando) return;
    setEliminando(receta.id);
    try {
      const ventas = ventasDeReceta(receta.id);
      const textoVentas = ventas > 0
        ? `Tiene ${enteros.format(ventas)} ventas registradas; seguirán en los reportes con su nombre. `
        : "";
      const confirmado = await confirmar({
        titulo: `¿Eliminar «${receta.nombre}»?`,
        texto: `${textoVentas}Los reportes dejarán de tomar en cuenta su consumo estándar. `
          + "Esta acción no se puede deshacer.",
        boton: "Sí, eliminar",
        peligro: true
      });
      if (!confirmado) return;

      eliminarReceta(receta.id);
      aviso(`Receta eliminada: ${receta.nombre}`);
    } catch (fallo) {
      await mostrarError("No se pudo eliminar la receta", fallo.message);
    } finally {
      setEliminando("");
    }
  }

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 fw-bold mb-2">Recetas y fichas técnicas</h1>
          <p className="text-body-secondary mb-0">
            {esAdmin
              ? "Cantidad estándar de cada ingrediente por receta. Es la base para calcular consumo, costo y merma."
              : "Consulta los ingredientes, las cantidades y los pasos de cada receta del menú."}
          </p>
        </div>
      </div>

      {problema && (
        <p className="alert alert-warning" role="status">{problema}</p>
      )}

      <section className="mb-4" aria-labelledby="titulo-indicadores">
        <h2 className="h5 fw-semibold mb-3" id="titulo-indicadores">Resumen del catálogo</h2>
        <div className="row g-3">
          {indicadores.map(indicador => (
            <div className="col-12 col-md-6 col-xl-3" key={indicador.titulo}>
              <article className="app-panel h-100 p-3 p-md-4">
                <h3 className="h6 text-body-secondary mb-3">{indicador.titulo}</h3>
                <p className="recetas-indicador-valor fw-bold mb-2">{indicador.valor}</p>
                <p className="small text-body-secondary mb-0">{indicador.detalle}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section className="app-panel p-3 p-md-4 mb-4" aria-labelledby="titulo-filtros">
        <h2 className="h6 fw-semibold mb-3" id="titulo-filtros">Buscar en el catálogo</h2>
        <form onSubmit={evento => evento.preventDefault()} noValidate>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-xl-4">
              <label className="form-label" htmlFor="filtro-texto">Nombre o ingrediente</label>
              <input className={`form-control${errorBusqueda ? " is-invalid" : ""}`} type="search"
                id="filtro-texto" placeholder="Por ejemplo: pastor" maxLength={LIMITES.busquedaMax}
                autoComplete="off" value={filtros.texto}
                aria-describedby={errorBusqueda ? "error-filtro-texto" : undefined}
                onChange={evento => cambiarBusqueda(evento.target.value)} />
              {errorBusqueda && (
                <div className="invalid-feedback d-block" id="error-filtro-texto">{errorBusqueda}</div>
              )}
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <label className="form-label" htmlFor="filtro-categoria">Categoría</label>
              <select className="form-select" id="filtro-categoria" value={filtros.categoria}
                onChange={evento => setFiltros({ ...filtros, categoria: evento.target.value })}>
                <option value="todas">Todas</option>
                {CATEGORIAS.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <label className="form-label" htmlFor="filtro-estado">Estado</label>
              <select className="form-select" id="filtro-estado" value={filtros.estado}
                onChange={evento => setFiltros({ ...filtros, estado: evento.target.value })}>
                <option value="todos">Todos</option>
                <option value="activa">Activas</option>
                <option value="inactiva">Inactivas</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <label className="form-label" htmlFor="filtro-orden">Ordenar por</label>
              <select className="form-select" id="filtro-orden" value={filtros.orden}
                onChange={evento => setFiltros({ ...filtros, orden: evento.target.value })}>
                <option value="nombre">Nombre (A-Z)</option>
                <option value="categoria">Categoría</option>
                {esAdmin && <option value="costo">Costo por porción</option>}
                {esAdmin && <option value="margen">Margen</option>}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-xl-2 d-grid">
              <button className="btn btn-app-secondary" type="button" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </form>

        <p className="small text-body-secondary mt-3 mb-0" role="status" aria-live="polite" aria-atomic="true">
          {recetas.length === 0
            ? "El catálogo está vacío."
            : `Mostrando ${enteros.format(visibles.length)} de ${enteros.format(recetas.length)} recetas.`}
        </p>
      </section>

      <section aria-labelledby="titulo-listado">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <h2 className="h5 fw-semibold mb-0" id="titulo-listado">Catálogo de recetas</h2>
          {esAdmin && (
            <button className="btn btn-app-primary" type="button" onClick={() => abrirFormulario()}>
              Nueva receta
            </button>
          )}
        </div>

        <div className="row g-3">
          {visibles.map(receta => (
            <TarjetaReceta key={receta.id} receta={receta} esAdmin={esAdmin}
              alVer={abrirFicha} alEditar={abrirFormulario} alEliminar={borrar}
              ocupado={String(eliminando) === String(receta.id)} />
          ))}
        </div>

        {visibles.length === 0 && (
          <div className="receta-vacio p-4 text-center">
            <p className="fw-semibold mb-1">
              {recetas.length === 0
                ? "Todavía no hay recetas registradas"
                : "Ninguna receta coincide con la búsqueda"}
            </p>
            <p className="small text-body-secondary mb-0">
              {recetas.length === 0
                ? (esAdmin
                  ? "Agrega la primera receta para empezar a calcular costos y consumo estándar."
                  : "Cuando el administrador registre las recetas, las verás aquí.")
                : "Cambia el texto, la categoría o el estado para ver más resultados."}
            </p>
          </div>
        )}
      </section>

      <Modal
        abierto={Boolean(recetaEnFicha)}
        titulo={recetaEnFicha?.nombre ?? "Ficha de la receta"}
        idTitulo="titulo-modal-detalle"
        alCerrar={() => setEnFicha(null)}
        pie={
          <>
            <button className="btn btn-app-secondary" type="button" onClick={() => setEnFicha(null)}>
              Cerrar
            </button>
            {esAdmin && (
              <button className="btn btn-app-primary" type="button"
                onClick={() => abrirFormulario(recetaEnFicha)}>
                Editar receta
              </button>
            )}
          </>
        }
      >
        {recetaEnFicha && <FichaReceta receta={recetaEnFicha} esAdmin={esAdmin} />}
      </Modal>

      {enFormulario && (
        <FormularioReceta
          receta={enFormulario.receta}
          autor={sesion.nombre}
          alCerrar={() => setEnFormulario(null)}
        />
      )}
    </>
  );
}

/**
 * Las cuatro tarjetas del resumen. El administrador ve costo y margen
 * promedio; el empleado, cuántos insumos distintos usa el catálogo y el
 * tiempo medio de preparación.
 */
function calcularIndicadores(recetas, esAdmin) {
  const activas = recetas.filter(receta => receta.estado === "activa");

  const comunes = [
    {
      titulo: "Recetas registradas",
      valor: enteros.format(recetas.length),
      detalle: "Incluye activas e inactivas."
    },
    {
      titulo: "Activas en el menú",
      valor: enteros.format(activas.length),
      detalle: recetas.length === 0
        ? "Sin recetas en el catálogo."
        : `${enteros.format(recetas.length - activas.length)} fuera del menú.`
    }
  ];

  if (!esAdmin) {
    const insumosUsados = new Set();
    recetas.forEach(receta => (receta.ingredientes ?? []).forEach(linea => insumosUsados.add(linea.insumoId)));
    const tiempoPromedio = recetas.length
      ? recetas.reduce((suma, receta) => suma + (Number(receta.tiempoMinutos) || 0), 0) / recetas.length
      : null;

    return [
      ...comunes,
      {
        titulo: "Ingredientes distintos",
        valor: enteros.format(insumosUsados.size),
        detalle: "Insumos que usa el catálogo completo."
      },
      {
        titulo: "Tiempo promedio",
        valor: tiempoPromedio === null ? "Sin datos" : `${enteros.format(tiempoPromedio)} min`,
        detalle: "Minutos de preparación por receta."
      }
    ];
  }

  const vendibles = activas.filter(receta => categoriaSeVende(receta.categoria));
  const costoPromedio = vendibles.length
    ? vendibles.reduce((suma, receta) => suma + costoPorPorcion(receta), 0) / vendibles.length
    : null;
  const conMargen = vendibles.filter(receta => margenPorPorcion(receta) !== null);
  const margenPromedio = conMargen.length
    ? conMargen.reduce((suma, receta) => suma + margenPorPorcion(receta), 0) / conMargen.length
    : null;

  return [
    ...comunes,
    {
      titulo: "Costo promedio por porción",
      valor: costoPromedio === null ? "Sin datos" : moneda.format(costoPromedio),
      detalle: costoPromedio === null
        ? "Registra recetas activas para calcularlo."
        : `Promedio de ${enteros.format(vendibles.length)} recetas activas a la venta.`
    },
    {
      titulo: "Margen promedio",
      valor: margenPromedio === null ? "Sin datos" : moneda.format(margenPromedio),
      detalle: margenPromedio === null
        ? "Falta registrar precios de venta."
        : "Diferencia promedio entre precio y costo por porción."
    }
  ];
}

export default Recetas;
