/**
 * dialogos — una sola forma de avisarle al usuario en todo el sistema.
 *
 * Los módulos llaman a estas funciones en lugar de alert() o confirm().
 * Por dentro usan SweetAlert2, que ahora se importa desde npm en vez de
 * cargarse desde un CDN: la versión queda fijada en package-lock.json y
 * la app no depende de que el CDN responda.
 *
 * Ojo: SweetAlert2 muestra un solo diálogo a la vez. Si se abre otro
 * mientras uno sigue visible, el nuevo reemplaza al anterior. Para
 * mostrar dos seguidos, espera el primero con await.
 */

import Swal from "sweetalert2";

// Los colores salen de la paleta de main.css, así no repetimos hex aquí.
function color(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// Color del ícono para cada tipo de aviso.
const colorAviso = { success: "--color-verde", info: "--color-azul", warning: "--color-maiz" };

// En SweetAlert2, "title" se interpreta como HTML; "titleText" y "text" van
// como texto plano. Por eso usamos titleText: el mensaje puede traer datos
// que escribió el usuario (nombres de productos, empleados, etc.).

/** Éxito: se cierra solo para no interrumpir el trabajo. */
export function exito(titulo, texto = "") {
  return Swal.fire({
    icon: "success",
    iconColor: color("--color-verde"),
    titleText: titulo,
    text: texto,
    timer: 1800,
    showConfirmButton: false
  });
}

/** Error: el usuario tiene que leerlo y cerrarlo. */
export function error(titulo, texto = "") {
  return Swal.fire({
    icon: "error",
    iconColor: color("--color-rojo"),
    titleText: titulo,
    text: texto,
    confirmButtonText: "Entendido",
    confirmButtonColor: color("--color-azul")
  });
}

/**
 * Aviso corto en la esquina; no bloquea la pantalla.
 * tipo: "success" | "info" | "warning"
 */
export function aviso(texto, tipo = "success") {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: tipo,
    iconColor: color(colorAviso[tipo] ?? colorAviso.success),
    titleText: texto,
    timer: 2500,
    timerProgressBar: true,
    showConfirmButton: false
  });
}

/**
 * Confirmación antes de una acción importante. Devuelve true o false.
 * Con peligro: true el ícono y el botón van en rojo y el foco queda en
 * "Cancelar", para que un Enter de más no borre nada.
 */
export async function confirmar({ titulo, texto = "", boton = "Sí, continuar", peligro = false }) {
  const colorAccion = peligro ? color("--color-rojo") : color("--color-azul");
  const respuesta = await Swal.fire({
    icon: peligro ? "warning" : "question",
    iconColor: colorAccion,
    titleText: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: boton,
    cancelButtonText: "Cancelar",
    confirmButtonColor: colorAccion,
    reverseButtons: true,
    focusCancel: peligro
  });
  return respuesta.isConfirmed;
}

/** Cierra el diálogo abierto, por ejemplo al desmontar la vista. */
export function cerrar() {
  Swal.close();
}

export default { exito, error, aviso, confirmar, cerrar };
