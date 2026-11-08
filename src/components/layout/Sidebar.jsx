/**
 * Sidebar — menú lateral con los módulos del rol y el cierre de sesión.
 *
 * Conserva el marcado y las clases de la plantilla anterior, para que los
 * estilos de css/main.css sigan sirviendo. Lo que cambia es de dónde sale
 * la información: antes la leía de atributos del <body>, ahora la recibe
 * del rol de la sesión, y los enlaces son rutas de React Router, así que
 * cambiar de módulo ya no recarga la página.
 */

import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { modulosDeRol, nombreRol } from "../../app/modulos.js";
import { confirmar } from "../../services/dialogos.js";
import { useState } from "react";

function Sidebar({ alNavegar }) {
  const { sesion, cerrarSesion } = useAuth();
  const [cerrando, setCerrando] = useState(false);
  const modulos = modulosDeRol(sesion.rol);
  const rol = nombreRol(sesion.rol);
  const perfil = sesion.nombre ? `${sesion.nombre} · ${rol}` : rol;

  /**
   * La confirmación es de la interfaz, no del servicio.
   * Mientras el diálogo está abierto el botón queda desactivado, para que
   * un segundo clic no abra otro diálogo encima.
   */
  async function alCerrarSesion() {
    if (cerrando) return;
    setCerrando(true);
    try {
      const confirmado = await confirmar({
        titulo: "¿Quieres cerrar sesión?",
        texto: "Volverás al inicio de sesión. Los datos guardados se conservarán.",
        boton: "Sí, cerrar sesión"
      });
      if (confirmado) cerrarSesion();
    } finally {
      setCerrando(false);
    }
  }

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
            {modulos.map(modulo => (
              <li className="nav-item" key={modulo.id}>
                <NavLink
                  to={modulo.ruta}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                  aria-current={undefined}
                  onClick={alNavegar}
                >
                  <span className="app-nav-marca" aria-hidden="true" />
                  <span>{modulo.nombre}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="app-perfil rounded-3 p-3 mt-auto">
          <p className="small fw-semibold mb-1" id="rol-menu">{perfil}</p>
          <p className="small app-texto-lateral mb-0">Tacos Joya de Cerén</p>
          <button className="btn btn-app-primary w-100 mt-3" type="button" id="btn-cerrar-sesion"
            onClick={alCerrarSesion} disabled={cerrando} aria-busy={cerrando || undefined}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
