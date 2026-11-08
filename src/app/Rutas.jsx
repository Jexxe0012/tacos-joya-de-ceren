import { lazy } from "react";
/**
 * Rutas — la composición de rutas de toda la aplicación.
 *
 * Es el único archivo que importa las pantallas. El menú lateral no las
 * conoce: lee los datos de app/modulos.js. Esa separación evita que el
 * menú y las rutas se importen en círculo.
 *
 * El acceso queda declarado aquí, en un solo lugar:
 *   /login y /registro      públicos; con sesión, van al inicio del rol.
 *   /dashboard, /reportes,
 *   /abastecimientos        solo administrador.
 *   /recetas, /inventario,
 *   /mermas, /turnos,
 *   /ventas                 cualquier sesión activa; el rol decide qué
 *                           acciones se muestran dentro de la pantalla.
 */

import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RutaProtegida, RutaPublica } from "../auth/RutaProtegida.jsx";
import { useAuth } from "../auth/useAuth.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import ModuloPendiente from "../components/ModuloPendiente.jsx";
import Dashboard from "../dashboard/Dashboard.jsx";
import { ROL_ADMIN } from "../services/authService.js";
import { moduloDeRuta } from "./modulos.js";

const ReportesPage = lazy(() => import("../modulos/reportes/ReportesPage.jsx"));

/** La raíz manda a la pantalla de inicio del rol, o al login si no hay sesión. */
function Inicio() {
  const { inicio } = useAuth();
  return <Navigate to={inicio} replace />;
}

/**
 * Pantalla todavía no migrada. Toma el módulo de la ruta activa, así que
 * una sola entrada sirve para todas las rutas pendientes.
 */
function Pendiente({ responsable }) {
  const { pathname } = useLocation();
  return <ModuloPendiente modulo={moduloDeRuta(pathname)} responsable={responsable} />;
}

function Rutas() {
  return (
    <Routes>
      {/* Público. Quien ya entró no vuelve a ver el login. */}
      <Route element={<RutaPublica />}>
        <Route path="/login" element={<Pendiente responsable="Diego" />} />
        <Route path="/registro" element={<Pendiente responsable="Diego" />} />
      </Route>

      {/* Con sesión: el menú, la barra y el contenido del módulo. */}
      <Route element={<RutaProtegida />}>
        <Route element={<AppLayout />}>
          <Route path="/recetas" element={<Pendiente responsable="Diego" />} />
          <Route path="/inventario" element={<Pendiente responsable="Diego" />} />
          <Route path="/mermas" element={<Pendiente responsable="Diego" />} />
          <Route path="/turnos" element={<Pendiente responsable="Diego" />} />
          <Route path="/ventas" element={<Pendiente responsable="Josué" />} />

          {/* Solo administrador. */}
          <Route element={<RutaProtegida rol={ROL_ADMIN} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/abastecimientos" element={<Pendiente responsable="Josué" />} />
          </Route>
        </Route>
      </Route>

      {/* La raíz y cualquier ruta desconocida llevan al inicio del rol. */}
      <Route path="/" element={<Inicio />} />
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}

export default Rutas;
