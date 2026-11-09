/**
 * useFormulario — estado, errores y envío de un formulario.
 *
 * Valida los campos mientras se completa el formulario y mantiene
 * sus valores y errores en el estado de React.
 *
 * Las reglas son las mismas de utils/validaciones.js: reciben el valor
 * (y el resto de valores) y devuelven el mensaje o "".
 *
 *   const form = useFormulario({ correo: "" }, { correo: validaciones.correo });
 *   <input id="correo" {...form.campo("correo")} />
 *   {form.errores.correo && <p id="correo-error">{form.errores.correo}</p>}
 *
 * Cuándo avisa de un error:
 *   - al salir del campo, solo si el usuario escribió algo (pasar con
 *     Tab no regaña);
 *   - mientras escribe, solo si ese campo ya estaba marcado, para que el
 *     error se quite apenas se corrija;
 *   - al enviar, todos los campos.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { revisar, sinErrores } from "../utils/validaciones.js";

/** Quita los espacios de más, como hacía limpiarEspacios. */
function recortar(valor) {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : valor;
}

/**
 * valoresIniciales: objeto con un valor por campo.
 * reglas: objeto con la regla de cada campo (puede tener menos campos).
 * opciones.sinRecorte: campos donde los espacios cuentan (contraseñas).
 */
export function useFormulario(valoresIniciales, reglas = {}, { sinRecorte = [] } = {}) {
  const iniciales = useRef(valoresIniciales);
  const [valores, setValores] = useState(valoresIniciales);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const tocados = useRef(new Set());

  // Espejo de los valores actuales. Hace falta porque dos cambios
  // seguidos pueden ocurrir antes de que React vuelva a renderizar: si
  // cada uno partiera del valor que vio su render, el segundo borraría
  // al primero. Es el caso de rellenar varios campos de golpe.
  const ultimos = useRef(valoresIniciales);

  const conservaEspacios = nombre => sinRecorte.includes(nombre);

  /** Guarda el nuevo juego de valores y lo devuelve ya actualizado. */
  const aplicar = useCallback(siguientes => {
    ultimos.current = siguientes;
    setValores(siguientes);
    return siguientes;
  }, []);

  const validarCampo = useCallback((nombre, todos) => {
    const regla = reglas[nombre];
    return regla ? regla(todos[nombre], todos) : "";
  }, [reglas]);

  const fijarError = useCallback((nombre, mensaje) => {
    setErrores(previos => {
      if ((previos[nombre] ?? "") === mensaje) return previos;
      const copia = { ...previos };
      if (mensaje) copia[nombre] = mensaje;
      else delete copia[nombre];
      return copia;
    });
  }, []);

  /** Cambia un valor. Si el campo ya estaba marcado, lo revisa de nuevo. */
  const cambiar = useCallback((nombre, valor) => {
    tocados.current.add(nombre);
    const siguientes = aplicar({ ...ultimos.current, [nombre]: valor });
    if (errores[nombre]) fijarError(nombre, validarCampo(nombre, siguientes));
  }, [aplicar, errores, fijarError, validarCampo]);

  /** Al salir del campo: recorta y revisa, si el usuario escribió algo. */
  const alSalir = useCallback(nombre => {
    if (!tocados.current.has(nombre)) return;
    const previo = ultimos.current[nombre];
    const valor = conservaEspacios(nombre) ? previo : recortar(previo);
    const siguientes = aplicar({ ...ultimos.current, [nombre]: valor });
    fijarError(nombre, validarCampo(nombre, siguientes));
  }, [aplicar, fijarError, validarCampo, sinRecorte]);

  /** Props listas para un <input>, <select> o <textarea>. */
  const campo = useCallback(nombre => ({
    name: nombre,
    value: valores[nombre] ?? "",
    onChange: evento => cambiar(
      nombre,
      evento.target.type === "checkbox" ? evento.target.checked : evento.target.value
    ),
    onBlur: () => alSalir(nombre),
    "aria-invalid": errores[nombre] ? "true" : undefined,
    "aria-describedby": errores[nombre] ? `${nombre}-error` : undefined
  }), [valores, errores, cambiar, alSalir]);

  /**
   * Revisa todo el formulario. Devuelve si puede enviarse y los valores
   * ya recortados, para no depender de que el estado se haya actualizado.
   */
  const validarTodo = useCallback(() => {
    const listos = {};
    for (const [nombre, valor] of Object.entries(ultimos.current)) {
      listos[nombre] = conservaEspacios(nombre) ? valor : recortar(valor);
    }
    aplicar(listos);
    const encontrados = revisar(listos, reglas);
    setErrores(encontrados);
    return { ok: sinErrores(encontrados), valores: listos };
  }, [aplicar, reglas, sinRecorte]);

  /** Marca un error que no sale de las reglas, como los que vienen de los datos. */
  const marcarError = useCallback((nombre, mensaje) => fijarError(nombre, mensaje), [fijarError]);
  const limpiarError = useCallback(nombre => fijarError(nombre, ""), [fijarError]);

  /** Deja el formulario como al principio, o con los valores indicados. */
  const reiniciar = useCallback((nuevos = iniciales.current) => {
    tocados.current.clear();
    aplicar(nuevos);
    setErrores({});
  }, [aplicar]);

  /** Cambia varios valores a la vez sin pasar por los eventos. */
  const fijar = useCallback(cambios => {
    aplicar({ ...ultimos.current, ...cambios });
  }, [aplicar]);

  /**
   * Envoltorio del submit: evita el envío por defecto, revisa todo y
   * bloquea mientras la acción está en curso, para que un segundo clic
   * no guarde dos veces.
   */
  const enviar = useCallback(accion => async evento => {
    evento.preventDefault();
    if (enviando) return;
    const { ok, valores: listos } = validarTodo();
    if (!ok) return;
    setEnviando(true);
    try {
      await accion(listos);
    } finally {
      setEnviando(false);
    }
  }, [enviando, validarTodo]);

  return useMemo(() => ({
    valores,
    errores,
    enviando,
    campo,
    cambiar,
    alSalir,
    fijar,
    marcarError,
    limpiarError,
    validarTodo,
    reiniciar,
    enviar,
    hayErrores: !sinErrores(errores)
  }), [valores, errores, enviando, campo, cambiar, alSalir, fijar, marcarError, limpiarError, validarTodo, reiniciar, enviar]);
}

export default useFormulario;
