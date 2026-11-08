/**
 * validacionDom — adaptador temporal de la validación por campos del DOM.
 *
 * Es el pedazo de js/validacion.js que marca los campos a mano con las
 * clases de Bootstrap. Vive aquí, y no en utils/validaciones.js, porque
 * las pantallas ya migradas no lo necesitan: React guarda sus errores en
 * el estado y los pinta.
 *
 * Sigue existiendo para los módulos que todavía no se migraron y para los
 * componentes que Josué entregó usando Valida.enVivo. Se retira cuando el
 * último formulario deje de depender de él.
 */

import { fecha as reglaFecha, numero as reglaNumero, texto as reglaTexto } from "../utils/validaciones.js";

// La caja del mensaje va justo después del campo. En un .input-group va al
// final del grupo, para no partir el campo y su etiqueta ("kg", "$").
function buscarCaja(campo) {
  const grupo = campo.closest(".input-group");
  if (grupo) return grupo.querySelector(":scope > .invalid-feedback");
  const siguiente = campo.nextElementSibling;
  return siguiente && siguiente.classList.contains("invalid-feedback") ? siguiente : null;
}

function crearCaja(campo) {
  const caja = document.createElement("div");
  caja.className = "invalid-feedback";
  // Así el lector de pantalla lee el mensaje al entrar al campo.
  if (campo.id && !campo.hasAttribute("aria-describedby")) {
    caja.id = `${campo.id}-error`;
    campo.setAttribute("aria-describedby", caja.id);
  }
  const grupo = campo.closest(".input-group");
  if (grupo) {
    grupo.classList.add("has-validation"); // Bootstrap: mantiene las esquinas redondeadas
    grupo.append(caja);
  } else {
    campo.after(caja);
  }
  return caja;
}

export function marcar(campo, mensaje) {
  const caja = buscarCaja(campo) || crearCaja(campo);
  caja.textContent = mensaje;
  campo.classList.add("is-invalid");
  campo.setAttribute("aria-invalid", "true");
}

export function limpiar(campo) {
  const caja = buscarCaja(campo);
  if (caja) caja.textContent = "";
  campo.classList.remove("is-invalid");
  campo.removeAttribute("aria-invalid");
}

// Quita los espacios de más. En contraseñas no: un espacio puede ser parte de la clave.
function limpiarEspacios(campo) {
  if (campo.tagName === "TEXTAREA") {
    campo.value = campo.value.trim();
  } else if (["text", "search", "email"].includes(campo.type)) {
    campo.value = campo.value.trim().replace(/\s+/g, " ");
  }
}

/**
 * reglas: { idDelCampo: (valor, campo) => "" o mensaje }
 * Devuelve validarTodo(), para usarla al enviar el formulario.
 */
export function enVivo(form, reglas) {
  const pares = [];
  for (const [id, regla] of Object.entries(reglas)) {
    const campo = document.getElementById(id);
    if (campo) pares.push([campo, regla]);
    else console.warn(`Valida.enVivo: no existe el campo #${id}`);
  }

  // Campos en los que el usuario ya escribió algo.
  const tocados = new Set();

  function validarCampo(campo, regla) {
    const mensaje = regla(campo.value, campo);
    if (mensaje) marcar(campo, mensaje);
    else limpiar(campo);
    return !mensaje;
  }

  for (const [campo, regla] of pares) {
    // Al escribir: solo si ya tenía error, para que el rojo se quite apenas se corrija.
    campo.addEventListener("input", () => {
      tocados.add(campo);
      if (campo.classList.contains("is-invalid")) validarCampo(campo, regla);
    });
    // Al salir: solo si el usuario escribió algo. Pasar con Tab no regaña;
    // los campos vacíos obligatorios se revisan al enviar.
    campo.addEventListener("blur", () => {
      if (!tocados.has(campo)) return;
      limpiarEspacios(campo);
      validarCampo(campo, regla);
    });
  }

  // Al limpiar el formulario (form.reset()) se borran también los errores.
  form.addEventListener("reset", () => {
    tocados.clear();
    pares.forEach(([campo]) => limpiar(campo));
  });

  // Revisa todos los campos, marca los errores y pone el foco en el primero.
  return function validarTodo() {
    let primerError = null;
    for (const [campo, regla] of pares) {
      limpiarEspacios(campo);
      if (!validarCampo(campo, regla) && !primerError) primerError = campo;
    }
    if (primerError) primerError.focus();
    return !primerError;
  };
}

/** Evita el doble envío: desactiva el botón y devuelve la función que lo reactiva. */
export function bloquearEnvio(boton) {
  boton.disabled = true;
  boton.setAttribute("aria-busy", "true");
  return () => {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
  };
}

/** El mismo objeto Valida que esperaban los módulos clásicos. */
export const Valida = {
  texto: reglaTexto,
  numero: reglaNumero,
  fecha: reglaFecha,
  marcar,
  limpiar,
  enVivo,
  bloquearEnvio
};

export default Valida;
