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

import { Navigate, Route, Routes } from "react-router-dom";
import { RutaProtegida, RutaPublica } from "../auth/RutaProtegida.jsx";
import { useAuth } from "../auth/useAuth.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Dashboard from "../modulos/dashboard/Dashboard.jsx";
import Login from "../modulos/auth/Login.jsx";
import Registro from "../modulos/auth/Registro.jsx";
import Inventario from "../modulos/inventario/Inventario.jsx";
import Mermas from "../modulos/mermas/Mermas.jsx";
import Recetas from "../modulos/recetas/Recetas.jsx";
import Turnos from "../modulos/turnos/Turnos.jsx";
import { ROL_ADMIN } from "../services/authService.js";

const VentasPage = lazy(() => import("../modulos/ventas/VentasPage.jsx"));
const AbastecimientosPage = lazy(
  () => import("../modulos/abastecimientos/AbastecimientosPage.jsx")
);
const ReportesPage = lazy(() => import("../modulos/reportes/ReportesPage.jsx"));

/** La raíz manda a la pantalla de inicio del rol, o al login si no hay sesión. */
function Inicio() {
  const { inicio } = useAuth();
  return <Navigate to={inicio} replace />;
}

function Rutas() {
  return (
    <Routes>
      {/* Público. Quien ya entró no vuelve a ver el login. */}
      <Route element={<RutaPublica />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>

      {/* Con sesión: el menú, la barra y el contenido del módulo. */}
      <Route element={<RutaProtegida />}>
        <Route element={<AppLayout />}>
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/mermas" element={<Mermas />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/ventas" element={<VentasPage />} />

          {/* Solo administrador. */}
          <Route element={<RutaProtegida rol={ROL_ADMIN} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/abastecimientos" element={<AbastecimientosPage />} />
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
