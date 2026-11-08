export default function Sidebar({ paginas, paginaActual, perfil, onCerrarSesion }) {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-3 p-4">
        <div className="d-flex align-items-center gap-3">
          <span className="app-marca rounded-3" aria-hidden="true">TJ</span>
          <div>
            <h2 className="h6 mb-1" id="titulo-menu">Tacos Joya</h2>
            <p className="small mb-0 app-texto-lateral">de Cerén</p>
          </div>
        </div>
        <button className="btn-close btn-close-white d-lg-none" type="button"
          data-bs-dismiss="offcanvas" data-bs-target="#menu-lateral" aria-label="Cerrar menú" />
      </div>

      <div className="offcanvas-body d-flex flex-column p-3">
        <nav aria-label="Navegación principal">
          <ul className="nav nav-pills flex-column gap-2" id="enlaces-menu">
            {paginas.map(pagina => {
              const activa = pagina.id === paginaActual.id;
              return (
                <li className="nav-item" key={pagina.id}>
                  <a className={activa ? "nav-link active" : "nav-link"}
                    href={pagina.href} aria-current={activa ? "page" : undefined}>
                    <span className="app-nav-marca" aria-hidden="true" />
                    <span>{pagina.nombre}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="app-perfil rounded-3 p-3 mt-auto">
          <p className="small fw-semibold mb-1" id="rol-menu">{perfil}</p>
          <p className="small app-texto-lateral mb-0">Tacos Joya de Cerén</p>
          <button className="btn btn-app-primary w-100 mt-3" type="button" id="btn-cerrar-sesion"
            onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
