/**
 * Registro — crear una cuenta.
 *
 * Conserva las reglas del prototipo: nombre de 3 a 60 letras, correo con
 * formato válido y no repetido, contraseña de 8 caracteres con letra y
 * número, confirmación que no regaña mientras todavía puede llegar a
 * coincidir, y la clave de demostración cuando el perfil es
 * administrador.
 *
 * Al crear la cuenta no se inicia sesión: se vuelve al login con el
 * correo y el perfil ya puestos, para entrar con la contraseña recién
 * creada.
 */

import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { useFormulario } from "../../hooks/useFormulario.js";
import { ErrorAcceso, ROL_ADMIN, correoRegistrado } from "../../services/authService.js";
import { exito } from "../../services/dialogos.js";
import {
  confirmacion,
  contrasenaNueva,
  correo as reglaCorreo,
  nombrePersona,
  texto
} from "../../utils/validaciones.js";
import MarcoAuth from "./MarcoAuth.jsx";
import SelectorRol from "./SelectorRol.jsx";

const VALORES_INICIALES = {
  nombre: "",
  correo: "",
  contrasena: "",
  repetida: "",
  rol: "",
  claveAdmin: ""
};

/**
 * En el correo, primero el formato; si está bien, se revisa que no esté
 * ya registrado. Así el error aparece al salir del campo y no al enviar.
 * La clave de administrador solo se pide cuando se eligió ese perfil.
 */
const REGLAS = {
  nombre: nombrePersona,
  correo: valor => reglaCorreo(valor) || (correoRegistrado(valor) ? "Ya existe una cuenta con ese correo." : ""),
  contrasena: contrasenaNueva,
  repetida: (valor, valores) => confirmacion(valor, valores.contrasena),
  rol: valor => (valor ? "" : "Selecciona un perfil (Admin o Empleado)."),
  claveAdmin: (valor, valores) => (valores.rol === ROL_ADMIN ? texto(valor, { min: 1 }) : "")
};

function Registro() {
  const { registrarUsuario } = useAuth();
  const navegar = useNavigate();
  const form = useFormulario(VALORES_INICIALES, REGLAS, { sinRecorte: ["contrasena", "repetida"] });

  const campos = {
    nombre: useRef(null),
    correo: useRef(null),
    contrasena: useRef(null),
    repetida: useRef(null),
    rol: useRef(null),
    claveAdmin: useRef(null)
  };

  const primerCampo = campos.nombre;
  useEffect(() => {
    primerCampo.current?.focus();
  }, [primerCampo]);

  const pideClave = form.valores.rol === ROL_ADMIN;

  /**
   * Al cambiar de perfil: si deja de pedirse la clave, se vacía y se
   * limpia su error, para que no quede algo escrito que ya no se usa.
   */
  function cambiarRol(valor) {
    form.cambiar("rol", valor);
    if (valor !== ROL_ADMIN) {
      form.cambiar("claveAdmin", "");
      form.limpiarError("claveAdmin");
    }
  }

  /**
   * La confirmación se revisa mientras se escribe. Mientras lo escrito
   * todavía puede llegar a ser la contraseña (es su inicio) no se marca
   * error: así no regaña desde la primera letra.
   */
  function cambiarRepetida(valor) {
    form.cambiar("repetida", valor);
    const mensaje = confirmacion(valor, form.valores.contrasena, { parcial: true });
    if (mensaje) form.marcarError("repetida", mensaje);
    else form.limpiarError("repetida");
  }

  const alEnviar = form.enviar(async valores => {
    try {
      registrarUsuario({
        nombre: valores.nombre,
        correo: valores.correo,
        contrasena: valores.contrasena,
        rol: valores.rol,
        claveAdmin: valores.claveAdmin
      });
    } catch (fallo) {
      if (!(fallo instanceof ErrorAcceso)) throw fallo;
      form.marcarError(fallo.campo || "correo", fallo.message);
      campos[fallo.campo]?.current?.focus();
      return;
    }

    await exito("Cuenta creada", "Ya puedes iniciar sesión.");
    // El login recibe el correo y el perfil para que solo falte la clave.
    navegar("/login", {
      replace: true,
      state: { correo: valores.correo.toLowerCase(), rol: valores.rol }
    });
  });

  return (
    <MarcoAuth
      tituloPagina="Crear cuenta"
      titulo="Crear cuenta"
      subtitulo="Completa tus datos para registrarte"
    >
      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="nombre">Nombre completo</label>
        <input type="text" id="nombre" ref={campos.nombre} autoComplete="name" maxLength={60}
          {...form.campo("nombre")} />
        {form.errores.nombre && (
          <p className="campo-error" id="nombre-error" role="alert">{form.errores.nombre}</p>
        )}

        <label htmlFor="correo">Correo electrónico</label>
        <input type="email" id="correo" ref={campos.correo} autoComplete="email"
          {...form.campo("correo")} />
        {form.errores.correo && (
          <p className="campo-error" id="correo-error" role="alert">{form.errores.correo}</p>
        )}

        <label htmlFor="contrasena">Contraseña</label>
        <input type="password" id="contrasena" ref={campos.contrasena} autoComplete="new-password"
          {...form.campo("contrasena")} />
        {form.errores.contrasena && (
          <p className="campo-error" id="contrasena-error" role="alert">{form.errores.contrasena}</p>
        )}

        <label htmlFor="repetida">Confirmar contraseña</label>
        <input type="password" id="repetida" ref={campos.repetida} autoComplete="new-password"
          {...form.campo("repetida")}
          onChange={evento => cambiarRepetida(evento.target.value)} />
        {form.errores.repetida && (
          <p className="campo-error" id="repetida-error" role="alert">{form.errores.repetida}</p>
        )}

        <div ref={campos.rol} tabIndex={-1}>
          <SelectorRol
            nombre="reg-role"
            valor={form.valores.rol}
            alCambiar={cambiarRol}
            error={form.errores.rol}
            idError="rol-error"
          />
        </div>

        {pideClave && (
          <div>
            <label htmlFor="claveAdmin">Clave de administrador</label>
            <input type="password" id="claveAdmin" ref={campos.claveAdmin} autoComplete="off"
              {...form.campo("claveAdmin")} />
            {form.errores.claveAdmin && (
              <p className="campo-error" id="claveAdmin-error" role="alert">{form.errores.claveAdmin}</p>
            )}
          </div>
        )}

        <button type="submit" disabled={form.enviando}>Crear cuenta</button>
      </form>

      <p className="toggle-link">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login">Inicia sesión</Link>
      </p>
    </MarcoAuth>
  );
}

export default Registro;
