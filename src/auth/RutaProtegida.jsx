/**
 * RutaProtegida y RutaPublica — quién puede ver cada ruta.
 *
 * Reemplazan a Guard.requireLogin() y Guard.requireRole(): en vez de
 * esconder la página y redirigir con window.location, se decide durante
 * el render y React Router cambia la ruta.
 *
 * Se usan como envoltorio de un grupo de rutas (con Outlet) o de una
 * sola pantalla (con children).
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { rutaInicio } from "../services/authService.js";
import { useAuth } from "./useAuth.js";

/**
 * Exige sesión activa y, si se indica "rol", también ese perfil.
 * Sin sesión manda al login y recuerda a dónde quería ir. Con el perfil
 * equivocado manda al inicio que le corresponde, no al login: ya entró.
 */
export function RutaProtegida({ rol, children }) {
  const { sesion } = useAuth();
  const ubicacion = useLocation();

  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (rol && sesion.rol !== rol) {
    return <Navigate to={rutaInicio(sesion.rol)} replace />;
  }
  return children ?? <Outlet />;
}

/**
 * Para el login y el registro: quien ya tiene sesión no vuelve a verlos,
 * se va a su pantalla de inicio.
 */
export function RutaPublica({ children }) {
  const { sesion } = useAuth();

  if (sesion) {
    return <Navigate to={rutaInicio(sesion.rol)} replace />;
  }
  return children ?? <Outlet />;
}

export default RutaProtegida;
