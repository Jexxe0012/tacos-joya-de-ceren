/**
 * FichaReceta — la ficha técnica que se abre desde el catálogo.
 *
 * Muestra la cantidad de cada ingrediente en la receta completa y por
 * porción. Los costos y el margen solo los ve el administrador: el
 * empleado consulta ingredientes y preparación.
 */

import { obtenerInsumo } from "../../services/insumosService.js";
import {
  categoriaSeVende,
  costoPorPorcion,
  costoTotal,
  enteros,
  fechaCorta,
  formatoCantidad,
  margenPorPorcion,
  moneda,
  nombreCategoria
} from "./recetasService.js";

function FichaReceta({ receta, esAdmin }) {
  const porciones = Number(receta.porciones) || 1;
  const activa = receta.estado === "activa";
  const margen = margenPorPorcion(receta);
  const lineas = receta.ingredientes ?? [];

  return (
    <div className="modal-body">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className={`badge rounded-pill app-estado ${activa ? "app-estado-ok" : "app-estado-atencion"}`}>
          {activa ? "Activa" : "Inactiva"}
        </span>
        <span className="small text-body-secondary">
          {nombreCategoria(receta.categoria)} · rinde {enteros.format(receta.porciones)} porciones ·{" "}
          {enteros.format(receta.tiempoMinutos)} minutos
        </span>
      </div>

      {esAdmin && (
        <div className="app-panel p-3 mb-3">
          <dl className="mb-0">
            <div className="receta-dato">
              <dt className="fw-normal">Costo total de la receta</dt>
              <dd>{moneda.format(costoTotal(receta))}</dd>
            </div>
            <div className="receta-dato">
              <dt className="fw-normal">Costo por porción</dt>
              <dd>{moneda.format(costoPorPorcion(receta))}</dd>
            </div>
            <div className="receta-dato">
              <dt className="fw-normal">Precio de venta</dt>
              <dd>
                {categoriaSeVende(receta.categoria) ? moneda.format(receta.precioVenta || 0) : "No se vende"}
              </dd>
            </div>
            <div className="receta-dato">
              <dt className="fw-normal">Margen por porción</dt>
              <dd>{margen === null ? "No aplica" : moneda.format(margen)}</dd>
            </div>
          </dl>
        </div>
      )}

      <h3 className="h6 fw-semibold mb-2">Ingredientes</h3>
      <div className="table-responsive mb-4">
        <table className="table table-sm receta-tabla align-middle mb-0">
          <caption className="visually-hidden">Ingredientes de {receta.nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Insumo</th>
              <th scope="col">Receta completa</th>
              <th scope="col">Por porción</th>
              {esAdmin && <th scope="col">Costo</th>}
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={esAdmin ? 4 : 3}>Esta receta no tiene ingredientes registrados.</td>
              </tr>
            )}
            {lineas.map((linea, indice) => {
              const insumo = obtenerInsumo(linea.insumoId);
              const unidad = insumo ? insumo.unidad : "";
              return (
                <tr key={`${linea.insumoId}-${indice}`}>
                  <td>{insumo ? insumo.nombre : "Insumo no encontrado"}</td>
                  <td>{formatoCantidad(linea.cantidad, unidad)}</td>
                  <td>{formatoCantidad(linea.cantidad / porciones, unidad)}</td>
                  {esAdmin && (
                    <td>{moneda.format(insumo ? linea.cantidad * insumo.costoUnitario : 0)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="h6 fw-semibold mb-2">Preparación</h3>
      <p className="receta-preparacion mb-4">{receta.preparacion}</p>

      <p className="small text-body-secondary mb-0">
        Registrada por {receta.creadaPor || "Sin registro"} · última actualización{" "}
        {fechaCorta.format(new Date(receta.actualizadaEn || receta.creadaEn || Date.now()))}
      </p>
    </div>
  );
}

export default FichaReceta;
