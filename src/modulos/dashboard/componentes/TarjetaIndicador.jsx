import AyudaContextual from "../../../components/AyudaContextual.jsx";
function TarjetaIndicador({ titulo, valor, descripcion, ayuda, children }) {
  const encabezado = <h2 className="dashboard-etiqueta mb-0">{titulo}</h2>;
  return (
    <article className="app-panel dashboard-indicador h-100 p-3 p-md-4">
      <div className="dashboard-titulo-indicador mb-2">
        {ayuda ? (
          <AyudaContextual tema={titulo} encabezado={encabezado}>
            <p>{ayuda}</p>
          </AyudaContextual>
        ) : encabezado}
      </div>

      <p className="dashboard-valor fw-bold mb-1">{valor}</p>

      {descripcion && <p className="small text-body-secondary mb-0">{descripcion}</p>}

      {children}
    </article>
  );
}

export default TarjetaIndicador;
