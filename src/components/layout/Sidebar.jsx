/**
 * Sidebar — menú lateral con los módulos del rol y el cierre de sesión.
 *
 * Conserva el marcado y las clases de la plantilla anterior, para que los
 * estilos de css/main.css sigan sirviendo. Lo que cambia es de dónde sale
 * la información: antes la leía de atributos del <body>, ahora la recibe
 * del rol de la sesión, y los enlaces son rutas de React Router, así que
 * cambiar de módulo ya no recarga la página.
 */

import { BookOpen, CalendarDays, ChartColumn, LayoutDashboard, LogOut, Package, Receipt, Trash2, Truck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { modulosDeRol, nombreRol } from "../../app/modulos.js";
import { confirmar } from "../../services/dialogos.js";
import { esModoDemostracion } from "../../services/modoDatos.js";
import EnlaceDemostracion from "../EnlaceDemostracion.jsx";
import { useState } from "react";

const ICONOS_MODULOS = {
  dashboard: LayoutDashboard,
  recetas: BookOpen,
  inventario: Package,
  mermas: Trash2,
  turnos: CalendarDays,
  reportes: ChartColumn,
  ventas: Receipt,
  abastecimientos: Truck
};

function Sidebar({ alNavegar }) {
  const { sesion, cerrarSesion } = useAuth();
  const [cerrando, setCerrando] = useState(false);
  const modulos = modulosDeRol(sesion.rol);
  const rol = nombreRol(sesion.rol);

  /**
   * La confirmación es de la interfaz, no del servicio.
   * Mientras el diálogo está abierto el botón queda desactivado, para que
   * un segundo clic no abra otro diálogo encima.
   */
  async function alCerrarSesion() {
    if (cerrando) return;
    setCerrando(true);
    try {
      await alNavegar();
      const confirmado = await confirmar({
        titulo: "¿Quieres cerrar sesión?",
        texto: "Volverás al inicio de sesión. Los datos guardados se conservarán.",
        boton: "Cerrar sesión"
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
        <nav className="mb-3" aria-label="Navegación principal">
          <ul className="nav nav-pills flex-column gap-1" id="enlaces-menu">
            {modulos.map(modulo => {
              const Icono = ICONOS_MODULOS[modulo.id];
              return (
                <li className="nav-item" key={modulo.id}>
                  <NavLink
                    to={modulo.ruta}
                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                    onClick={alNavegar}
                  >
                    <Icono className="app-nav-icono" size={18} aria-hidden="true" />
                    <span>{modulo.nombre}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="app-perfil rounded-3 p-3">
          <div id="rol-menu">
            {sesion.nombre && <p className="small fw-semibold text-break mb-1">{sesion.nombre}</p>}
            <p className="small app-texto-lateral mb-0">{rol}</p>
            {esModoDemostracion() && <p className="small app-texto-lateral mt-1 mb-0">Sesión de demostración</p>}
          </div>
          <button className="btn app-cerrar-sesion app-btn-icono w-100 mt-3" type="button" id="btn-cerrar-sesion"
            onClick={alCerrarSesion} disabled={cerrando} aria-busy={cerrando || undefined}>
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
          <EnlaceDemostracion className="d-block text-center small app-texto-lateral mt-2" />
        </div>
      </div>
    </>
  );
}

export default Sidebar;
