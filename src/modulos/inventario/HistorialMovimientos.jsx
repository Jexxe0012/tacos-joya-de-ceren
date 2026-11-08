/**
 * HistorialMovimientos — el kardex sencillo del inventario.
 *
 * Muestra los últimos 25 movimientos: el historial completo crecería
 * demasiado en pantalla. Si el producto todavía existe se usa su nombre
 * y su unidad actuales; si se eliminó, los que guardó el movimiento.
 */

import { useMemo, useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import {
  COLECCION_MOVIMIENTOS,
  ETIQUETAS_MOVIMIENTO,
  SIGNOS_MOVIMIENTO,
  formatoCantidad,
  formatoFechaHora
} from "./inventarioService.js";

const MAXIMO = 25;

function HistorialMovimientos({ productos }) {
  const { registros } = useColeccion(COLECCION_MOVIMIENTOS);
  const [filtro, setFiltro] = useState("todos");

  const visibles = useMemo(() => registros
    .filter(movimiento => filtro === "todos" || movimiento.tipo === filtro)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, MAXIMO), [registros, filtro]);

  const buscarProducto = id => productos.find(producto => String(producto.id) === String(id));

  return (
    <section className="inv-panel">
      <div className="inv-panel-header">
        <h2 className="section-title">Historial de movimientos</h2>
        <div className="inv-filtro">
          <label className="visually-hidden" htmlFor="mov-filtro">Filtrar movimientos</label>
          <select id="mov-filtro" value={filtro} onChange={evento => setFiltro(evento.target.value)}>
            <option value="todos">Todos los movimientos</option>
            <option value="entrada">Solo entradas</option>
            <option value="salida">Solo salidas</option>
            <option value="ajuste">Solo ajustes</option>
          </select>
        </div>
      </div>

      <div className="mov-lista">
        {visibles.length === 0 && (
          <p className="inv-vacio">Todavía no hay movimientos registrados con ese filtro.</p>
        )}

        {visibles.map(movimiento => {
          const producto = buscarProducto(movimiento.productoId);
          const unidad = producto ? ` ${producto.unidad}` : (movimiento.unidad ? ` ${movimiento.unidad}` : "");
          return (
            <article className={`mov-fila mov-${movimiento.tipo}`} key={movimiento.id}>
              <span className={`mov-marca mov-marca-${movimiento.tipo}`}
                title={ETIQUETAS_MOVIMIENTO[movimiento.tipo]}>
                {SIGNOS_MOVIMIENTO[movimiento.tipo]}
              </span>

              <div className="mov-info">
                <p className="mov-titulo">{producto ? producto.nombre : movimiento.producto}</p>
                <p className="mov-detalle">
                  {ETIQUETAS_MOVIMIENTO[movimiento.tipo]} de {formatoCantidad(movimiento.cantidad)}{unidad}
                  {" · "}{movimiento.motivo}
                  {movimiento.nota ? ` · ${movimiento.nota}` : ""}
                </p>
              </div>

              <div className="mov-meta">
                <p className="mov-saldo">
                  {formatoCantidad(movimiento.existenciaAnterior)} → {formatoCantidad(movimiento.existenciaNueva)}
                </p>
                <p className="mov-fecha">{formatoFechaHora(movimiento.fecha)} · {movimiento.usuario}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default HistorialMovimientos;
