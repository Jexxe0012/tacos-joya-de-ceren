/*
 * UI — una sola forma de avisarle al usuario en todo el sistema.
 *
 * Todos los módulos llaman a estas funciones en lugar de alert() o confirm().
 * Por dentro usan SweetAlert2, que se carga desde el CDN antes de este archivo.
 * Si el CDN no cargó, se muestra un aviso simple dentro de la página para que
 * el usuario nunca se quede sin respuesta.
 *
 * Ojo: SweetAlert2 muestra un solo diálogo a la vez. Si se abre otro mientras
 * uno sigue visible, el nuevo reemplaza al anterior. Para mostrar dos seguidos,
 * espera el primero con await.
 */
const UI = (() => {
  const hayLibreria = () => typeof Swal !== "undefined";

  // Los colores salen de la paleta de main.css, así no repetimos hex aquí.
  function color(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  // Color del ícono para cada tipo de aviso.
  const colorAviso = { success: "--color-verde", info: "--color-azul", warning: "--color-maiz" };

  // Respaldo sin librería: una franja fija arriba de la página que se quita sola.
  // Igual que SweetAlert2, se muestra una a la vez para que no se encimen.
  let franjaActual = null;

  function respaldo(texto, esError = false) {
    if (franjaActual) franjaActual.remove();
    const caja = document.createElement("div");
    franjaActual = caja;
    caja.setAttribute("role", "alert");
    caja.textContent = texto;
    Object.assign(caja.style, {
      position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)",
      zIndex: "2000", padding: "10px 16px", borderRadius: "8px", maxWidth: "90vw",
      background: esError ? color("--color-rojo") : color("--color-azul"),
      color: color("--color-crema"), boxShadow: "0 4px 12px rgba(0,0,0,.2)"
    });
    document.body.append(caja);
    setTimeout(() => caja.remove(), 4000);
    return Promise.resolve();
  }

  // En SweetAlert2, "title" se interpreta como HTML; "titleText" y "text" van
  // como texto plano. Por eso usamos titleText: el mensaje puede traer datos
  // que escribió el usuario (nombres de productos, empleados, etc.).

  // Éxito: se cierra solo para no interrumpir el trabajo.
  function exito(titulo, texto = "") {
    if (!hayLibreria()) return respaldo(titulo);
    return Swal.fire({
      icon: "success", iconColor: color("--color-verde"),
      titleText: titulo, text: texto,
      timer: 1800, showConfirmButton: false
    });
  }

  // Error: el usuario tiene que leerlo y cerrarlo.
  function error(titulo, texto = "") {
    if (!hayLibreria()) return respaldo(`${titulo} ${texto}`.trim(), true);
    return Swal.fire({
      icon: "error", iconColor: color("--color-rojo"),
      titleText: titulo, text: texto,
      confirmButtonText: "Entendido", confirmButtonColor: color("--color-azul")
    });
  }

  // Aviso corto en la esquina; no bloquea la pantalla.
  // tipo: "success" | "info" | "warning"
  function aviso(texto, tipo = "success") {
    if (!hayLibreria()) return respaldo(texto, tipo === "warning");
    return Swal.fire({
      toast: true, position: "top-end",
      icon: tipo, iconColor: color(colorAviso[tipo]), titleText: texto,
      timer: 2500, timerProgressBar: true, showConfirmButton: false
    });
  }

  // Confirmación antes de una acción importante. Devuelve true o false.
  // Con peligro: true el ícono y el botón van en rojo y el foco queda en "Cancelar".
  async function confirmar({ titulo, texto = "", boton = "Sí, continuar", peligro = false }) {
    // Sin librería no podemos preguntar; por seguridad no se hace la acción.
    if (!hayLibreria()) {
      respaldo("No se pudo mostrar la confirmación. Recarga la página e intenta de nuevo.", true);
      return false;
    }
    const colorAccion = peligro ? color("--color-rojo") : color("--color-azul");
    const respuesta = await Swal.fire({
      icon: peligro ? "warning" : "question", iconColor: colorAccion,
      titleText: titulo, text: texto,
      showCancelButton: true,
      confirmButtonText: boton, cancelButtonText: "Cancelar",
      confirmButtonColor: colorAccion,
      reverseButtons: true, focusCancel: peligro
    });
    return respuesta.isConfirmed;
  }

  // Fecha de hoy en hora local, con formato AAAA-MM-DD.
  // No usamos toISOString() porque trabaja en UTC: en El Salvador,
  // después de las 6:00 p.m. devolvería la fecha de mañana.
  function fechaHoy() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  return { exito, error, aviso, confirmar, fechaHoy };
})();
