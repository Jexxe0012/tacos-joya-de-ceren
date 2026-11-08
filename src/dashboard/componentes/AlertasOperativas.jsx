export default function AlertasOperativas({ alertas }) {
  return <article className="app-panel dashboard-alertas h-100 p-3 p-md-4">
    <div className="d-flex justify-content-between gap-2 mb-3"><h2 className="h5 fw-semibold mb-0">Requiere atención</h2>
      <span className="badge rounded-pill app-estado app-estado-atencion">{alertas.length} alertas</span></div>
    {!alertas.length && <p className="small text-body-secondary">Sin alertas entre los registros disponibles.</p>}
    <ul className="list-unstyled mb-0">{alertas.map((alerta, indice) => <li className="dashboard-alerta" key={indice}>
      <strong>{alerta.titulo}</strong><p className="small text-body-secondary mb-0">{alerta.mensaje}</p></li>)}</ul>
  </article>;
}
