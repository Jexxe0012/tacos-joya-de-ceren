/**
 * Header — barra superior: botón del menú en móvil, ubicación y rol.
 *
 * El nombre del módulo y su sección salen de la ruta activa, no de
 * atributos del <body> como antes.
 */

import { useAuth } from "../../auth/useAuth.js";
import { nombreRol } from "../../app/modulos.js";

function Header({ modulo }) {
  const { sesion } = useAuth();
  const rol = nombreRol(sesion.rol);
  const nombre = sesion.rol === "admin" ? modulo?.nombre : (modulo?.nombreEmpleado ?? modulo?.nombre);

  return (
    <>
      <button className="btn btn-app-secondary d-lg-none" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#menu-lateral" aria-controls="menu-lateral">
        Menú
      </button>

      <nav aria-label="Ubicación actual">
        <ol className="breadcrumb small mb-0">
          <li className="breadcrumb-item">{nombre ?? "Tacos Joya de Cerén"}</li>
          {modulo?.seccion && (
            <li className="breadcrumb-item active" aria-current="page">{modulo.seccion}</li>
          )}
        </ol>
      </nav>

      <span className="badge rounded-pill app-rol border ms-auto" id="rol-barra">{rol}</span>
    </>
  );
}

export default Header;
