/**
 * FormularioProducto — alta y edición de un producto del inventario.
 *
 * La existencia solo se escribe al crear. Al editar queda de solo
 * lectura: así todo cambio de existencia pasa por un movimiento y queda
 * en el historial.
 */

import { useMemo, useRef } from "react";
import { useFormulario } from "../../hooks/useFormulario.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import { fechaHoyLocal } from "../../utils/fechas.js";
import CapaModal from "../../components/CapaModal.jsx";
import { reglasProducto } from "./reglasInventario.js";
import {
  CATEGORIAS,
  UNIDADES,
  actualizarProducto,
  crearProducto
} from "./inventarioService.js";

function valoresDe(producto) {
  return {
    nombre: producto?.nombre ?? "",
    categoria: producto?.categoria ?? "",
    unidad: producto?.unidad ?? "",
    cantidad: producto ? String(producto.cantidad) : "",
    stockMinimo: producto ? String(producto.stockMinimo) : "",
    costoUnitario: producto ? String(producto.costoUnitario) : "",
    caducidad: producto?.caducidad ?? "",
    proveedor: producto?.proveedor ?? "",
    ubicacion: producto?.ubicacion ?? ""
  };
}

function FormularioProducto({ producto, usuario, alCerrar, alEliminar }) {
  const editando = Boolean(producto);
  const reglas = useMemo(() => reglasProducto(producto?.id ?? ""), [producto]);
  const form = useFormulario(valoresDe(producto), reglas);
  const primerCampo = useRef(null);

  // form.enviar revisa todo, marca los errores y pone el foco en el
  // primero; la acción solo corre cuando el formulario está completo.
  const alEnviar = form.enviar(async valores => {
    const datos = {
      nombre: valores.nombre,
      categoria: valores.categoria,
      unidad: valores.unidad,
      stockMinimo: Number(valores.stockMinimo),
      costoUnitario: Number(valores.costoUnitario),
      caducidad: valores.caducidad,
      proveedor: valores.proveedor,
      ubicacion: valores.ubicacion
    };

    try {
      if (editando) actualizarProducto(producto.id, datos);
      else crearProducto({ datos, cantidad: Number(valores.cantidad), usuario });
    } catch (fallo) {
      await mostrarError("No se pudo guardar el producto", fallo.message);
      return;
    }

    alCerrar();
    aviso(editando ? "Producto actualizado" : "Producto creado");
  });

  const campoError = nombre => (form.errores[nombre]
    ? <div className="invalid-feedback d-block" id={`${nombre}-error`}>{form.errores[nombre]}</div>
    : null);

  const clase = nombre => (form.errores[nombre] ? "is-invalid" : undefined);

  return (
    <CapaModal
      ancho
      idTitulo="modal-producto-title"
      titulo={editando ? "Editar producto" : "Nuevo producto"}
      subtitulo="Registra un insumo del inventario con su unidad de medida y su mínimo de alerta."
      alCerrar={alCerrar}
      enfocarAlAbrir={primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="producto-nombre">Producto</label>
        <input type="text" id="producto-nombre" ref={primerCampo} className={clase("nombre")}
          placeholder="Ej: Carne de res para asar" maxLength={60} {...form.campo("nombre")} />
        {campoError("nombre")}

        <div className="modal-row">
          <div>
            <label htmlFor="producto-categoria">Categoría</label>
            <select id="producto-categoria" className={clase("categoria")} {...form.campo("categoria")}>
              <option value="">— Selecciona —</option>
              {CATEGORIAS.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
            </select>
            {campoError("categoria")}
          </div>
          <div>
            <label htmlFor="producto-unidad">Unidad de medida</label>
            <select id="producto-unidad" className={clase("unidad")} {...form.campo("unidad")}>
              <option value="">— Selecciona —</option>
              {UNIDADES.map(unidad => <option key={unidad} value={unidad}>{unidad}</option>)}
            </select>
            {campoError("unidad")}
          </div>
        </div>

        <div className="modal-row">
          <div>
            <label htmlFor="producto-cantidad">Existencia actual</label>
            <input type="number" id="producto-cantidad" className={clase("cantidad")}
              min="0" step="0.01" placeholder="0" readOnly={editando} {...form.campo("cantidad")} />
            {editando && <p className="campo-ayuda">Para cambiarla, registra un movimiento.</p>}
            {campoError("cantidad")}
          </div>
          <div>
            <label htmlFor="producto-minimo">Mínimo antes de alertar</label>
            <input type="number" id="producto-minimo" className={clase("stockMinimo")}
              min="0" step="0.01" placeholder="0" {...form.campo("stockMinimo")} />
            {campoError("stockMinimo")}
          </div>
        </div>

        <div className="modal-row">
          <div>
            <label htmlFor="producto-costo">Costo por unidad (US$)</label>
            <input type="number" id="producto-costo" className={clase("costoUnitario")}
              min="0.01" step="0.01" placeholder="0.00" {...form.campo("costoUnitario")} />
            {campoError("costoUnitario")}
          </div>
          <div>
            <label htmlFor="producto-caducidad">Caducidad (opcional)</label>
            <input type="date" id="producto-caducidad" className={clase("caducidad")}
              min={editando ? undefined : fechaHoyLocal()} {...form.campo("caducidad")} />
            {campoError("caducidad")}
          </div>
        </div>

        <div className="modal-row">
          <div>
            <label htmlFor="producto-proveedor">Proveedor (opcional)</label>
            <input type="text" id="producto-proveedor" className={clase("proveedor")}
              placeholder="Ej: Carnicería El Novillo" maxLength={60} {...form.campo("proveedor")} />
            {campoError("proveedor")}
          </div>
          <div>
            <label htmlFor="producto-ubicacion">Ubicación (opcional)</label>
            <input type="text" id="producto-ubicacion" className={clase("ubicacion")}
              placeholder="Ej: Congelador 1" maxLength={60} {...form.campo("ubicacion")} />
            {campoError("ubicacion")}
          </div>
        </div>

        <div className="modal-actions">
          {editando && (
            <button type="button" className="btn-danger" onClick={() => alEliminar(producto)}>
              Eliminar
            </button>
          )}
          <button type="button" className="btn-cancel" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="btn-submit" disabled={form.enviando}>Guardar</button>
        </div>
      </form>
    </CapaModal>
  );
}

export default FormularioProducto;
