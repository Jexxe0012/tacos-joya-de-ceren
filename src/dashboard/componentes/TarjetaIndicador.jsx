function TarjetaIndicador({ titulo, valor, descripcion, children }) {
  return (
    <article className="app-panel dashboard-indicador h-100 p-3 p-md-4">

      <p className="dashboard-etiqueta mb-2">
        {titulo}
      </p>

      <p className="dashboard-valor fw-bold mb-1">
        {valor}
      </p>

      <p className="small text-body-secondary mb-0">
        {descripcion}
      </p>

      {children}

    </article>
  );
}

export default TarjetaIndicador;
