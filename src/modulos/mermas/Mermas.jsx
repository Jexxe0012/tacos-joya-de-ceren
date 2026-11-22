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
        + "del inventario.",
      boton: "Registrar merma"
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
      await mostrarError("No se pudo registrar la merma", fallo.message);
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
      <h1 className="h3 fw-bold mb-4">Mermas</h1>

      {problema && <p className="alert alert-warning" role="status">{problema}</p>}

      <div className="indicadores mb-4">
        <div className="row g-3 app-metricas">
          <div className="col-12 col-md-4">
            <div className="app-panel h-100 p-3 p-md-4 d-flex flex-column">
              <span className="h6 text-body-secondary mb-2">
                MERMA SEMANAL
              </span>
              <span className="h4 fw-bold mb-1">{unDecimal.format(indicadores.total)} kg</span>
              <span className="text-body-secondary small">
                {indicadores.critico
                  ? `${indicadores.porcentaje}% del total corresponde a ${indicadores.critico.nombre}.`
                  : "Sin registros esta semana."}
              </span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="app-panel h-100 p-3 p-md-4 d-flex flex-column">
              <span className="h6 text-body-secondary mb-2">
                COSTO ESTIMADO
              </span>
              <span className="h4 fw-bold mb-1">{moneda.format(indicadores.costo)}</span>
              <span className="text-body-secondary small">Según el costo unitario en Inventario</span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="app-panel h-100 p-3 p-md-4 d-flex flex-column">
              <span className="h6 text-body-secondary mb-2">
                INSUMO CRÍTICO
              </span>
              <span className={"h4 fw-bold text-break mb-1" + (indicadores.critico ? " merma-critica" : "")}>
                {indicadores.critico ? indicadores.critico.nombre : "Ninguno"}
              </span>
              <span className="text-body-secondary small">
                {indicadores.critico
                  ? `${unDecimal.format(indicadores.critico.cantidad)} kg en los últimos 7 días.`
                  : "Sin mermas en los últimos 7 días."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="container-fluid">
          <div className="row g-3 align-items-start">
            <div className="col-12 col-xl-6">
              <div className="app-panel p-3 p-md-4">
                <h2 className="h5 fw-semibold mb-3">Registrar merma</h2>

                <form className="mt-3" onSubmit={alEnviar} noValidate>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="input-ingrediente">Ingrediente</label>
                      <select className={clase("form-select", "productoId")} id="input-ingrediente"
                        {...form.campo("productoId")}>
                        <option value="">Selecciona un ingrediente</option>
                        {ordenados.map(producto => (
                          <option key={producto.id} value={producto.id}>
                            {producto.categoria} · {producto.nombre}
                          </option>
                        ))}
                      </select>
                      {error("productoId")}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="input-cantidad">Cantidad</label>
                      <input className={clase("form-control", "cantidad")} id="input-cantidad" type="number"
                        placeholder="0.0" min="0.1" step="0.1" {...form.campo("cantidad")} />
                      {error("cantidad")}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="input-motivo">Motivo</label>
                    <select className={clase("form-select", "motivo")} id="input-motivo" {...form.campo("motivo")}>
                      <option value="">Selecciona un motivo</option>
                      {MOTIVOS.map(motivo => <option key={motivo} value={motivo}>{motivo}</option>)}
                    </select>
                    {error("motivo")}
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="input-responsable">Responsable</label>
                    <input className={clase("form-control", "responsable")} id="input-responsable"
                      type="text" placeholder="Nombre del responsable" maxLength={60}
                      {...form.campo("responsable")} />
                    {error("responsable")}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="input-observaciones">Observaciones</label>
                    <input className={clase("form-control", "observaciones")} id="input-observaciones"
                      type="text" placeholder="Detalle (obligatorio si el motivo es Otro)" maxLength={200}
                      {...form.campo("observaciones")} />
                    {error("observaciones")}
                  </div>

                  <div className="d-grid mt-3">
                    <button type="submit" className="btn btn-app-primary" disabled={form.enviando}>
                      Guardar merma y actualizar inventario
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-12 col-xl-6">
              <div className="app-panel p-3 p-md-4 historial-card">
                <h2 className="h5 fw-semibold mb-3">Historial reciente</h2>

                <div className="table-responsive">
                  <table className="table table-hover mb-0">
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
                            <span className="badge rounded-pill app-estado app-estado-ok" title={merma.motivo || ""}>
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
