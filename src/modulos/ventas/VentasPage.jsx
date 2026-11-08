import { useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import { fechaHoyLocal, haceDias, fechaLegible } from "../../utils/fechas.js";
import { aviso, confirmar, error } from "../../services/dialogos.js";
import { useAuth } from "../../auth/useAuth.js";
import GraficaBarras from "../../components/GraficaBarras.jsx";
import { agruparPedidos, eliminarVentasDia, mediosPago, moneda, pedidoInicial, recetasVendibles, registrarPedido, validarPedido } from "./ventasService.js";

export default function VentasPage() {
  const { sesion } = useAuth();
  const { registros: recetas, problema: problemaRecetas } = useColeccion("recetas");
  const { registros: ventas, problema: problemaVentas } = useColeccion("ventas");
  const [pedido, setPedido] = useState(pedidoInicial);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const disponibles = recetasVendibles(recetas);
  const ventasDia = ventas.filter(item => item?.fecha === pedido.fecha);
  const pedidos = agruparPedidos(ventasDia);
  const ingresos = ventasDia.reduce((suma, item) => suma + (Number(item.total) || 0), 0);
  const unidades = ventasDia.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
  const total = pedido.lineas.reduce((suma, linea) => suma + Math.round(Number(linea.cantidad) * Number(linea.precioUnitario) * 100) / 100, 0);
  const cantidades = new Map();
  ventasDia.forEach(venta => cantidades.set(venta.recetaNombre || "Receta", (cantidades.get(venta.recetaNombre || "Receta") || 0) + Number(venta.cantidad || 0)));
  const masVendida = [...cantidades].sort((a, b) => b[1] - a[1])[0];

  function modificar(nuevo) {
    setPedido(nuevo);
    if (Object.keys(errores).length) setErrores(validarPedido(nuevo, recetas));
  }

  function cambiarLinea(id, nombre, valor) {
    modificar({ ...pedido, lineas: pedido.lineas.map(linea => {
      if (linea.id !== id) return linea;
      const nueva = { ...linea, [nombre]: valor };
      if (nombre === "recetaId") {
        const receta = disponibles.find(item => String(item.id) === valor);
        nueva.precioUnitario = receta ? Number(receta.precioVenta) : "";
      }
      return nueva;
    }) });
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    const validacion = validarPedido(pedido, recetas);
    setErrores(validacion);
    const primero = Object.keys(validacion)[0];
    if (primero) { evento.currentTarget.elements.namedItem(primero)?.focus(); return; }
    setGuardando(true);
    try {
      if (!await confirmar({ titulo: "¿Guardar esta venta?", texto: `Total: ${moneda(total)}`, boton: "Guardar venta" })) return;
      registrarPedido(pedido);
      setPedido({ ...pedidoInicial(), fecha: pedido.fecha });
      setErrores({});
      await aviso("Venta registrada");
    } catch (causa) {
      await error("No se pudo registrar la venta", causa.message);
    } finally {
      setGuardando(false);
    }
  }

  async function limpiar() {
    if (guardando || !ventasDia.length) return;
    setGuardando(true);
    try {
      if (!await confirmar({ titulo: "¿Eliminar las ventas de este día?", texto: `Se eliminarán ${ventasDia.length} líneas. Esta acción no se puede deshacer.`, boton: "Eliminar ventas", peligro: true })) return;
      eliminarVentasDia(pedido.fecha);
      await aviso("Ventas eliminadas");
    } catch (causa) { await error("No se pudieron eliminar las ventas", causa.message); }
    finally { setGuardando(false); }
  }

  return (
    <>
      <h1 className="h3 fw-bold mb-2">Ventas del día</h1>
      <p className="text-body-secondary mb-4">Registra pedidos y consulta las unidades e ingresos guardados.</p>
      {[problemaRecetas, problemaVentas].filter(Boolean).map(mensaje => <p className="alert alert-warning" key={mensaje}>{mensaje}</p>)}
      <div className="row g-3 mb-4">
        {[["Ingresos", moneda(ingresos)], ["Pedidos", pedidos.length], ["Unidades vendidas", unidades], ["Receta más vendida", masVendida?.[0] || "Sin ventas"]].map(([nombre, valor]) => (
          <div className="col-12 col-sm-6 col-xl-3" key={nombre}><article className="app-panel p-3 h-100">
            <h2 className="h6 text-body-secondary">{nombre}</h2><p className="h3 fw-bold mb-0">{valor}</p>
          </article></div>
        ))}
      </div>
      <section className="app-panel p-3 p-md-4 mb-4" aria-labelledby="titulo-nueva-venta">
        <h2 className="h5" id="titulo-nueva-venta">Registrar pedido</h2>
        {!disponibles.length && <p role="status">Crea o activa una receta con precio en Recetas para registrar ventas.</p>}
        <form noValidate onSubmit={guardar} id="formulario-venta">
          {errores.total && <p className="alert alert-danger" role="alert">{errores.total}</p>}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label htmlFor="fecha-venta" className="form-label">Fecha de venta</label>
              <input id="fecha-venta" name="fecha" type="date" min={haceDias(7)} max={fechaHoyLocal()}
                value={pedido.fecha} onChange={evento => modificar({ ...pedido, fecha: evento.target.value })}
                className={`form-control${errores.fecha ? " is-invalid" : ""}`}
                aria-invalid={!!errores.fecha} aria-describedby="error-fecha-venta" />
              <div className="invalid-feedback" id="error-fecha-venta">{errores.fecha}</div>
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="metodo-pago" className="form-label">Método de pago</label>
              <select id="metodo-pago" name="metodoPago" value={pedido.metodoPago}
                onChange={evento => modificar({ ...pedido, metodoPago: evento.target.value })}
                className={`form-select${errores.metodoPago ? " is-invalid" : ""}`}>
                {Object.entries(mediosPago).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
              <div className="invalid-feedback">{errores.metodoPago}</div>
            </div>
          </div>
          {pedido.lineas.map((linea, indice) => (
            <div className="row g-3 mb-3 align-items-start" key={linea.id}>
              <div className="col-12 col-md-5">
                <label htmlFor={`venta-receta-${linea.id}`} className="form-label">Receta</label>
                <select id={`venta-receta-${linea.id}`} name={`receta-${indice}`} value={linea.recetaId}
                  onChange={evento => cambiarLinea(linea.id, "recetaId", evento.target.value)}
                  className={`form-select${errores[`receta-${indice}`] ? " is-invalid" : ""}`}>
                  <option value="">Selecciona una receta</option>
                  {disponibles.map(receta => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}
                </select>
                <div className="invalid-feedback">{errores[`receta-${indice}`]}</div>
              </div>
              <div className="col-6 col-md-2">
                <label htmlFor={`venta-cantidad-${linea.id}`} className="form-label">Cantidad</label>
                <input id={`venta-cantidad-${linea.id}`} name={`cantidad-${indice}`} type="number" min="1" max="500" step="1"
                  value={linea.cantidad} onChange={evento => cambiarLinea(linea.id, "cantidad", evento.target.value)}
                  className={`form-control${errores[`cantidad-${indice}`] ? " is-invalid" : ""}`} />
                <div className="invalid-feedback">{errores[`cantidad-${indice}`]}</div>
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor={`venta-precio-${linea.id}`} className="form-label">Precio (USD)</label>
                <input id={`venta-precio-${linea.id}`} className="form-control" readOnly
                  value={linea.precioUnitario === "" ? "" : Number(linea.precioUnitario).toFixed(2)} />
              </div>
              <div className="col-12 col-md-2">
                <button className="btn btn-app-secondary mt-md-4" type="button" disabled={pedido.lineas.length === 1}
                  onClick={() => modificar({ ...pedido, lineas: pedido.lineas.filter(item => item.id !== linea.id) })}>
                  Quitar producto
                </button>
              </div>
            </div>
          ))}
          <div className="d-flex flex-wrap align-items-center gap-3">
            <button className="btn btn-app-secondary" type="button" onClick={() => modificar({
              ...pedido, lineas: [...pedido.lineas, ...pedidoInicial().lineas]
            })}>Agregar producto</button>
            <strong className="ms-auto" id="total-pedido">Total {moneda(Number.isFinite(total) ? total : 0)}</strong>
            <button className="btn btn-app-primary" disabled={guardando || !disponibles.length} aria-busy={guardando || undefined}>
              {guardando ? "Guardando…" : "Guardar venta"}
            </button>
          </div>
        </form>
      </section>
      <section className="app-panel p-3 p-md-4 mb-4">
        <h2 className="h5">Ventas por producto</h2>
        <GraficaBarras titulo="Unidades vendidas por producto en la fecha seleccionada" etiquetas={[...cantidades.keys()]} valores={[...cantidades.values()]} />
      </section>
      <section className="app-panel p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Pedidos del {fechaLegible(pedido.fecha, { day: "numeric", month: "long" })}</h2>
          {sesion.rol === "admin" && <button type="button" className="btn btn-app-secondary btn-sm" disabled={guardando || !ventasDia.length} onClick={limpiar}>Eliminar ventas del día</button>}
        </div>
        <div className="table-responsive">
          <table className="table"><thead><tr><th>Hora</th><th>Productos</th><th>Pago</th><th>Total</th></tr></thead>
            <tbody>{pedidos.length ? pedidos.map(item => <tr key={item.id}><th scope="row">{item.hora}</th>
              <td>{item.productos.join(", ")}</td><td>{item.metodoPago}</td><td>{moneda(item.total)}</td></tr>)
              : <tr><td colSpan={4}>Sin ventas en esta fecha.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
