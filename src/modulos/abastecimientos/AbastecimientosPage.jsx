import AyudaContextual from "../../components/AyudaContextual.jsx";
import { useState } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";
import { fechaHoyLocal, haceDias, fechaLegible } from "../../utils/fechas.js";
import { error } from "../../services/dialogos.js";
import GraficaBarras from "../../components/GraficaBarras.jsx";
import ClimaOperativo from "../../components/ClimaOperativo.jsx";
import {
  camposIniciales,
  cargarDemanda,
  insumosReferencia,
  proyectarCobertura,
  sumarDias,
  validarProyeccion
} from "./modeloAbastecimiento.js";
const numero = (valor) =>
  valor.toLocaleString("es-SV", { maximumFractionDigits: 1 });
const dia = (valor) =>
  fechaLegible(valor, { day: "numeric", month: "short", year: "numeric" });
export default function AbastecimientosPage() {
  const { registros: ventas, problema } = useColeccion("ventas");
  const [campos, setCampos] = useState(camposIniciales);
  const [aplicados, setAplicados] = useState(camposIniciales);
  const [errores, setErrores] = useState({});
  const [calculando, setCalculando] = useState(false);
  const demanda = cargarDemanda(ventas);
  const resultado = proyectarCobertura(aplicados, demanda);
  const insumo = insumosReferencia.find((item) => item.id === campos.insumoId);
  const modificar = (nombre, valor) => {
    const nuevo =
      nombre === "insumoId"
        ? {
            ...camposIniciales(
              insumosReferencia.find((item) => item.id === valor)
            ),
            fecha: campos.fecha
          }
        : { ...campos, [nombre]: valor };
    setCampos(nuevo);
    if (Object.keys(errores).length) setErrores(validarProyeccion(nuevo));
  };
  async function calcular(evento) {
    evento.preventDefault();
    if (calculando) return;
    const fallos = validarProyeccion(campos);
    setErrores(fallos);
    if (Object.keys(fallos).length) {
      evento.currentTarget.elements.namedItem(Object.keys(fallos)[0])?.focus();
      return;
    }
    setAplicados({ ...campos });
    const proyeccion = proyectarCobertura(campos, demanda);
    if (proyeccion.critico) {
      setCalculando(true);
      try {
        await error(
          "Cobertura crítica",
          `${insumo.nombre}: ${numero(proyeccion.cobertura)} días de cobertura desde la compra. Pedido sugerido: ${dia(proyeccion.fechaPedido)}.`
        );
      } finally {
        setCalculando(false);
      }
    }
  }
  return (
    <>
      <h1 className="h3 fw-bold mb-4">Abastecimiento previsto</h1>
      {problema && <p className="alert alert-warning">{problema}</p>}
      <div className="row g-3 mb-3">
        <section className="col-12 col-xl-6">
          <article className="app-panel h-100 p-3 p-md-4">
            <AyudaContextual
              tema="Datos del pedido"
              encabezado={<h2 className="h5 mb-0">Datos del pedido</h2>}
            >
              <p>Consumo diario = promedio de unidades vendidas × consumo por unidad. Ajusta este último si cambia la mezcla de productos.</p>
              <p>El cálculo estima la cobertura y la fecha de recompra sin registrar una compra ni cambiar las existencias.</p>
            </AyudaContextual>
            <p className="small text-body-secondary mt-2 mb-3">Los valores iniciales son ilustrativos.</p>
            <form id="formulario-pedido" noValidate onSubmit={calcular}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="insumo-pedido" className="form-label">
                    Insumo
                  </label>
                  <select
                    id="insumo-pedido"
                    name="insumoId"
                    className={`form-select${errores.insumoId ? " is-invalid" : ""}`}
                    value={campos.insumoId}
                    onChange={(evento) =>
                      modificar("insumoId", evento.target.value)
                    }
                  >
                    {insumosReferencia.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="invalid-feedback">{errores.insumoId}</div>
                </div>
                {[
                  {
                    nombre: "fecha",
                    id: "fecha-compra",
                    etiqueta: "Fecha de compra",
                    tipo: "date",
                    min: haceDias(30),
                    max: fechaHoyLocal()
                  },
                  {
                    nombre: "cantidad",
                    id: "cantidad-comprada",
                    etiqueta: `Cantidad comprada (${insumo.unidad})`,
                    tipo: "number",
                    min: 0.1,
                    max: 5000,
                    step: 0.1
                  },
                  {
                    nombre: "porcion",
                    id: "porcion-estandar",
                    etiqueta: `Consumo por unidad vendida (${insumo.unidad})`,
                    tipo: "number",
                    min: 0.001,
                    max: 10,
                    step: 0.001
                  }
                ].map((campo) => (
                  <div className="col-12 col-md-6" key={campo.nombre}>
                    <label className="form-label" htmlFor={campo.id}>
                      {campo.etiqueta}
                    </label>
                    <input
                      className={`form-control${errores[campo.nombre] ? " is-invalid" : ""}`}
                      id={campo.id}
                      name={campo.nombre}
                      type={campo.tipo}
                      min={campo.min}
                      max={campo.max}
                      step={campo.step}
                      value={campos[campo.nombre]}
                      onChange={(evento) =>
                        modificar(campo.nombre, evento.target.value)
                      }
                      aria-invalid={!!errores[campo.nombre]}
                      aria-describedby={`${campo.id}-error`}
                    />
                    <div className="invalid-feedback" id={`${campo.id}-error`}>
                      {errores[campo.nombre]}
                    </div>
                  </div>
                ))}
                <div className="col-12">
                  <button
                    className="btn btn-app-primary w-100"
                    disabled={calculando}
                  >
                    Calcular cobertura del pedido
                  </button>
                </div>
              </div>
            </form>
          </article>
        </section>
        <section className="col-12 col-xl-6">
          <article className="app-panel h-100 p-3 p-md-4" aria-live="polite">
            <h2 className="h5">
              Pedido de {resultado.insumo.nombre.toLowerCase()}
            </h2>
            <span
              className={`badge rounded-pill app-estado ${resultado.critico ? "app-estado-atencion" : "app-estado-ok"}`}
            >
              {resultado.critico ? "Alerta de recompra" : "Cobertura estable"}
            </span>
            <p className="mt-4">
              <strong className="abastecimientos-dias" id="dias-cobertura">
                {numero(resultado.cobertura)}
              </strong>{" "}
              días desde la compra
            </p>
            <dl className="abastecimientos-resumen">
              <div>
                <dt>Consumo diario estimado</dt>
                <dd>
                  {numero(resultado.consumo)} {resultado.insumo.unidad}
                </dd>
              </div>
              <div>
                <dt>Agotamiento estimado</dt>
                <dd>{dia(resultado.agotamiento)}</dd>
              </div>
              <div>
                <dt>Pedido sugerido</dt>
                <dd>{dia(resultado.fechaPedido)}</dd>
              </div>
            </dl>
            <p className="small text-body-secondary">
              Se reserva un día de seguridad.{" "}
              {demanda.real
                ? "Calculado con ventas reales."
                : "Calculado con ventas ilustrativas."}
            </p>
          </article>
        </section>
      </div>
      <div className="row g-3">
        <section className="col-12 col-xl-6">
          <article className="app-panel h-100 p-3 p-md-4">
            <h2 className="h5">Demanda esperada</h2>
            <p className="small text-body-secondary" id="mensaje-demanda">
              {demanda.real
                ? `Promedio de ventas de la operación en los últimos 7 días: ${numero(demanda.promedio)} unidades por día.`
                : "No hay ventas registradas para la operación en los últimos 7 días. La gráfica muestra un escenario ilustrativo."}
            </p>
            <GraficaBarras
              titulo={demanda.real ? "Demanda según ventas registradas" : "Escenario ilustrativo de demanda"}
              etiquetas={demanda.etiquetas}
              valores={demanda.valores}
            />
          </article>
        </section>
        <section className="col-12 col-xl-6">
          <article className="app-panel h-100 p-3 p-md-4">
            <h2 className="h5">Cobertura por insumo</h2>
            <p className="small text-body-secondary">
              Las filas usan cantidades ilustrativas, salvo el pedido que calculaste.
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Compra</th>
                    <th>Cobertura</th>
                    <th>Pedido sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {insumosReferencia.map((item) => {
                    const proyeccion =
                      item.id === aplicados.insumoId
                        ? resultado
                        : proyectarCobertura(
                            {
                              ...camposIniciales(item),
                              fecha: sumarDias(
                                fechaHoyLocal(),
                                -item.compraHace
                              )
                            },
                            demanda
                          );
                    return (
                      <tr key={item.id}>
                        <th scope="row">{item.nombre}</th>
                        <td>{dia(proyeccion.fecha)}</td>
                        <td>{numero(proyeccion.cobertura)} días</td>
                        <td>{dia(proyeccion.fechaPedido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
      <ClimaOperativo />
    </>
  );
}
