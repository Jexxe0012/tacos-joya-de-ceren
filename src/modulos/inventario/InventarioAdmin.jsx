/**
 * InventarioAdmin — la vista de gestión del inventario.
 *
 * Resumen, alertas de existencias, tabla con buscador y filtros, e
 * historial de movimientos. Todo sale de las colecciones "inventario" y
 * "movimientos" con useColeccion, así que cualquier escritura (incluida
 * una merma registrada desde otra pantalla) se ve aquí al momento.
 */

import { useMemo, useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import { aviso, confirmar, error as mostrarError } from "../../services/dialogos.js";
import FormularioMovimiento from "./FormularioMovimiento.jsx";
import FormularioProducto from "./FormularioProducto.jsx";
import HistorialMovimientos from "./HistorialMovimientos.jsx";
import {
  CATEGORIAS,
  COLECCION,
  ETIQUETAS_ESTADO,
  diasParaVencer,
  eliminarProducto,
  estadoCaducidad,
  estadoStock,
  filtrarProductos,
  formatoCantidad,
  formatoDinero,
  formatoFechaCorta,
  productosConAlerta,
  textoAlerta,
  valorProducto
} from "./inventarioService.js";

const FILTROS_INICIALES = { texto: "", categoria: "todas", estado: "todos", orden: "alerta" };

function InventarioAdmin({ usuario }) {
  const { registros: productos, problema } = useColeccion(COLECCION);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [enProducto, setEnProducto] = useState(null);   // { producto } o { producto: null }
  const [enMovimiento, setEnMovimiento] = useState(null); // { productoId, tipo }

  const visibles = useMemo(() => filtrarProductos(productos, filtros), [productos, filtros]);
  const alertas = useMemo(() => productosConAlerta(productos), [productos]);

  const valorTotal = productos.reduce((suma, producto) => suma + valorProducto(producto), 0);
  const criticos = productos.filter(producto => ["agotado", "critico"].includes(estadoStock(producto)));
  const porVencer = productos.filter(producto => estadoCaducidad(producto) !== null);
  const categoriasUsadas = new Set(productos.map(producto => producto.categoria)).size;

  /**
   * Borra el producto y sus movimientos. Devuelve true si se eliminó,
   * para que el formulario de edición sepa si debe cerrarse.
   */
  async function borrar(producto) {
    const confirmado = await confirmar({
      titulo: `¿Eliminar "${producto.nombre}"?`,
      texto: `Tiene ${formatoCantidad(producto.cantidad)} ${producto.unidad} en existencia. `
        + "También se borran sus movimientos del historial. Esta acción no se puede deshacer.",
      boton: "Sí, eliminar",
      peligro: true
    });
    if (!confirmado) return false;

    try {
      eliminarProducto(producto.id);
    } catch (fallo) {
      await mostrarError("No se pudo eliminar el producto", fallo.message);
      return false;
    }
    setEnProducto(null);
    aviso(`Producto eliminado: ${producto.nombre}`);
    return true;
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
  }

  return (
    <section>
      <div className="inv-header">
        <div>
          <h1>Inventario</h1>
          <p className="subtitle">
            Controla las existencias de la taquería: qué hay, qué falta y qué está por vencer.
          </p>
        </div>
        <div className="inv-header-acciones">
          <button type="button" className="btn btn-app-secondary"
            onClick={() => setEnMovimiento({ productoId: "", tipo: "entrada" })}>
            Registrar movimiento
          </button>
          <button type="button" className="btn btn-app-primary" onClick={() => setEnProducto({ producto: null })}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">PRODUCTOS REGISTRADOS</div>
          <div className="stat-value">{productos.length}</div>
          <div className="stat-sub">
            en {categoriasUsadas} {categoriasUsadas === 1 ? "categoría" : "categorías"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">VALOR DEL INVENTARIO</div>
          <div className="stat-value">{formatoDinero(valorTotal)}</div>
          <div className="stat-sub">costo de lo que hay en bodega</div>
        </div>
        <div className="stat-card stat-card-alerta">
          <div className="stat-label">REQUIEREN COMPRA</div>
          <div className="stat-value">{criticos.length}</div>
          <div className="stat-sub">bajo el mínimo o agotados</div>
        </div>
        <div className="stat-card stat-card-aviso">
          <div className="stat-label">CADUCIDAD PRÓXIMA</div>
          <div className="stat-value">{porVencer.length}</div>
          <div className="stat-sub">vencen en 7 días o menos</div>
        </div>
      </div>

      <section className="inv-panel">
        <div className="inv-panel-header">
          <h2 className="section-title">Alertas de existencias</h2>
          <span className="inv-contador">
            {alertas.length === 0
              ? "todo en orden"
              : `${alertas.length} ${alertas.length === 1 ? "producto" : "productos"}`}
          </span>
        </div>
        <div className="alertas-lista">
          {alertas.length === 0 && (
            <p className="inv-vacio">
              No hay alertas: todos los productos están por encima de su mínimo y ninguno está por vencer.
            </p>
          )}
          {alertas.map(producto => {
            const stock = estadoStock(producto);
            const caducidad = estadoCaducidad(producto);
            const nivel = (stock === "agotado" || stock === "critico" || caducidad === "vencido")
              ? "urgente" : "aviso";
            return (
              <article className={`alerta-card ${nivel}`} key={producto.id}>
                <div className="alerta-info">
                  <p className="alerta-nombre">{producto.nombre}</p>
                  <p className="alerta-motivo">{textoAlerta(producto)}</p>
                </div>
                <div className="alerta-acciones">
                  <button type="button" className="btn-mini btn-mini-entrada"
                    onClick={() => setEnMovimiento({ productoId: producto.id, tipo: "entrada" })}>
                    Reabastecer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="inv-panel">
        <div className="inv-panel-header">
          <h2 className="section-title">Productos en inventario</h2>
          <span className="inv-contador">
            {visibles.length === productos.length
              ? `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`
              : `${visibles.length} de ${productos.length}`}
          </span>
        </div>

        <div className="inv-toolbar">
          <div className="inv-buscador">
            <label className="visually-hidden" htmlFor="inv-buscar">Buscar producto</label>
            <input type="search" id="inv-buscar" autoComplete="off"
              placeholder="Buscar por producto, proveedor o ubicación…"
              value={filtros.texto}
              onChange={evento => setFiltros({ ...filtros, texto: evento.target.value })} />
          </div>
          <div className="inv-filtro">
            <label className="visually-hidden" htmlFor="inv-estado">Filtrar por estado</label>
            <select id="inv-estado" value={filtros.estado}
              onChange={evento => setFiltros({ ...filtros, estado: evento.target.value })}>
              <option value="todos">Todos los estados</option>
              <option value="agotado">Agotados</option>
              <option value="critico">Bajo el mínimo</option>
              <option value="bajo">Por reponer pronto</option>
              <option value="ok">Con existencia suficiente</option>
              <option value="caducidad">Vencidos o por vencer</option>
            </select>
          </div>
          <div className="inv-filtro">
            <label className="visually-hidden" htmlFor="inv-orden">Ordenar</label>
            <select id="inv-orden" value={filtros.orden}
              onChange={evento => setFiltros({ ...filtros, orden: evento.target.value })}>
              <option value="alerta">Ordenar: urgencia</option>
              <option value="nombre">Ordenar: nombre</option>
              <option value="categoria">Ordenar: categoría</option>
              <option value="valor">Ordenar: mayor valor</option>
              <option value="caducidad">Ordenar: caducidad</option>
            </select>
          </div>
          <button type="button" className="inv-limpiar" onClick={limpiarFiltros}>Limpiar</button>
        </div>

        <div className="inv-chips" role="group" aria-label="Filtrar por categoría">
          {[{ valor: "todas", nombre: "Todas" }, ...CATEGORIAS.map(c => ({ valor: c, nombre: c }))].map(opcion => {
            const cuantos = opcion.valor === "todas"
              ? productos.length
              : productos.filter(producto => producto.categoria === opcion.valor).length;
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

        <div className="inv-tabla-scroll">
          <table className="inv-tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col" className="col-num">Existencia</th>
                <th scope="col" className="col-num">Mínimo</th>
                <th scope="col">Estado</th>
                <th scope="col" className="col-num">Costo unit.</th>
                <th scope="col" className="col-num">Valor</th>
                <th scope="col">Caducidad</th>
                <th scope="col" className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={9} className="inv-vacio">
                    {productos.length === 0
                      ? 'Todavía no hay productos. Agrega el primero con "+ Nuevo producto".'
                      : "Ningún producto coincide con la búsqueda o los filtros aplicados."}
                  </td>
                </tr>
              )}
              {visibles.map(producto => (
                <FilaProducto key={producto.id} producto={producto}
                  alEntrada={() => setEnMovimiento({ productoId: producto.id, tipo: "entrada" })}
                  alSalida={() => setEnMovimiento({ productoId: producto.id, tipo: "salida" })}
                  alEditar={() => setEnProducto({ producto })}
                  alEliminar={() => borrar(producto)} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <HistorialMovimientos productos={productos} />

      {enProducto && (
        <FormularioProducto producto={enProducto.producto} usuario={usuario}
          alCerrar={() => setEnProducto(null)} alEliminar={borrar} />
      )}

      {enMovimiento && (
        <FormularioMovimiento productos={productos} productoId={enMovimiento.productoId}
          tipo={enMovimiento.tipo} usuario={usuario} alCerrar={() => setEnMovimiento(null)} />
      )}
    </section>
  );
}

function FilaProducto({ producto, alEntrada, alSalida, alEditar, alEliminar }) {
  const stock = estadoStock(producto);
  const caducidad = estadoCaducidad(producto);
  const dias = diasParaVencer(producto);
  const detalle = [producto.proveedor, producto.ubicacion].filter(Boolean).join(" · ");

  return (
    <tr className={`fila-${stock}`}>
      <td>
        <div className="celda-nombre">{producto.nombre}</div>
        {detalle && <div className="celda-sub">{detalle}</div>}
      </td>
      <td>{producto.categoria}</td>
      <td className="col-num celda-cantidad">{formatoCantidad(producto.cantidad)} {producto.unidad}</td>
      <td className="col-num celda-suave">{formatoCantidad(producto.stockMinimo)}</td>
      <td>
        <span className={`inv-badge inv-badge-${stock}`}>{ETIQUETAS_ESTADO[stock]}</span>
      </td>
      <td className="col-num celda-suave">{formatoDinero(producto.costoUnitario)}</td>
      <td className="col-num">{formatoDinero(valorProducto(producto))}</td>
      <td className={producto.caducidad ? undefined : "celda-suave"}>
        {producto.caducidad
          ? (
            <span className={caducidad ? `inv-caducidad inv-caducidad-${caducidad}` : "inv-caducidad"}
              title={dias < 0 ? `Venció hace ${Math.abs(dias)} días` : `Faltan ${dias} días`}>
              {formatoFechaCorta(producto.caducidad)}
            </span>
          )
          : "—"}
      </td>
      <td className="col-acciones">
        <div className="celda-acciones">
          <button type="button" className="btn-mini btn-mini-entrada" title="Registrar entrada"
            aria-label="Registrar entrada" onClick={alEntrada}>+</button>
          <button type="button" className="btn-mini btn-mini-salida" title="Registrar salida"
            aria-label="Registrar salida" onClick={alSalida}>−</button>
          <button type="button" className="btn-mini btn-mini-editar" title="Editar producto"
            aria-label="Editar producto" onClick={alEditar}>Editar</button>
          <button type="button" className="btn-mini btn-mini-eliminar" title="Eliminar producto"
            aria-label="Eliminar producto" onClick={alEliminar}>Eliminar</button>
        </div>
      </td>
    </tr>
  );
}

export default InventarioAdmin;
