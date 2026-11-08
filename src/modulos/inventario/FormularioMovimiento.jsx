/**
 * FormularioMovimiento — registrar una entrada, una salida o un ajuste.
 *
 * El producto y el tipo elegidos cambian las reglas de los demás campos:
 * los motivos, el texto de la cantidad y cuándo la nota se vuelve
 * obligatoria. Todo eso se calcula desde los valores del formulario, sin
 * necesidad de efectos.
 *
 * Guardar pasa por aplicarMovimiento, que escribe el producto y su
 * movimiento en un solo lote.
 */

import { useMemo, useRef } from "react";
import { useFormulario } from "../../hooks/useFormulario.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import CapaModal from "../../components/CapaModal.jsx";
import { cambioGrande, reglasMovimiento } from "./reglasInventario.js";
import {
  MOTIVOS,
  aplicarMovimiento,
  formatoCantidad
} from "./inventarioService.js";

const ETIQUETAS_CANTIDAD = {
  entrada: "Cantidad que ingresa",
  salida: "Cantidad que sale",
  ajuste: "Existencia real contada"
};

const TIPOS = [
  { valor: "entrada", nombre: "Entrada" },
  { valor: "salida", nombre: "Salida" },
  { valor: "ajuste", nombre: "Ajuste" }
];

function FormularioMovimiento({ productos, productoId = "", tipo = "entrada", usuario, alCerrar }) {
  const buscarProducto = useMemo(
    () => id => productos.find(producto => String(producto.id) === String(id)),
    [productos]
  );
  const reglas = useMemo(() => reglasMovimiento(buscarProducto), [buscarProducto]);
  const form = useFormulario(
    { productoId: String(productoId), tipo, cantidad: "", motivo: MOTIVOS[tipo][0], nota: "" },
    reglas
  );
  const primerCampo = useRef(null);
  const campoCantidad = useRef(null);

  const elegido = buscarProducto(form.valores.productoId);
  const tipoActual = form.valores.tipo;
  const motivos = MOTIVOS[tipoActual];
  const notaObligatoria = cambioGrande({
    producto: elegido,
    tipo: tipoActual,
    cantidad: form.valores.cantidad
  });

  // Al cambiar el tipo, los motivos son otros: el elegido deja de existir.
  function cambiarTipo(valor) {
    form.fijar({ tipo: valor, motivo: MOTIVOS[valor][0] });
  }

  const alEnviar = form.enviar(async valores => {
    try {
      const { producto, existenciaNueva } = aplicarMovimiento({
        productoId: valores.productoId,
        tipo: valores.tipo,
        cantidad: Number(valores.cantidad),
        motivo: valores.motivo,
        nota: valores.nota,
        usuario
      });

      alCerrar();

      // SweetAlert muestra un aviso a la vez: si la salida dejó el
      // producto en o bajo el mínimo, la advertencia reemplaza al aviso.
      const minimo = Number(producto.stockMinimo);
      const cuanto = `${formatoCantidad(existenciaNueva)} ${producto.unidad}`;
      if (valores.tipo === "salida" && existenciaNueva <= minimo) {
        aviso(`Queda poco de ${producto.nombre}: ${cuanto} (mínimo ${formatoCantidad(minimo)})`, "warning");
      } else if (valores.tipo === "ajuste") {
        aviso(`Ajuste registrado: ${producto.nombre} queda en ${cuanto}`);
      } else {
        const accion = valores.tipo === "entrada" ? "Entrada" : "Salida";
        aviso(`${accion} registrada: ${formatoCantidad(valores.cantidad)} ${producto.unidad} de ${producto.nombre}`);
      }
    } catch (fallo) {
      // El lote ya devolvió el inventario a su estado anterior.
      await mostrarError("No se pudo registrar el movimiento", fallo.message);
    }
  });

  const ordenados = [...productos].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  );

  return (
    <CapaModal
      idTitulo="modal-movimiento-title"
      titulo="Registrar movimiento"
      subtitulo="Cada entrada, salida o conteo queda guardado en el historial."
      alCerrar={alCerrar}
      enfocarAlAbrir={productoId ? campoCantidad : primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="movimiento-producto">Producto</label>
        <select id="movimiento-producto" ref={primerCampo}
          className={form.errores.productoId ? "is-invalid" : undefined} {...form.campo("productoId")}>
          <option value="">— Selecciona —</option>
          {ordenados.map(producto => (
            <option key={producto.id} value={producto.id}>
              {producto.categoria} · {producto.nombre}
            </option>
          ))}
        </select>
        {form.errores.productoId && (
          <div className="invalid-feedback d-block">{form.errores.productoId}</div>
        )}

        <label id="movimiento-tipo-label">Tipo de movimiento</label>
        <div className="mov-tipos" role="radiogroup" aria-labelledby="movimiento-tipo-label">
          {TIPOS.map(opcion => (
            <label className="mov-tipo" key={opcion.valor}>
              <input type="radio" name="movimiento-tipo" value={opcion.valor}
                checked={tipoActual === opcion.valor}
                onChange={() => cambiarTipo(opcion.valor)} />
              <span>{opcion.nombre}</span>
            </label>
          ))}
        </div>

        <p className="mov-existencia">
          {elegido
            ? `Existencia actual: ${formatoCantidad(elegido.cantidad)} ${elegido.unidad} · `
              + `mínimo ${formatoCantidad(elegido.stockMinimo)} ${elegido.unidad}`
            : ""}
        </p>

        <label htmlFor="movimiento-cantidad">{ETIQUETAS_CANTIDAD[tipoActual]}</label>
        <input type="number" id="movimiento-cantidad" ref={campoCantidad}
          className={form.errores.cantidad ? "is-invalid" : undefined}
          min="0" step="0.01" placeholder="0" {...form.campo("cantidad")} />
        {form.errores.cantidad && (
          <div className="invalid-feedback d-block">{form.errores.cantidad}</div>
        )}

        <label htmlFor="movimiento-motivo">Motivo</label>
        <select id="movimiento-motivo" {...form.campo("motivo")}>
          {motivos.map(motivo => <option key={motivo} value={motivo}>{motivo}</option>)}
        </select>

        <label htmlFor="movimiento-nota">
          {notaObligatoria
            ? "Nota (obligatoria: el ajuste cambia la existencia en más del 50 %)"
            : "Nota (opcional)"}
        </label>
        <textarea id="movimiento-nota" className={form.errores.nota ? "is-invalid" : undefined}
          placeholder="Ej: factura 1204 del proveedor" maxLength={300} {...form.campo("nota")} />
        {form.errores.nota && <div className="invalid-feedback d-block">{form.errores.nota}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="btn-submit" disabled={form.enviando}>Registrar</button>
        </div>
      </form>
    </CapaModal>
  );
}

export default FormularioMovimiento;
