import { useEffect, useState } from "react";
import {
  consultarClima,
  ubicacionRestaurante
} from "../services/climaService.js";
import { fechaLegible } from "../utils/fechas.js";

export default function ClimaOperativo() {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({
    cargando: true,
    datos: null,
    error: ""
  });
  useEffect(() => {
    const control = new AbortController();
    setEstado((actual) => ({ ...actual, cargando: true, error: "" }));
    consultarClima({ signal: control.signal, forzar: intento > 0 })
      .then((datos) => {
        if (!control.signal.aborted)
          setEstado({ cargando: false, datos, error: "" });
      })
      .catch((causa) => {
        if (!control.signal.aborted)
          setEstado({
            cargando: false,
            datos: null,
            error:
              causa.name === "TimeoutError"
                ? "La consulta del clima tardó demasiado. Intenta de nuevo."
                : causa.message
          });
      });
    return () => control.abort();
  }, [intento]);
  const temperatura = (valor) =>
    valor === null
      ? "No disponible"
      : `${valor.toLocaleString("es-SV", { maximumFractionDigits: 1 })} °C`;
  return (
    <section
      className="app-panel p-3 p-md-4 mt-4"
      aria-labelledby="titulo-clima"
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 className="h6 fw-semibold mb-0" id="titulo-clima">
          Clima para planificar la operación
        </h2>
        <button
          className="btn btn-app-secondary btn-sm"
          type="button"
          disabled={estado.cargando}
          onClick={() => setIntento((valor) => valor + 1)}
        >
          {estado.error ? "Reintentar" : "Actualizar clima"}
        </button>
      </div>
      <p className="small text-body-secondary mt-2">
        Próximos 7 días para {ubicacionRestaurante.nombre}. Pronóstico
        meteorológico como contexto de planificación.
      </p>
      {estado.cargando && <p role="status">Consultando el pronóstico…</p>}
      {estado.error && (
        <p className="alert alert-warning mb-0" role="status">
          {estado.error}
        </p>
      )}
      {!estado.cargando && estado.datos && (
        <>
          <div className="table-responsive">
            <table className="table table-sm">
              <caption>
                Pronóstico de temperatura y probabilidad de lluvia
              </caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Mínima</th>
                  <th scope="col">Máxima</th>
                  <th scope="col">Lluvia</th>
                </tr>
              </thead>
              <tbody>
                {estado.datos.dias.map((dia) => (
                  <tr key={dia.fecha}>
                    <th scope="row">
                      {fechaLegible(dia.fecha, {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      })}
                    </th>
                    <td>{temperatura(dia.minima)}</td>
                    <td>{temperatura(dia.maxima)}</td>
                    <td>
                      {dia.lluvia === null ? "No disponible" : `${dia.lluvia}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small text-body-secondary mb-0">
            Consultado el{" "}
            {estado.datos.consultadoEn.toLocaleString("es-SV", {
              timeZone: "America/El_Salvador"
            })}
            . Datos de{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            .{" "}
            <a
              href={ubicacionRestaurante.mapa}
              target="_blank"
              rel="noreferrer"
            >
              Ubicación del restaurante
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}
