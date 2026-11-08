export default function Header({ paginaActual, seccion, rol }) {
  return (
    <>
      <button className="btn btn-app-secondary d-lg-none" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#menu-lateral" aria-controls="menu-lateral">
        Menú
      </button>
      <nav aria-label="Ubicación actual">
        <ol className="breadcrumb small mb-0">
          <li className="breadcrumb-item">{paginaActual.nombre}</li>
          <li className="breadcrumb-item active" aria-current="page">{seccion}</li>
        </ol>
      </nav>
      <span className="badge rounded-pill app-rol border ms-auto" id="rol-barra">{rol}</span>
    </>
  );
}
