/**
 * TarjetaReceta — una receta dentro del catálogo.
 *
 * El empleado ve los datos de operación: ingredientes y tiempo. El
 * administrador ve además costo, precio y margen, y los botones de
 * editar y eliminar.
 */

import {
  categoriaSeVende,
  costoPorPorcion,
  enteros,
  margenPorPorcion,
  margenPorcentaje,
  moneda,
  nombreCategoria
} from "./recetasService.js";

function TarjetaReceta({ receta, esAdmin, alVer, alEditar, alEliminar, ocupado }) {
  const activa = receta.estado === "activa";
  const margen = margenPorPorcion(receta);
  const porcentaje = margenPorcentaje(receta);
  const claseMargen = margen === null ? "" : margen <= 0 ? "receta-margen-bajo" : "receta-margen-ok";

  return (
    <div className="col-12 col-md-6 col-xl-4">
      <article className="app-panel receta-tarjeta h-100 p-3 p-md-4 d-flex flex-column"
        data-categoria={receta.categoria}>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <h3 className="h6 fw-semibold mb-0 receta-nombre">{receta.nombre}</h3>
          <span className={`badge rounded-pill app-estado ${activa ? "app-estado-ok" : "app-estado-atencion"}`}>
            {activa ? "Activa" : "Inactiva"}
          </span>
        </div>

        <p className="small text-body-secondary mb-3">
          {nombreCategoria(receta.categoria)} · rinde {enteros.format(receta.porciones)} porciones
        </p>

        <dl className="mb-3">
          <div className="receta-dato">
            <dt className="fw-normal">Ingredientes</dt>
            <dd>{enteros.format((receta.ingredientes ?? []).length)}</dd>
          </div>
          <div className="receta-dato">
            <dt className="fw-normal">Tiempo</dt>
            <dd>{enteros.format(receta.tiempoMinutos)} min</dd>
          </div>

          {esAdmin && (
            <>
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
                <dt className="fw-normal">Margen</dt>
                <dd className={claseMargen}>
                  {margen === null
                    ? "No aplica"
                    : `${moneda.format(margen)} (${enteros.format(porcentaje)}%)`}
                </dd>
              </div>
            </>
          )}
        </dl>

        <div className="receta-acciones d-flex flex-wrap gap-2 mt-auto">
          <button className="btn btn-app-secondary btn-sm" type="button" onClick={() => alVer(receta)}>
            Ver ficha
          </button>
          {esAdmin && (
            <>
              <button className="btn btn-app-secondary btn-sm" type="button" onClick={() => alEditar(receta)}>
                Editar
              </button>
              <button className="btn btn-app-primary btn-sm" type="button" disabled={ocupado}
                onClick={() => alEliminar(receta)}>
                Eliminar
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

export default TarjetaReceta;
