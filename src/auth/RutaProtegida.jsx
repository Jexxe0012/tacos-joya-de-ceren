/**
 * RutaProtegida y RutaPublica — quién puede ver cada ruta.
 *
 * Comprueban la sesión y el rol durante el render. React Router dirige
 * al login o al inicio correspondiente cuando el acceso no está permitido.
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
 * Para el registro: quien ya tiene sesión vuelve al inicio de su rol.
 * El login se muestra siempre para permitir identificar otra cuenta.
 */
export function RutaPublica({ children }) {
  const { sesion } = useAuth();

  if (sesion) {
    return <Navigate to={rutaInicio(sesion.rol)} replace />;
  }
  return children ?? <Outlet />;
}

export default RutaProtegida;
