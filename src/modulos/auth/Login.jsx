/**
 * Login — entrar al sistema.
 *
 * El formato se revisa mientras
 * se escribe, lo que depende de los datos guardados se revisa al enviar,
 * cada error marca el campo que lo causó y a los cinco intentos fallidos
 * seguidos el acceso se bloquea un minuto, aunque se recargue la página.
 *
 * Los errores viven en el estado del formulario. Con la sesión activa,
 * RutaPublica lleva al usuario a su pantalla de inicio.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { useFormulario } from "../../hooks/useFormulario.js";
import {
  ErrorAcceso,
  SEGUNDOS_BLOQUEO,
  limpiarBloqueo,
  msDeBloqueo
} from "../../services/authService.js";
import { aviso, error as mostrarError } from "../../services/dialogos.js";
import { correo as reglaCorreo, texto } from "../../utils/validaciones.js";
import MarcoAuth from "./MarcoAuth.jsx";
import SelectorRol from "./SelectorRol.jsx";

/**
 * El mínimo es 6 y no 8 para que puedan entrar las cuentas creadas antes
 * de la regla nueva del registro.
 */
const REGLAS = {
  correo: reglaCorreo,
  contrasena: valor => texto(valor, { min: 6 }),
  rol: valor => (valor ? "" : "Selecciona tu perfil (Admin o Empleado).")
};

function Login() {
  const { iniciarSesion } = useAuth();
  const { state } = useLocation();

  // Al volver del registro, el correo y el perfil ya vienen puestos.
  const form = useFormulario(
    { correo: state?.correo ?? "", contrasena: "", rol: state?.rol ?? "" },
    REGLAS,
    { sinRecorte: ["contrasena"] }
  );

  const [segundos, setSegundos] = useState(() => Math.ceil(msDeBloqueo() / 1000));
  const [avisoGeneral, setAvisoGeneral] = useState("");
  const campos = {
    correo: useRef(null),
    contrasena: useRef(null),
    rol: useRef(null)
  };

  const bloqueado = segundos > 0;

  // La cuenta regresiva del bloqueo. Se arma cuando el bloqueo empieza, y
  // también al montar si venía de una recarga: el fin del bloqueo está
  // guardado, no en una variable.
  useEffect(() => {
    if (!bloqueado) return undefined;
    const reloj = setInterval(() => {
      const restan = Math.ceil(msDeBloqueo() / 1000);
      setSegundos(restan);
      if (restan <= 0) {
        clearInterval(reloj);
        limpiarBloqueo();
      }
    }, 1000);
    return () => clearInterval(reloj);
  }, [bloqueado]);

  // El foco entra en el primer campo, como al abrir la página anterior.
  const primerCampo = campos.correo;
  useEffect(() => {
    primerCampo.current?.focus();
  }, [primerCampo]);

  const alEnviar = form.enviar(async valores => {
    setAvisoGeneral("");
    try {
      const sesion = iniciarSesion({
        correo: valores.correo,
        contrasena: valores.contrasena,
        rol: valores.rol
      });
      // El aviso vive fuera del árbol de React, así que sigue en pantalla
      // mientras la ruta cambia a la pantalla de inicio del rol.
      aviso(`Bienvenido, ${sesion.nombre}`);
    } catch (fallo) {
      if (!(fallo instanceof ErrorAcceso)) throw fallo;

      if (fallo.campo) {
        form.marcarError(fallo.campo, fallo.message);
        campos[fallo.campo]?.current?.focus();
      } else {
        setAvisoGeneral(fallo.message);
      }

      if (fallo.bloqueado) {
        setSegundos(SEGUNDOS_BLOQUEO);
        await mostrarError(
          "Demasiados intentos",
          `Espera ${SEGUNDOS_BLOQUEO} segundos antes de volver a intentarlo.`
        );
      }
    }
  });

  return (
    <MarcoAuth
      tituloPagina="Ingresar"
      titulo="Bienvenido"
      subtitulo="Ingresa al sistema según tu rol"
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="correo">Correo electrónico</label>
        <input type="email" id="correo" ref={campos.correo} autoComplete="email"
          {...form.campo("correo")} />
        {form.errores.correo && (
          <p className="campo-error" id="correo-error" role="alert">{form.errores.correo}</p>
        )}

        <label htmlFor="contrasena">Contraseña</label>
        <input type="password" id="contrasena" ref={campos.contrasena} autoComplete="current-password"
          {...form.campo("contrasena")} />
        {form.errores.contrasena && (
          <p className="campo-error" id="contrasena-error" role="alert">{form.errores.contrasena}</p>
        )}

        <div ref={campos.rol} tabIndex={-1}>
          <SelectorRol
            nombre="role"
            valor={form.valores.rol}
            alCambiar={valor => form.cambiar("rol", valor)}
            error={form.errores.rol}
            idError="rol-error"
          />
        </div>

        {avisoGeneral && <p className="aviso-formulario" role="alert">{avisoGeneral}</p>}

        <button type="submit" disabled={bloqueado || form.enviando}>
          {bloqueado ? `Espera ${segundos} s` : "Ingresar al sistema"}
        </button>
      </form>

      <p className="toggle-link">
        ¿No tienes cuenta?{" "}
        <Link to="/registro">Regístrate</Link>
      </p>
    </MarcoAuth>
  );
}

export default Login;
