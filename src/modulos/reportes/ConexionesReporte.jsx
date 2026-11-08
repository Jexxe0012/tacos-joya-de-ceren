import { useState } from "react";
import { listarInsumos, obtenerInsumo, equivalenciaAutomatica, resolverVinculo } from "../../services/insumosService.js";
import { aviso, error, confirmar } from "../../services/dialogos.js";
import { guardarVinculo, quitarVinculo, validarVinculo } from "./vinculosService.js";

export default function ConexionesReporte({ registros }) {
  const [valores, setValores] = useState({ insumoId: "", productoId: "", factor: "" });
  const [errores, setErrores] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const productos = new Map(registros.inventario.filter(item => item?.id != null).map(item => [String(item.id), item]));
  const insumos = listarInsumos().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const insumo = obtenerInsumo(valores.insumoId);
  const producto = productos.get(valores.productoId);
  const actual = registros.vinculosInsumos.find(item => item?.insumoId === valores.insumoId);
  const automatico = insumo && producto ? equivalenciaAutomatica(producto.unidad, insumo.unidad) : null;

  function cambiar(evento) {
    const { name, value } = evento.target;
    let nuevos = { ...valores, [name]: value };
    if (name === "insumoId") {
      const guardado = registros.vinculosInsumos.find(item => item?.insumoId === value);
      nuevos = { insumoId: value, productoId: String(guardado?.productoId ?? ""), factor: String(guardado?.factor ?? "") };
    }
    if (name !== "factor") {
      const elegido = productos.get(nuevos.productoId);
      const ingrediente = obtenerInsumo(nuevos.insumoId);
      const conversion = elegido && ingrediente ? equivalenciaAutomatica(elegido.unidad, ingrediente.unidad) : null;
      nuevos.factor = conversion === null ? (name === "insumoId" ? nuevos.factor : "") : String(conversion);
    }
    setValores(nuevos);
    if (Object.keys(errores).length) setErrores(validarVinculo(nuevos, registros));
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (ocupado) return;
    const validacion = validarVinculo(valores, registros);
    setErrores(validacion);
    const primero = Object.keys(validacion)[0];
    if (primero) { evento.currentTarget.elements.namedItem(primero)?.focus(); return; }
    setOcupado(true);
    try {
      guardarVinculo(valores);
      await aviso("Vínculo guardado");
    } catch (causa) { await error("No se pudo guardar el vínculo", causa.message); }
    finally { setOcupado(false); }
  }

  async function quitar() {
    if (ocupado || !insumo) return;
    setOcupado(true);
    try {
      if (!await confirmar({ titulo: "¿Quieres quitar este vínculo?", texto: `Se quitará la correspondencia de ${insumo.nombre}.`, boton: "Sí, quitar vínculo", peligro: true })) return;
      quitarVinculo(insumo.id);
      setValores({ insumoId: insumo.id, productoId: "", factor: "" });
      await aviso("Vínculo eliminado");
    } catch (causa) { await error("No se pudo quitar el vínculo", causa.message); }
    finally { setOcupado(false); }
  }

  const campos = [
    ["insumoId", "vinculo-ingrediente", "Ingrediente de Recetas"],
    ["productoId", "vinculo-producto", "Producto de Inventario"],
    ["factor", "vinculo-factor", "Equivalencia por unidad de inventario"]
  ];
  const filas = insumos.filter(item => registros.vinculosInsumos.some(vinculo => vinculo?.insumoId === item.id));

  return (
    <details className="app-panel p-3 p-md-4 mb-4" id="conexiones-inventario">
      <summary className="fw-semibold">Conectar ingredientes de Recetas con Inventario</summary>
      <p className="small text-body-secondary mt-3">Relaciona cada ingrediente con su producto para calcular el consumo estándar y compararlo con las salidas de cocina.</p>
      <form id="formulario-vinculo" noValidate onSubmit={guardar}>
        <div className="row g-3">
          {campos.map(([nombre, id, etiqueta]) => {
            const props = { id, name: nombre, value: valores[nombre], onChange: cambiar, disabled: ocupado,
              className: `form-${nombre === "factor" ? "control" : "select"}${errores[nombre] ? " is-invalid" : ""}`,
              "aria-invalid": errores[nombre] ? true : undefined, "aria-describedby": `${id}-error` };
            return (
              <div className="col-12 col-lg-4" key={nombre}>
                <label className="form-label" htmlFor={id}>{etiqueta}</label>
                {nombre === "factor" ? <input {...props} type="number" min="0.000001" max="1000000" step="any"
                  readOnly={automatico !== null} disabled={ocupado || !insumo || !producto} /> : (
                  <select {...props}><option value="">Selecciona {nombre === "insumoId" ? "un ingrediente" : "un producto"}</option>
                    {(nombre === "insumoId" ? insumos : [...productos.values()]).map(item =>
                      <option key={item.id} value={item.id}>{item.nombre} ({item.unidad})</option>)}
                  </select>
                )}
                <div className="invalid-feedback" id={`${id}-error`}>{errores[nombre]}</div>
              </div>
            );
          })}
        </div>
        <p className="small text-body-secondary mt-3" id="ayuda-equivalencia">
          {insumo && producto ? `1 ${producto.unidad} de ${producto.nombre} equivale a esta cantidad en ${insumo.unidad} de ${insumo.nombre}.`
            : "Selecciona el ingrediente y su producto."}
          {automatico !== null ? " La conversión es automática." : " Indica el contenido real cuando las unidades requieren una equivalencia."}
        </p>
        <div className="d-flex gap-2">
          <button className="btn btn-app-primary" disabled={ocupado} id="btn-guardar-vinculo">Guardar vínculo</button>
          {actual && <button className="btn btn-app-secondary" type="button" disabled={ocupado} onClick={quitar}>Quitar vínculo</button>}
        </div>
      </form>
      <div className="table-responsive mt-3">
        <table className="table table-sm"><caption>Correspondencias para calcular el consumo</caption>
          <thead><tr><th>Ingrediente</th><th>Producto</th><th>Equivalencia</th></tr></thead>
          <tbody id="tabla-vinculos">{filas.length ? filas.map(item => {
            const vinculo = registros.vinculosInsumos.find(enlace => enlace?.insumoId === item.id);
            const resultado = resolverVinculo(item.id, productos, registros.vinculosInsumos);
            return <tr key={item.id}><th scope="row">{item.nombre}</th>
              <td>{productos.get(String(vinculo.productoId))?.nombre || "Producto eliminado"}</td>
              <td>{resultado.error ? `Revisar: ${resultado.error}` : `1 ${resultado.producto.unidad} = ${resultado.factor} ${item.unidad}`}</td></tr>;
          }) : <tr><td colSpan={3}>Todavía no has vinculado ingredientes.</td></tr>}</tbody>
        </table>
      </div>
    </details>
  );
}
