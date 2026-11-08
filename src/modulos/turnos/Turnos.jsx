/**
 * Turnos — la ruta /turnos.
 *
 * El administrador gestiona el calendario y responde solicitudes; el
 * empleado consulta sus turnos, registra mermas rápidas y envía
 * solicitudes. En su menú esta pantalla se llama "Mis turnos" y es su
 * inicio de sesión.
 */

import { useEffect } from "react";
import { useAuth } from "../../auth/useAuth.js";
import { ROL_ADMIN } from "../../services/authService.js";
import TurnosAdmin from "./TurnosAdmin.jsx";
import TurnosEmpleado from "./TurnosEmpleado.jsx";
import sembrarTurnos from "./semillaTurnos.js";

function Turnos() {
  const { sesion } = useAuth();

  // Los turnos de ejemplo se siembran una sola vez, para el primer
  // empleado registrado.
  useEffect(() => {
    sembrarTurnos();
  }, []);

  return sesion.rol === ROL_ADMIN ? <TurnosAdmin /> : <TurnosEmpleado sesion={sesion} />;
}

export default Turnos;
