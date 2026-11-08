/**
 * Inventario — la ruta /inventario.
 *
 * Elige la vista según el rol: el administrador gestiona productos y
 * movimientos; el empleado solo consulta. Antes las dos vistas vivían en
 * la misma página y una se quitaba del DOM al cargar; ahora solo se
 * monta la que corresponde.
 */

import { useEffect } from "react";
import { useAuth } from "../../auth/useAuth.js";
import { ROL_ADMIN } from "../../services/authService.js";
import InventarioAdmin from "./InventarioAdmin.jsx";
import InventarioEmpleado from "./InventarioEmpleado.jsx";
import sembrarInventario from "./semillaInventario.js";

function Inventario() {
  const { sesion } = useAuth();

  // Los productos de ejemplo se siembran una sola vez.
  useEffect(() => {
    sembrarInventario();
  }, []);

  return sesion.rol === ROL_ADMIN
    ? <InventarioAdmin usuario={sesion.nombre} />
    : <InventarioEmpleado />;
}

export default Inventario;
