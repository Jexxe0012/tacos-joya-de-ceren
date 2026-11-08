/**
 * Mermas — registro de desperdicio y descuento de existencias.
 *
 * La pantalla conserva su forma: tres indicadores de la semana, el
 * formulario de registro y el historial reciente, que comparte colección
 * con la merma rápida de Turnos.
 *
 * El guardado pasa por registrarMerma, la operación compartida: una sola
 * regla y un solo lote para inventario, movimiento y merma.
 */

import { useMemo } from "react";
import { useAuth } from "../../auth/useAuth.js";
import { useColeccion } from "../../hooks/useColeccion.js";
import { useFormulario } from "../../hooks/useFormulario.js";
import { confirmar, error as mostrarError, exito } from "../../services/dialogos.js";
import { COLECCION as COLECCION_INVENTARIO } from "../inventario/inventarioService.js";
import { reglasMerma } from "./reglasMerma.js";
import {
  COLECCION,
  MOTIVOS,
  indicadoresDeLaSemana,
  moneda,
  numeroLegible,
  textoCantidad,
  registrarMerma,
  unDecimal
} from "./mermasService.js";

function Mermas() {
  const { sesion } = useAuth();
  const { registros: productos } = useColeccion(COLECCION_INVENTARIO);
  const { registros: mermas, problema } = useColeccion(COLECCION);

  const buscarProducto = useMemo(
    () => id => productos.find(producto => String(producto.id) === String(id)),
    [productos]
  );
  const reglas = useMemo(() => reglasMerma(buscarProducto), [buscarProducto]);

  // El responsable se propone con el nombre de quien tiene la sesión
  // abierta, pero queda editable por si registra la merma de un compañero.
  const form = useFormulario(
    { productoId: "", cantidad: "", motivo: "", responsable: sesion.nombre ?? "", observaciones: "" },
    reglas
  );

  const indicadores = useMemo(
    () => indicadoresDeLaSemana(mermas, productos),
    [mermas, productos]
  );

  const historial = useMemo(
    () => [...mermas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    [mermas]
  );

  const ordenados = useMemo(() => [...productos].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  ), [productos]);

  const alEnviar = form.enviar(async valores => {
    const producto = buscarProducto(valores.productoId);
    const cantidad = Number(valores.cantidad);

    // La merma modifica el inventario, así que se pide confirmación.
    const confirmado = await confirmar({
      titulo: "¿Registrar la merma?",
      texto: `Se descontarán ${numeroLegible.format(cantidad)} ${producto.unidad} de ${producto.nombre} `
        + "del inventario. ¿Registrar la merma?",
      boton: "Sí, registrar"
    });
    if (!confirmado) return;

    try {
      // registrarMerma vuelve a comprobar la existencia: pudo cambiar
      // mientras el diálogo estaba abierto.
      registrarMerma({
        productoId: valores.productoId,
        cantidad,
        motivo: valores.motivo,
        responsable: valores.responsable,
        observaciones: valores.observaciones,
        usuario: sesion.nombre,
        reportadoPor: sesion.id
      });
    } catch (fallo) {
      // El lote ya devolvió inventario, movimientos y mermas a su estado.
      form.marcarError("cantidad", fallo.message);
      await mostrarError("No se pudo registrar", fallo.message);
      return;
    }

    form.reiniciar({
      productoId: "",
      cantidad: "",
      motivo: "",
      responsable: sesion.nombre ?? "",
      observaciones: ""
    });
    exito(
      "Merma registrada",
      `Se descontaron ${numeroLegible.format(cantidad)} ${producto.unidad} de ${producto.nombre}.`
    );
  });

  const error = nombre => (form.errores[nombre]
    ? <div className="invalid-feedback d-block">{form.errores[nombre]}</div>
    : null);

  const clase = (base, nombre) => `${base}${form.errores[nombre] ? " is-invalid" : ""}`;

  return (
    <>
      <div className="container-fluid">
        <h2 className="text-left pt-4">Mermas</h2>
        <p>Indicadores de ventas, consumo, mermas y cobertura.</p>
      </div>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="container-fluid indicadores">
        <div className="row indicadores-row row-cols-1 row-cols-md-2 row-cols-lg-4">
          <div className="col mb-3">
            <div className="card p-3 shadow-sm border-0">
              <span className="texto text-uppercase text-secondary fw-bold" style={{ fontSize: "0.8rem" }}>
                MERMA SEMANAL
              </span>
              <span className="fs-2 fw-bold text-danger">{unDecimal.format(indicadores.total)} kg</span>
              <span className="text-muted small">
                {indicadores.critico
                  ? `${indicadores.porcentaje}% del total corresponde a ${indicadores.critico.nombre}.`
                  : "Sin registros esta semana."}
              </span>
            </div>
          </div>

          <div className="col mb-3">
            <div className="card p-3 shadow-sm border-0">
              <span className="texto text-uppercase text-secondary fw-bold" style={{ fontSize: "0.8rem" }}>
                COSTO ESTIMADO
              </span>
              <span className="fs-2 fw-bold">{moneda.format(indicadores.costo)}</span>
              <span className="text-muted small">según precios de referencia</span>
            </div>
          </div>

          <div className="col mb-3">
            <div className="card p-3 shadow-sm border-0">
              <span className="texto text-uppercase text-secondary fw-bold" style={{ fontSize: "0.8rem" }}>
                INSUMO CRÍTICO
              </span>
              <span className="fs-2 fw-bold text-danger">
                {indicadores.critico ? indicadores.critico.nombre : "Ninguno"}
              </span>
              <span className="text-danger small">
                {indicadores.critico
                  ? `${unDecimal.format(indicadores.critico.cantidad)} kg en los últimos 7 días.`
                  : "Sin mermas en los últimos 7 días."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="py-2">
        <div className="container-fluid py-4">
          <div className="row align-items-center">
            <div className="col-12 col-lg-6">
              <div className="card p-4 mt-3">
                <h2 className="login-title mb-2">Registrar Mermas</h2>
                <div className="section-divider" />

                <form className="mt-3" onSubmit={alEnviar} noValidate>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="login-title mb-1 item-name" htmlFor="input-ingrediente">Ingrediente</label>
                      <select className={clase("form-select", "productoId")} id="input-ingrediente"
                        {...form.campo("productoId")}>
                        <option value="">— Seleccioná —</option>
                        {ordenados.map(producto => (
                          <option key={producto.id} value={producto.id}>
                            {producto.categoria} · {producto.nombre}
                          </option>
                        ))}
                      </select>
                      {error("productoId")}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="login-title mb-1 item-name" htmlFor="input-cantidad">Cantidad</label>
                      <input className={clase("form-control", "cantidad")} id="input-cantidad" type="number"
                        placeholder="0.0" min="0.1" step="0.1" {...form.campo("cantidad")} />
                      {error("cantidad")}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="login-title mb-1 item-name" htmlFor="input-motivo">Motivo</label>
                    <select className={clase("form-select", "motivo")} id="input-motivo" {...form.campo("motivo")}>
                      <option value="">— Seleccioná —</option>
                      {MOTIVOS.map(motivo => <option key={motivo} value={motivo}>{motivo}</option>)}
                    </select>
                    {error("motivo")}
                  </div>

                  <div className="mb-3">
                    <label className="login-title mb-1 item-name" htmlFor="input-responsable">Responsable</label>
                    <input className={clase("form-control login-title", "responsable")} id="input-responsable"
                      type="text" placeholder="Nombre del responsable" maxLength={60}
                      {...form.campo("responsable")} />
                    {error("responsable")}
                  </div>

                  <div>
                    <label className="login-title mb-1 item-name" htmlFor="input-observaciones">Observaciones</label>
                    <input className={clase("form-control login-title", "observaciones")} id="input-observaciones"
                      type="text" placeholder="Detalle (obligatorio si el motivo es Otro)" maxLength={200}
                      {...form.campo("observaciones")} />
                    {error("observaciones")}
                  </div>

                  <div className="d-grid mt-3">
                    <button type="submit" className="btn btn-merma btn-lg" disabled={form.enviando}>
                      Guardar merma y actualizar inventario
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card p-4 mt-3 historial-card">
                <h2 className="login-title mb-2">Historial reciente</h2>
                <div className="section-divider" />

                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Ingrediente</th>
                        <th scope="col">Cantidad</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.length === 0 && (
                        <tr>
                          <td className="text-muted" colSpan={4}>Todavía no hay mermas registradas.</td>
                        </tr>
                      )}
                      {historial.map(merma => (
                        <tr key={merma.id}>
                          <td>{merma.fecha}</td>
                          <td>{merma.producto}</td>
                          <td>{textoCantidad(merma)}</td>
                          <td>
                            <span className="badge bg-warning text-dark" title={merma.motivo || ""}>
                              Registrado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Mermas;
