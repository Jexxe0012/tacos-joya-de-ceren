/**
 * useAuth — acceso a la sesión desde cualquier componente.
 *
 * Devuelve { sesion, iniciarSesion, registrarUsuario, cerrarSesion,
 * esAdmin, inicio }. La sesión es null cuando no hay nadie dentro.
 *
 *   const { sesion, cerrarSesion } = useAuth();
 */

import { useContext } from "react";
import { ContextoAuth } from "./AuthProvider.jsx";

export function useAuth() {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    // Pasa si un componente se monta fuera del árbol de la app.
    throw new Error("useAuth solo funciona dentro de AuthProvider.");
  }
  return contexto;
}

export default useAuth;
