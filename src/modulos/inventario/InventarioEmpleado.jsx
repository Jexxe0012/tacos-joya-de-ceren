/**
 * InventarioEmpleado — consultar qué hay en bodega.
 *
 * El empleado no registra ni modifica nada: busca un producto y ve si
 * todavía queda. Los cuatro estados internos se reducen a tres y se
 * dicen en lenguaje simple.
 */

import { useMemo, useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import {
  CATEGORIAS,
  COLECCION,
  estadoStock,
  formatoCantidad
} from "./inventarioService.js";

/** Lo único que el empleado necesita saber: si hay, si queda poco o si se acabó. */
const ETIQUETAS_EMPLEADO = {
  ok: "Disponible",
  bajo: "Queda poco",
  critico: "Queda poco",
  agotado: "Agotado"
};

const RESUMEN = [
  { id: "todos", nombre: "Todo" },
  { id: "ok", nombre: "Disponible" },
  { id: "poco", nombre: "Queda poco" },
  { id: "agotado", nombre: "Agotado" }
];

/** Agrupa el estado real en las tres categorías que ve el empleado. */
function estadoEmpleado(producto) {
  const estado = estadoStock(producto);
  if (estado === "agotado") return "agotado";
  if (estado === "ok") return "ok";
  return "poco";
}

function InventarioEmpleado() {
  const { registros: productos, problema } = useColeccion(COLECCION);
  const [filtros, setFiltros] = useState({ texto: "", categoria: "todas", estado: "todos" });

  const visibles = useMemo(() => {
    const buscado = filtros.texto.trim().toLowerCase();
    return productos.filter(producto => {
      if (filtros.categoria !== "todas" && producto.categoria !== filtros.categoria) return false;
      if (filtros.estado !== "todos" && estadoEmpleado(producto) !== filtros.estado) return false;
      if (buscado) {
        const campos = [producto.nombre, producto.categoria, producto.ubicacion]
          .filter(Boolean).join(" ").toLowerCase();
        if (!campos.includes(buscado)) return false;
      }
      return true;
    });
  }, [productos, filtros]);

  return (
    <section>
      <div className="emp-header">
        <h1>¿Qué hay en bodega?</h1>
        <p className="subtitle">
          Busca un producto y mira si todavía queda. El administrador es quien registra las entradas y salidas.
        </p>
      </div>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="emp-buscador">
        <label className="visually-hidden" htmlFor="emp-buscar">Buscar producto</label>
        <input type="search" id="emp-buscar" autoComplete="off"
          placeholder="Buscar un producto… por ejemplo: tomate"
          value={filtros.texto}
          onChange={evento => setFiltros({ ...filtros, texto: evento.target.value })} />
      </div>

      <div className="emp-resumen" role="group" aria-label="Filtrar por disponibilidad">
        {RESUMEN.map(opcion => {
          const cuantos = opcion.id === "todos"
            ? productos.length
            : productos.filter(producto => estadoEmpleado(producto) === opcion.id).length;
          const activo = filtros.estado === opcion.id;
          return (
            <button type="button" key={opcion.id}
              className={`emp-resumen-card emp-resumen-${opcion.id}${activo ? " activo" : ""}`}
              aria-pressed={activo ? "true" : "false"}
              // Tocar el filtro activo lo apaga y vuelve a mostrar todo.
              onClick={() => setFiltros({ ...filtros, estado: activo ? "todos" : opcion.id })}>
              <span className="emp-resumen-num">{cuantos}</span>
              <span className="emp-resumen-nombre">{opcion.nombre}</span>
            </button>
          );
        })}
      </div>

      <div className="inv-chips emp-chips" role="group" aria-label="Filtrar por sección">
        {[{ valor: "todas", nombre: "Todas las secciones" }, ...CATEGORIAS.map(c => ({ valor: c, nombre: c }))]
          .map(opcion => {
            const cuantos = opcion.valor === "todas"
              ? productos.length
              : productos.filter(producto => producto.categoria === opcion.valor).length;
            // Una sección sin productos no le sirve de nada al empleado.
            if (cuantos === 0 && opcion.valor !== filtros.categoria) return null;
            const activo = filtros.categoria === opcion.valor;
            return (
              <button type="button" key={opcion.valor}
                className={activo ? "inv-chip activo" : "inv-chip"}
                aria-pressed={activo ? "true" : "false"}
                onClick={() => setFiltros({ ...filtros, categoria: opcion.valor })}>
                <span>{opcion.nombre}</span>
                <span className="inv-chip-num">{cuantos}</span>
              </button>
            );
          })}
      </div>

      <p className="emp-contador" aria-live="polite">
        {visibles.length === 0
          ? "Sin resultados"
          : `${visibles.length} ${visibles.length === 1 ? "producto" : "productos"}`}
      </p>

      <div className="emp-secciones">
        {visibles.length === 0 && (
          <p className="emp-vacio">
            {filtros.texto
              ? `No encontramos "${filtros.texto.trim()}" en el inventario. `
                + "Prueba con otro nombre o pregúntale al administrador."
              : "No hay productos que coincidan con lo que elegiste."}
          </p>
        )}

        {/* Se recorre el catálogo para que las secciones salgan siempre en el mismo orden. */}
        {CATEGORIAS.map(categoria => {
          const deLaSeccion = visibles
            .filter(producto => producto.categoria === categoria)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          if (deLaSeccion.length === 0) return null;

          return (
            <section className="emp-seccion" key={categoria}>
              <h2 className="emp-seccion-titulo">
                {categoria}
                <span className="emp-seccion-num">{deLaSeccion.length}</span>
              </h2>
              <div className="emp-grilla">
                {deLaSeccion.map(producto => {
                  const estado = estadoEmpleado(producto);
                  return (
                    <article className={`emp-card emp-card-${estado}`} key={producto.id}>
                      <p className="emp-card-nombre">{producto.nombre}</p>
                      {estado === "agotado"
                        ? <p className="emp-card-cantidad emp-card-sin">No hay</p>
                        : (
                          <p className="emp-card-cantidad">
                            {formatoCantidad(producto.cantidad)}
                            <span className="emp-card-unidad"> {producto.unidad}</span>
                          </p>
                        )}
                      <p className={`emp-card-estado emp-estado-${estado}`}>
                        {ETIQUETAS_EMPLEADO[estadoStock(producto)]}
                      </p>
                      {producto.ubicacion && <p className="emp-card-lugar">{producto.ubicacion}</p>}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default InventarioEmpleado;
