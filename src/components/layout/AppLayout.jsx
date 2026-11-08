/**
 * AppLayout — la estructura que comparten todas las pantallas con sesión.
 *
 * Dibuja el menú lateral, la barra superior y el contenido de la ruta
 * activa en <Suspense fallback={<p role="status">Cargando pantalla…</p>}><Outlet /></Suspense>. El login y el registro no pasan por aquí: tienen
 * su propia distribución.
 *
 * Mantiene el mismo marcado de las páginas anteriores (app-layout,
 * app-sidebar, app-area, app-barra) para que css/main.css y los estilos
 * de cada módulo sigan aplicándose sin cambios.
 */

import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Offcanvas } from "bootstrap";
import { moduloDeRuta } from "../../app/modulos.js";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

/** Clase que cada módulo espera en el <body> para sus estilos propios. */
const CLASE_POR_MODULO = {
  dashboard: "dashboard-page",
  recetas: "recetas-page",
  inventario: "inventario-page",
  mermas: "pagina-mermas",
  turnos: "turnos-page",
  reportes: "reportes-page",
  ventas: "ventas-page",
  abastecimientos: "abastecimientos-page"
};

function AppLayout() {
  const { pathname } = useLocation();
  const modulo = moduloDeRuta(pathname);
  const principal = useRef(null);
  const menu = useRef(null);
  const primeraRuta = useRef(true);

  // El <body> ya no trae las clases escritas en el HTML: las pone la ruta.
  useEffect(() => {
    const clases = ["app-page", CLASE_POR_MODULO[modulo?.id]].filter(Boolean);
    document.body.classList.add(...clases);
    document.title = modulo ? `${modulo.nombre} | Tacos Joya de Cerén` : "Tacos Joya de Cerén";
    return () => {
      document.body.classList.remove(...clases);
      document.title = "Tacos Joya de Cerén";
    };
  }, [modulo]);

  // Al cambiar de módulo el foco pasa al contenido, como hacía la recarga
  // de página. En la primera visita no se mueve: molestaría al llegar.
  useEffect(() => {
    if (primeraRuta.current) {
      primeraRuta.current = false;
      return;
    }
    principal.current?.focus();
  }, [pathname]);

  /** En móvil el menú es un offcanvas: al elegir un módulo se cierra. */
  function cerrarMenuEnMovil() {
    if (menu.current) Offcanvas.getInstance(menu.current)?.hide();
  }

  return (
    <>
      <a className="visually-hidden-focusable app-salto" href="#contenido-principal">
        Saltar al contenido principal
      </a>

      <div className="app-layout d-lg-flex">
        <aside className="app-sidebar offcanvas-lg offcanvas-start d-lg-flex flex-lg-column"
          tabIndex={-1} id="menu-lateral" aria-labelledby="titulo-menu" ref={menu}>
          <Sidebar alNavegar={cerrarMenuEnMovil} />
        </aside>

        <div className="app-area flex-grow-1">
          <header className="app-barra d-flex align-items-center flex-wrap gap-3 px-3 px-md-4 py-3 border-bottom"
            id="barra-superior">
            <Header modulo={modulo} />
          </header>

          <main className="container-fluid p-3 p-md-4 p-xl-5" id="contenido-principal"
            tabIndex={-1} ref={principal}>
            <Suspense fallback={<p role="status">Cargando pantalla…</p>}><Outlet /></Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

export default AppLayout;
