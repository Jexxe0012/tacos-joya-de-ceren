/**
 * Header — barra superior: botón del menú en móvil, ubicación y rol.
 *
 * El nombre del módulo y su sección salen de la ruta activa, no de
 * atributos del <body> como antes.
 */

import { Menu } from "lucide-react";
import { useAuth } from "../../auth/useAuth.js";
import { nombreRol } from "../../app/modulos.js";

function Header({ modulo }) {
  const { sesion } = useAuth();
  const rol = nombreRol(sesion.rol);
  const nombre = sesion.rol === "admin" ? modulo?.nombre : (modulo?.nombreEmpleado ?? modulo?.nombre);

  return (
    <>
      <button className="btn btn-app-secondary app-menu-boton app-btn-icono d-lg-none" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#menu-lateral" aria-controls="menu-lateral" aria-haspopup="dialog">
        <Menu size={20} aria-hidden="true" />
        <span className="visually-hidden">Menú</span>
      </button>

      <nav className="app-ubicacion" aria-label="Ubicación actual">
        <ol className="breadcrumb small flex-nowrap align-items-center mb-0">
          <li className="breadcrumb-item text-truncate">{nombre ?? "Tacos Joya de Cerén"}</li>
          {modulo?.seccion && (
            <li className="breadcrumb-item active d-none d-sm-block" aria-current="page">{modulo.seccion}</li>
          )}
        </ol>
      </nav>

      <span className="badge rounded-pill app-rol border" id="rol-barra">{rol}</span>
    </>
  );
}

export default Header;
