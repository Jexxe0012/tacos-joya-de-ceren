/*
 * Valida — reglas de validación y marcado de campos para todos los formularios.
 *
 * Las reglas (texto, numero, fecha) solo revisan un valor: devuelven "" si está
 * bien o el mensaje que verá el usuario. Las demás funciones muestran ese
 * mensaje junto al campo con las clases de Bootstrap (.is-invalid y
 * .invalid-feedback). Necesita ui.js cargado antes, porque usa UI.fechaHoy().
 */
const Valida = (() => {
  // ---------- Reglas ----------

  // Sin "min" el texto es opcional; con min 1 o más, es obligatorio.
  // "mensaje" es lo que se muestra cuando el texto no cumple el "patron".
  function texto(valor, { min = 0, max = Infinity, patron, mensaje } = {}) {
    const limpio = String(valor ?? "").trim();
    if (!limpio) return min > 0 ? "Este campo es obligatorio." : "";
    if (limpio.length < min) return `Escribe al menos ${min} caracteres.`;
    if (limpio.length > max) return `Escribe como máximo ${max} caracteres.`;
    if (patron && !patron.test(limpio)) return mensaje || "El formato no es válido.";
    return "";
  }

  // min y max incluyen el límite: para "mayor que 0" se usa min: 0.01.
  function numero(valor, { min, max, entero = false } = {}) {
    const limpio = String(valor ?? "").trim();
    const n = Number(limpio);
    // Number("") da 0, por eso el vacío se revisa aparte.
    if (limpio === "" || !Number.isFinite(n)) return "Ingresa un número.";
    if (entero && !Number.isInteger(n)) return "Ingresa un número entero, sin decimales.";
    if (min !== undefined && n < min) return `El valor mínimo es ${min}.`;
    if (max !== undefined && n > max) return `El valor máximo es ${max}.`;
    return "";
  }

  // Las fechas llegan como texto "AAAA-MM-DD". En ese formato, comparar los
  // textos da el mismo orden que comparar las fechas, sin líos de zona horaria.
  function fecha(valor, { noFutura = false, noPasada = false, maxDiasAtras } = {}) {
    if (!valor) return "Elige una fecha.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "La fecha no es válida.";
    const hoy = UI.fechaHoy();
    if (noFutura && valor > hoy) return "La fecha no puede ser posterior a hoy.";
    if (noPasada && valor < hoy) return "La fecha no puede ser anterior a hoy.";
    if (maxDiasAtras !== undefined && valor < haceDias(maxDiasAtras)) {
      return `La fecha no puede ser de hace más de ${maxDiasAtras} días.`;
    }
    return "";
  }

  // Fecha de hace "dias" días, en hora local y con el mismo formato que UI.fechaHoy().
  function haceDias(dias) {
    const d = new Date();
    d.setDate(d.getDate() - dias); // setDate ajusta solo el cambio de mes y de año
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  // ---------- Mensajes junto al campo ----------

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

  function marcar(campo, mensaje) {
    const caja = buscarCaja(campo) || crearCaja(campo);
    caja.textContent = mensaje;
    campo.classList.add("is-invalid");
    campo.setAttribute("aria-invalid", "true");
  }

  function limpiar(campo) {
    const caja = buscarCaja(campo);
    if (caja) caja.textContent = "";
    campo.classList.remove("is-invalid");
    campo.removeAttribute("aria-invalid");
  }

  // ---------- Validación mientras el usuario llena el formulario ----------

  // Quita los espacios de más. En contraseñas no: un espacio puede ser parte de la clave.
  function limpiarEspacios(campo) {
    if (campo.tagName === "TEXTAREA") {
      campo.value = campo.value.trim();
    } else if (["text", "search", "email"].includes(campo.type)) {
      campo.value = campo.value.trim().replace(/\s+/g, " ");
    }
  }

  // reglas: { idDelCampo: (valor, campo) => "" o mensaje }
  // Devuelve validarTodo(), para usarla al enviar el formulario.
  function enVivo(form, reglas) {
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

  // Evita el doble envío: desactiva el botón y devuelve la función que lo reactiva.
  function bloquearEnvio(boton) {
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
    return () => {
      boton.disabled = false;
      boton.removeAttribute("aria-busy");
    };
  }

  return { texto, numero, fecha, marcar, limpiar, enVivo, bloquearEnvio };
})();
