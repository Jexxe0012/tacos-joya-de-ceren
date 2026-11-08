/**
 * SelectorRol — las dos tarjetas de perfil del login y del registro.
 *
 * El radio sigue existiendo para la lógica y para el teclado; css/login.css
 * lo oculta y pinta la tarjeta. El mismo componente sirve en los dos
 * formularios cambiando "nombre", porque los dos radios no pueden
 * compartir el atributo name.
 */

import { ROL_ADMIN, ROL_EMPLEADO } from "../../services/authService.js";

const PERFILES = [
  { valor: ROL_ADMIN, titulo: "Dueño / Admin", descripcion: "Acceso completo" },
  { valor: ROL_EMPLEADO, titulo: "Empleado", descripcion: "Operación" }
];

function SelectorRol({ nombre, valor, alCambiar, error, idError }) {
  return (
    <fieldset className={error ? "role-picker is-invalid" : "role-picker"}>
      <legend>Selecciona tu perfil</legend>

      <div className="role-cards-wrapper">
        {PERFILES.map(perfil => (
          <label className="role-card" key={perfil.valor}>
            <input
              type="radio"
              name={nombre}
              value={perfil.valor}
              checked={valor === perfil.valor}
              onChange={() => alCambiar(perfil.valor)}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? idError : undefined}
            />
            <span className="role-title">{perfil.titulo}</span>
            <span className="role-desc">{perfil.descripcion}</span>
          </label>
        ))}
      </div>

      {error && <p className="campo-error" id={idError} role="alert">{error}</p>}
    </fieldset>
  );
}

export default SelectorRol;
