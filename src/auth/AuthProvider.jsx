/**
 * AuthProvider — guarda la sesión activa y la comparte con toda la app.
 *
 * Es el único lugar que sabe si hay alguien dentro. Las pantallas no leen
 * localStorage: piden la sesión con useAuth() y vuelven a renderizarse
 * cuando cambia.
 *
 * Las reglas de acceso viven en services/authService.js. Aquí solo se
 * traduce el resultado a estado de React.
 */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  CLAVE_SESION,
  ROL_ADMIN,
  borrarSesion,
  iniciarSesion as autenticar,
  leerSesion,
  registrarUsuario as crearUsuario,
  rutaInicio
} from "../services/authService.js";

export const ContextoAuth = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  // Otra pestaña puede entrar o cerrar sesión. El evento storage solo
  // avisa a las demás pestañas, así las dos muestran lo mismo.
  useEffect(() => {
    function alCambiarAlmacen(evento) {
      // key en null significa que se limpió todo el almacenamiento.
      if (evento.key === CLAVE_SESION || evento.key === null) setSesion(leerSesion());
    }
    window.addEventListener("storage", alCambiarAlmacen);
    return () => window.removeEventListener("storage", alCambiarAlmacen);
  }, []);

  /**
   * Valida la cuenta y deja la sesión activa.
   * Si algo falla, authService lanza un ErrorAcceso con el campo que lo
   * causó: el formulario lo atrapa y marca ese campo.
   */
  const iniciarSesion = useCallback(datos => {
    const nueva = autenticar(datos);
    setSesion(nueva);
    return nueva;
  }, []);

  /** Crea la cuenta sin iniciar sesión, igual que el prototipo. */
  const registrarUsuario = useCallback(datos => crearUsuario(datos), []);

  /** Quita la sesión guardada y la del estado. La confirmación es de la interfaz. */
  const cerrarSesion = useCallback(() => {
    borrarSesion();
    setSesion(null);
  }, []);

  const valor = useMemo(() => ({
    sesion,
    iniciarSesion,
    registrarUsuario,
    cerrarSesion,
    esAdmin: sesion?.rol === ROL_ADMIN,
    inicio: sesion ? rutaInicio(sesion.rol) : "/login"
  }), [sesion, iniciarSesion, registrarUsuario, cerrarSesion]);

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export default AuthProvider;
