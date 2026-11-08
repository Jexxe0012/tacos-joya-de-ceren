import { useState } from "react";
import { fechaHoyLocal } from "../../utils/fechas.js";
import { aviso, error } from "../../services/dialogos.js";
import { validarFiltrosReporte } from "./modeloReporte.js";

export default function FiltrosReporte({ iniciales, catalogos, resumen, onAplicar }) {
  const [valores, setValores] = useState(iniciales);
  const [errores, setErrores] = useState({});
  const [aplicando, setAplicando] = useState(false);
  const personalizado = valores.periodo === "personalizado";

  function cambiar(evento) {
    const { name, value } = evento.target;
    const nuevos = { ...valores, [name]: value };
    setValores(nuevos);
    if (Object.keys(errores).length) setErrores(validarFiltrosReporte(nuevos, catalogos));
  }

  function alSalir(evento) {
    const campo = evento.target.name;
    const validacion = validarFiltrosReporte(valores, catalogos);
    setErrores(actuales => ({ ...actuales, [campo]: validacion[campo] }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (aplicando) return;
    const validacion = validarFiltrosReporte(valores, catalogos);
    setErrores(validacion);
    const primero = Object.keys(validacion)[0];
    if (primero) {
      evento.currentTarget.elements.namedItem(primero)?.focus();
      return;
    }
    setAplicando(true);
    try {
      onAplicar({ ...valores });
      await aviso("Reporte actualizado");
    } catch (causa) {
      await error("No se pudo actualizar el reporte", causa.message);
    } finally {
      setAplicando(false);
    }
  }

  function atributos(nombre, id) {
    return {
      id, name: nombre, value: valores[nombre], onChange: cambiar, onBlur: alSalir,
      className: `form-${nombre.startsWith("fecha") ? "control" : "select"}${errores[nombre] ? " is-invalid" : ""}`,
      "aria-invalid": errores[nombre] ? true : undefined, "aria-describedby": `${id}-error`
    };
  }

  return (
    <section className="reportes-filtros app-panel p-3 p-md-4 mb-4" aria-labelledby="titulo-filtros">
      <h2 className="h6 fw-semibold mb-3" id="titulo-filtros">Filtrar reportes</h2>
      <form id="formulario-filtros" noValidate onSubmit={enviar}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label" htmlFor="filtro-periodo">Período</label>
            <select {...atributos("periodo", "filtro-periodo")}>
              <option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
            <div className="invalid-feedback" id="filtro-periodo-error">{errores.periodo}</div>
          </div>
          {[["insumo", "Producto de merma", "productos"], ["receta", "Receta vendida", "recetas"]].map(([nombre, etiqueta, lista]) => (
            <div className="col-12 col-md-6 col-xl-3" key={nombre}>
              <label className="form-label" htmlFor={`filtro-${nombre}`}>{etiqueta}</label>
              <select {...atributos(nombre, `filtro-${nombre}`)}>
                {catalogos[lista].map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
              </select>
              <div className="invalid-feedback" id={`filtro-${nombre}-error`}>{errores[nombre]}</div>
            </div>
          ))}
          <div className="col-12 col-md-6 col-xl-3 d-grid">
            <button className="btn btn-app-primary" id="btn-aplicar-filtros" disabled={aplicando}
              aria-busy={aplicando || undefined}>Aplicar filtros</button>
          </div>
        </div>
        <fieldset className="mt-3" hidden={!personalizado} disabled={!personalizado}>
          <legend className="h6">Fechas del reporte</legend>
          <p className="small text-body-secondary">Selecciona hasta 90 días, incluyendo ambas fechas. La fecha final no puede ser posterior a hoy.</p>
          <div className="row g-3">
            {[["fechaInicio", "inicio", "Fecha inicial"], ["fechaFin", "fin", "Fecha final"]].map(([nombre, sufijo, etiqueta]) => (
              <div className="col-12 col-md-6" key={nombre}>
                <label className="form-label" htmlFor={`filtro-fecha-${sufijo}`}>{etiqueta}</label>
                <input type="date" max={fechaHoyLocal()} required={personalizado} {...atributos(nombre, `filtro-fecha-${sufijo}`)} />
                <div className="invalid-feedback" id={`filtro-fecha-${sufijo}-error`}>{errores[nombre]}</div>
              </div>
            ))}
          </div>
        </fieldset>
      </form>
      <p className="small text-body-secondary mt-3 mb-0">Las recetas vendibles se toman de Recetas. Crear una receta no registra una venta.</p>
      <p className="small text-body-secondary mt-3 mb-0" id="resumen-filtros" role="status">{resumen}</p>
    </section>
  );
}
