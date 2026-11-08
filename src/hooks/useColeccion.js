/**
 * useColeccion — los datos de una colección, siempre al día.
 *
 * Es el reemplazo de los "render()" que cada módulo clásico llamaba a
 * mano después de guardar. La vista pide la colección y se vuelve a
 * renderizar cuando algo escribe en ella, sin importar desde dónde:
 *
 *   - desde la misma pantalla, por las suscripciones de db;
 *   - desde otra pestaña abierta, por el evento storage del navegador.
 *
 *   const { registros, crear, actualizar, eliminar } = useColeccion("recetas");
 *
 * Devuelve también "problema": la causa cuando los datos guardados no se
 * pudieron leer, para avisarlo en pantalla sin borrar nada.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../services/storage.js";

function leerEstado(nombre) {
  return { registros: db.getAll(nombre), problema: db.problema(nombre) };
}

export function useColeccion(nombre) {
  const [estado, setEstado] = useState(() => leerEstado(nombre));

  const recargar = useCallback(() => {
    setEstado(leerEstado(nombre));
  }, [nombre]);

  useEffect(() => {
    // Al cambiar de colección el estado anterior ya no sirve.
    recargar();

    const cancelar = db.suscribir(nombre, recargar);

    // El evento storage solo llega desde otras pestañas; las escrituras
    // de esta pestaña las avisa db.
    const alCambiarOtraPestana = evento => {
      if (evento.key === nombre || evento.key === null) recargar();
    };
    window.addEventListener("storage", alCambiarOtraPestana);

    return () => {
      cancelar();
      window.removeEventListener("storage", alCambiarOtraPestana);
    };
  }, [nombre, recargar]);

  // Las operaciones devuelven lo que devuelve db y propagan el error si
  // la escritura falla: quien llama decide qué mostrar y no informa éxito
  // sobre algo que no se guardó.
  const crear = useCallback(objeto => db.create(nombre, objeto), [nombre]);
  const actualizar = useCallback((id, cambios) => db.update(nombre, id, cambios), [nombre]);
  const eliminar = useCallback(id => db.remove(nombre, id), [nombre]);

  return useMemo(() => ({
    registros: estado.registros,
    problema: estado.problema,
    recargar,
    crear,
    actualizar,
    eliminar
  }), [estado, recargar, crear, actualizar, eliminar]);
}

export default useColeccion;
