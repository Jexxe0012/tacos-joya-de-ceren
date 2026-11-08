/**
 * FormularioReceta — crear o editar una receta.
 *
 * Conserva todo lo que hacía el modal anterior: validación por campo
 * mientras se llena, ingredientes con sus propias reglas, cálculo de
 * costo y margen en vivo, precio solo para las categorías que se venden
 * y confirmación cuando el margen queda negativo.
 *
 * Los ingredientes viven en el estado como una lista, no como filas del
 * DOM: agregar, quitar y cambiar un insumo es cambiar esa lista.
 */

import { useMemo, useRef, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { obtenerInsumo } from "../../services/insumosService.js";
import { aviso, confirmar, error as mostrarError, exito } from "../../services/dialogos.js";
import { useFormulario } from "../../hooks/useFormulario.js";
import {
  CATEGORIAS,
  LIMITES,
  catalogoInsumos,
  categoriaSeVende,
  costoPorPorcion,
  costoTotal,
  guardarReceta,
  margenPorPorcion,
  moneda
} from "./recetasService.js";
import { reglasFormularioReceta, revisarIngredientes } from "./reglasReceta.js";

const INSUMOS = catalogoInsumos();

/** Los valores del formulario son texto: así el input controla su contenido. */
function valoresDe(receta) {
  return {
    nombre: receta?.nombre ?? "",
    categoria: receta?.categoria ?? "",
    porciones: receta ? String(receta.porciones ?? "") : "",
    tiempoMinutos: receta ? String(receta.tiempoMinutos ?? "") : "",
    precioVenta: receta?.precioVenta ? String(receta.precioVenta) : "",
    estado: receta?.estado ?? "activa",
    preparacion: receta?.preparacion ?? ""
  };
}

function ingredientesDe(receta) {
  const lineas = (receta?.ingredientes ?? []).map(linea => ({
    insumoId: linea.insumoId,
    cantidad: String(linea.cantidad)
  }));
  return lineas.length ? lineas : [lineaNueva([])];
}

/** Una línea nueva arranca con el primer insumo que la receta no usa. */
function lineaNueva(lineas) {
  const usados = lineas.map(linea => linea.insumoId);
  const libre = INSUMOS.find(insumo => !usados.includes(insumo.id)) ?? INSUMOS[0];
  return { insumoId: libre.id, cantidad: "" };
}

function FormularioReceta({ receta, autor, alCerrar, alGuardar }) {
  const editando = Boolean(receta);
  const reglas = useMemo(() => reglasFormularioReceta(receta?.id ?? ""), [receta]);
  const form = useFormulario(valoresDe(receta), reglas);

  const [lineas, setLineas] = useState(() => ingredientesDe(receta));
  const [erroresLinea, setErroresLinea] = useState(() => ingredientesDe(receta).map(() => ({})));
  const [errorGrupo, setErrorGrupo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const tocadas = useRef(new Set());
  const primerCampo = useRef(null);

  // Espejo de la lista, por la misma razón que en useFormulario: dos
  // cambios seguidos pueden ocurrir antes de un render, y el segundo no
  // debe partir de una lista vieja.
  const ultimas = useRef(lineas);

  function fijarLineas(lista) {
    ultimas.current = lista;
    setLineas(lista);
    return lista;
  }

  const seVende = Boolean(form.valores.categoria) && categoriaSeVende(form.valores.categoria);

  // Los cálculos se derivan de lo que hay escrito: no hacen falta efectos.
  const recetaEnCurso = {
    porciones: Number(form.valores.porciones) || 1,
    precioVenta: seVende ? Number(form.valores.precioVenta) || 0 : 0,
    categoria: form.valores.categoria,
    ingredientes: lineas
      .map(linea => ({ insumoId: linea.insumoId, cantidad: Number(linea.cantidad) }))
      .filter(linea => linea.cantidad > 0)
  };
  const total = costoTotal(recetaEnCurso);
  const porPorcion = costoPorPorcion(recetaEnCurso);
  const margen = margenPorPorcion(recetaEnCurso);

  /** Revisa solo las líneas que el usuario ya tocó, como hacía Valida.enVivo. */
  function revisarTocadas(lista) {
    const { porLinea } = revisarIngredientes(lista);
    setErroresLinea(porLinea.map((errores, indice) => (tocadas.current.has(indice) ? errores : {})));
  }

  function cambiarLinea(indice, cambios) {
    const lista = fijarLineas(
      ultimas.current.map((linea, posicion) => (posicion === indice ? { ...linea, ...cambios } : linea))
    );
    tocadas.current.add(indice);
    if (errorGrupo || erroresLinea.some(errores => Object.keys(errores).length)) revisarTocadas(lista);
  }

  function agregarLinea() {
    if (ultimas.current.length >= LIMITES.ingredientesMax) {
      aviso(`Una receta admite hasta ${LIMITES.ingredientesMax} ingredientes.`, "warning");
      return;
    }
    const lista = fijarLineas([...ultimas.current, lineaNueva(ultimas.current)]);
    setErroresLinea(lista.map((_, indice) => erroresLinea[indice] ?? {}));
  }

  function quitarLinea(indice) {
    const lista = fijarLineas(ultimas.current.filter((_, posicion) => posicion !== indice));
    // Las posiciones cambian: se vuelven a marcar las tocadas que quedan.
    const siguientes = new Set();
    [...tocadas.current].forEach(posicion => {
      if (posicion < indice) siguientes.add(posicion);
      else if (posicion > indice) siguientes.add(posicion - 1);
    });
    tocadas.current = siguientes;
    setErroresLinea(lista.map(() => ({})));
    setErrorGrupo("");
    if (lista.length) revisarTocadas(lista);
  }

  /**
   * Al elegir una categoría que no se vende, el precio se vacía y pierde
   * su error: un campo desactivado no puede quedar en rojo.
   */
  function cambiarCategoria(valor) {
    form.cambiar("categoria", valor);
    if (valor && !categoriaSeVende(valor)) {
      form.cambiar("precioVenta", "");
      form.limpiarError("precioVenta");
    }
  }

  /**
   * Se revisan los campos y los ingredientes antes de salir, para marcar
   * todos los errores de una vez y no de uno en uno.
   */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardando) return;

    const revisionCampos = form.validarTodo();
    const lineasListas = ultimas.current.map(linea => ({
      insumoId: linea.insumoId,
      cantidad: Number(String(linea.cantidad).trim())
    }));
    const revision = revisarIngredientes(lineasListas);
    setErroresLinea(revision.porLinea);
    setErrorGrupo(revision.grupo);
    ultimas.current.forEach((_, indice) => tocadas.current.add(indice));

    if (!revisionCampos.ok || !revision.ok) {
      aviso("Revisa los campos marcados en rojo.", "warning");
      return;
    }

    const valores = revisionCampos.valores;
    const datos = {
      nombre: valores.nombre,
      categoria: valores.categoria,
      porciones: Number(valores.porciones),
      tiempoMinutos: Number(valores.tiempoMinutos),
      precioVenta: seVende ? Number(valores.precioVenta) : 0,
      estado: valores.estado,
      ingredientes: lineasListas,
      preparacion: valores.preparacion
    };

    // Vender por debajo del costo se permite (una promoción, por
    // ejemplo), pero el administrador tiene que confirmarlo.
    const margenGuardado = margenPorPorcion(datos);
    if (margenGuardado !== null && Math.round(margenGuardado * 100) < 0) {
      const seguir = await confirmar({
        titulo: "Esta receta deja margen negativo. ¿Guardar de todas formas?",
        texto: `Cada porción cuesta ${moneda.format(costoPorPorcion(datos))} y se vende a `
          + `${moneda.format(datos.precioVenta)}: se pierden ${moneda.format(-margenGuardado)} por porción.`,
        boton: "Sí, guardar",
        peligro: true
      });
      if (!seguir) return;
    }

    setGuardando(true);
    try {
      guardarReceta({ id: receta?.id ?? "", datos, autor });
    } catch (fallo) {
      await mostrarError("No se pudo guardar la receta", fallo.message);
      return;
    } finally {
      setGuardando(false);
    }

    alGuardar?.();
    alCerrar();
    exito(
      editando ? "Cambios guardados" : "Receta agregada",
      editando ? `Se actualizó la ficha de ${datos.nombre}.` : `${datos.nombre} ya está en el catálogo.`
    );
  }

  return (
    <Modal
      abierto
      titulo={editando ? "Editar receta" : "Nueva receta"}
      idTitulo="titulo-modal-receta"
      alCerrar={alCerrar}
      enfocarAlAbrir={primerCampo}
    >
      <form onSubmit={alEnviar} noValidate>
        <div className="modal-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="receta-nombre">Nombre de la receta</label>
              <input className={`form-control${form.errores.nombre ? " is-invalid" : ""}`} type="text"
                id="receta-nombre" ref={primerCampo} maxLength={LIMITES.nombreMax} autoComplete="off"
                {...form.campo("nombre")} />
              {form.errores.nombre && (
                <div className="invalid-feedback d-block" id="nombre-error">{form.errores.nombre}</div>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="receta-categoria">Categoría</label>
              <select className={`form-select${form.errores.categoria ? " is-invalid" : ""}`}
                id="receta-categoria" {...form.campo("categoria")}
                onChange={evento => cambiarCategoria(evento.target.value)}>
                <option value="">Selecciona una categoría</option>
                {CATEGORIAS.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
              {form.errores.categoria && (
                <div className="invalid-feedback d-block" id="categoria-error">{form.errores.categoria}</div>
              )}
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="receta-porciones">Porciones que rinde</label>
              <input className={`form-control${form.errores.porciones ? " is-invalid" : ""}`} type="number"
                id="receta-porciones" min={LIMITES.porcionesMin} max={LIMITES.porcionesMax} step="1"
                {...form.campo("porciones")} />
              {form.errores.porciones && (
                <div className="invalid-feedback d-block" id="porciones-error">{form.errores.porciones}</div>
              )}
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="receta-tiempo">Tiempo (minutos)</label>
              <input className={`form-control${form.errores.tiempoMinutos ? " is-invalid" : ""}`} type="number"
                id="receta-tiempo" min={LIMITES.tiempoMin} max={LIMITES.tiempoMax} step="1"
                {...form.campo("tiempoMinutos")} />
              {form.errores.tiempoMinutos && (
                <div className="invalid-feedback d-block" id="tiempoMinutos-error">{form.errores.tiempoMinutos}</div>
              )}
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="receta-precio">Precio de venta</label>
              <div className="input-group has-validation">
                <span className="input-group-text">$</span>
                <input className={`form-control${form.errores.precioVenta ? " is-invalid" : ""}`} type="number"
                  id="receta-precio" min={LIMITES.precioMin} max={LIMITES.precioMax} step="0.01"
                  disabled={!seVende} {...form.campo("precioVenta")} />
                {form.errores.precioVenta && (
                  <div className="invalid-feedback d-block" id="precioVenta-error">{form.errores.precioVenta}</div>
                )}
              </div>
              <p className="small text-body-secondary mt-1 mb-0" id="ayuda-receta-precio">
                {seVende ? "Precio de una porción." : "Las preparaciones base no se venden por separado."}
              </p>
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="receta-estado">Estado</label>
              <select className={`form-select${form.errores.estado ? " is-invalid" : ""}`}
                id="receta-estado" {...form.campo("estado")}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
              {form.errores.estado && (
                <div className="invalid-feedback d-block" id="estado-error">{form.errores.estado}</div>
              )}
            </div>
          </div>

          <hr className="my-4" />

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h3 className="h6 fw-semibold mb-0" id="titulo-ingredientes">Ingredientes de la receta</h3>
            <button className="btn btn-app-secondary btn-sm" type="button" onClick={agregarLinea}
              disabled={lineas.length >= LIMITES.ingredientesMax}
              title={lineas.length >= LIMITES.ingredientesMax
                ? `Máximo ${LIMITES.ingredientesMax} ingredientes por receta.`
                : undefined}>
              Agregar ingrediente
            </button>
          </div>
          <p className="small text-body-secondary">
            Anota la cantidad que lleva la receta completa, no la de una sola porción.
          </p>

          <div role="group" aria-labelledby="titulo-ingredientes">
            {lineas.map((linea, indice) => {
              const insumo = obtenerInsumo(linea.insumoId);
              const errores = erroresLinea[indice] ?? {};
              return (
                <div className="row g-2 align-items-end receta-ingrediente" key={indice}>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small mb-1" htmlFor={`ingrediente-${indice}`}>Insumo</label>
                    <select className={`form-select${errores.insumoId ? " is-invalid" : ""}`}
                      id={`ingrediente-${indice}`} value={linea.insumoId}
                      onChange={evento => cambiarLinea(indice, { insumoId: evento.target.value })}
                      onBlur={() => revisarTocadas(lineas)}>
                      {INSUMOS.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre} ({item.unidad})</option>
                      ))}
                    </select>
                    {errores.insumoId && <div className="invalid-feedback d-block">{errores.insumoId}</div>}
                  </div>

                  <div className="col-7 col-sm-4">
                    <label className="form-label small mb-1 w-100" htmlFor={`cantidad-${indice}`}>Cantidad</label>
                    <div className="input-group has-validation">
                      <input className={`form-control${errores.cantidad ? " is-invalid" : ""}`} type="number"
                        id={`cantidad-${indice}`} min="0" max={LIMITES.cantidadMax}
                        step={insumo && insumo.unidad === "unidad" ? "1" : "0.001"}
                        value={linea.cantidad}
                        onChange={evento => cambiarLinea(indice, { cantidad: evento.target.value })}
                        onBlur={() => revisarTocadas(lineas)} />
                      <span className="input-group-text">{insumo ? insumo.unidad : ""}</span>
                      {errores.cantidad && <div className="invalid-feedback d-block">{errores.cantidad}</div>}
                    </div>
                  </div>

                  <div className="col-5 col-sm-2 d-grid">
                    <button className="btn btn-app-secondary" type="button"
                      onClick={() => quitarLinea(indice)}>Quitar</button>
                  </div>
                </div>
              );
            })}
          </div>

          {errorGrupo && <p className="receta-error mt-2" role="alert">{errorGrupo}</p>}

          <div className="app-panel p-3 mt-3">
            <dl className="mb-0">
              <div className="receta-dato">
                <dt className="fw-normal">Costo total de la receta</dt>
                <dd>{moneda.format(total)}</dd>
              </div>
              <div className="receta-dato">
                <dt className="fw-normal">Costo por porción</dt>
                <dd>{moneda.format(porPorcion)}</dd>
              </div>
              <div className="receta-dato">
                <dt className="fw-normal">Margen por porción</dt>
                <dd className={margen === null || margen > 0 ? "" : "receta-margen-bajo"}>
                  {margen === null ? "No aplica" : moneda.format(margen)}
                </dd>
              </div>
            </dl>
          </div>

          <hr className="my-4" />

          <label className="form-label" htmlFor="receta-preparacion">Preparación</label>
          <textarea className={`form-control${form.errores.preparacion ? " is-invalid" : ""}`}
            id="receta-preparacion" rows={4} maxLength={LIMITES.preparacionMax}
            placeholder="Escribe los pasos en el orden en que se hacen."
            {...form.campo("preparacion")} />
          {form.errores.preparacion && (
            <div className="invalid-feedback d-block" id="preparacion-error">{form.errores.preparacion}</div>
          )}
          <p className="small text-body-secondary mt-1 mb-0">
            {form.valores.preparacion.length} de {LIMITES.preparacionMax} caracteres
            (mínimo {LIMITES.preparacionMin}).
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-app-secondary" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-app-primary" type="submit" disabled={guardando}>
            {editando ? "Guardar cambios" : "Guardar receta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default FormularioReceta;
