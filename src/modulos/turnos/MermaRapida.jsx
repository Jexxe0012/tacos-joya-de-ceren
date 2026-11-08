/**
 * MermaRapida — la acción rápida de merma desde Mis turnos.
 *
 * El empleado reporta lo que se botó sin salir de su pantalla. Guarda
 * con registrarMerma, la misma operación compartida que usa el módulo
 * de Mermas: las mismas reglas, el mismo descuento de inventario, el
 * mismo movimiento y el mismo historial.
 */

import { useMemo, useRef } from "react";
import CapaModal from "../../components/CapaModal.jsx";
import { useFormulario } from "../../hooks/useFormulario.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import { fecha as reglaFecha, texto } from "../../utils/validaciones.js";
import { fechaHoyLocal } from "../../utils/fechas.js";
import { reglaCantidad } from "../mermas/reglasMerma.js";
import { numeroLegible, registrarMerma } from "../mermas/mermasService.js";

function MermaRapida({ productos, sesion, alCerrar }) {
  const buscarProducto = useMemo(
    () => id => productos.find(producto => String(producto.id) === String(id)),
    [productos]
  );

  const reglas = useMemo(() => ({
    productoId: valor => (valor ? "" : "Elige el producto."),
    cantidad: (valor, valores) => reglaCantidad(valor, buscarProducto(valores.productoId)),
    fecha: valor => reglaFecha(valor, { noFutura: true }),
    motivo: valor => texto(valor, { min: 3, max: 300 })
  }), [buscarProducto]);

  const form = useFormulario(
    { productoId: "", cantidad: "", fecha: fechaHoyLocal(), motivo: "" },
    reglas
  );
  const primerCampo = useRef(null);

  const elegido = buscarProducto(form.valores.productoId);

  const ordenados = useMemo(() => [...productos].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  ), [productos]);

  const alEnviar = form.enviar(async valores => {
    try {
      const { producto, cantidad } = registrarMerma({
        productoId: valores.productoId,
        cantidad: Number(valores.cantidad),
        // En esta pantalla el motivo se escribe libre; es también la
        // observación que queda en el movimiento de inventario.
        motivo: valores.motivo,
        observaciones: valores.motivo,
        responsable: sesion.nombre,
        usuario: sesion.nombre,
        reportadoPor: sesion.id,
        fecha: valores.fecha
      });

      alCerrar();
      aviso(`Merma registrada: ${numeroLegible.format(cantidad)} ${producto.unidad} de ${producto.nombre}`);
    } catch (fallo) {
      // El lote dejó inventario, movimientos y mermas como estaban.
      form.marcarError("cantidad", fallo.message);
      await mostrarError("No se pudo registrar", fallo.message);
    }
  });

  const error = nombre => (form.errores[nombre]
    ? <div className="invalid-feedback d-block">{form.errores[nombre]}</div>
    : null);
  const clase = nombre => (form.errores[nombre] ? "is-invalid" : undefined);

  return (
    <CapaModal
      idTitulo="modal-merma-title"
      titulo="Registrar merma"
      subtitulo="Reporta qué producto se botó y por qué."
      alCerrar={alCerrar}
      enfocarAlAbrir={primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="merma-producto">Producto</label>
        <select id="merma-producto" ref={primerCampo} className={clase("productoId")}
          {...form.campo("productoId")}>
          <option value="">
            {ordenados.length ? "— Selecciona —" : "No hay productos en el inventario"}
          </option>
          {ordenados.map(producto => (
            <option key={producto.id} value={producto.id}>
              {producto.categoria} · {producto.nombre}
            </option>
          ))}
        </select>
        {error("productoId")}

        <label htmlFor="merma-cantidad">
          Cantidad <span>{elegido ? `(en ${elegido.unidad})` : ""}</span>
        </label>
        <input type="number" id="merma-cantidad" className={clase("cantidad")}
          min="0.01" step="0.01" {...form.campo("cantidad")} />
        {error("cantidad")}

        <label htmlFor="merma-fecha">Fecha</label>
        <input type="date" id="merma-fecha" className={clase("fecha")}
          max={fechaHoyLocal()} {...form.campo("fecha")} />
        {error("fecha")}

        <label htmlFor="merma-motivo">Motivo</label>
        <textarea id="merma-motivo" className={clase("motivo")} maxLength={300}
          {...form.campo("motivo")} />
        {error("motivo")}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="btn-submit" disabled={form.enviando}>Registrar</button>
        </div>
      </form>
    </CapaModal>
  );
}

export default MermaRapida;
