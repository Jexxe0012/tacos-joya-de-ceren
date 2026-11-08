/**
 * db — capa de datos de la aplicación, ahora como módulo ES.
 *
 * Reemplaza al objeto global DB conservando su interfaz: cada colección
 * se guarda como una lista JSON bajo su propia clave en localStorage.
 * Las claves no cambian, así los registros creados antes de la migración
 * se siguen leyendo igual.
 *
 * Añade dos cosas que la versión global no tenía:
 *   1. Suscripciones: una vista se entera de las escrituras que terminaron
 *      bien, sin tener que consultar en cada render.
 *   2. Lotes: una operación que toca varias colecciones se deshace
 *      completa si alguna escritura falla.
 *
 * Uso típico:
 *   db.create("usuarios", { nombre: "Diego", rol: "admin" });
 *   db.getAll("usuarios");
 */

// Una lectura dañada se conserva bajo esta marca antes de sobreescribirla,
// para que los datos originales puedan recuperarse a mano.
const SUFIJO_RESPALDO = "__danado";

// coleccion -> Set de funciones que quieren saber de sus escrituras.
const oyentes = new Map();

// coleccion -> causa de la última lectura inválida, para mostrarla en pantalla.
const problemas = new Map();

// Mientras un lote está abierto no se avisa a nadie: las vistas verían un
// estado a medio terminar. Los avisos salen juntos al cerrarlo.
let lotesAbiertos = 0;
const avisosPendientes = new Set();

/**
 * Genera un id único como texto.
 * crypto.randomUUID() no se repite aunque se creen muchos objetos en el
 * mismo milisegundo. Si el navegador no lo ofrece (http sin https), se
 * arma uno con la hora y un número aleatorio.
 */
function nuevoId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Compara ids como texto, para que 1 y "1" cuenten como el mismo. */
function mismoId(a, b) {
  return String(a) === String(b);
}

function notificar(coleccion) {
  if (lotesAbiertos > 0) {
    avisosPendientes.add(coleccion);
    return;
  }
  for (const oyente of oyentes.get(coleccion) ?? []) {
    try {
      oyente(coleccion);
    } catch (error) {
      console.error(`db: un oyente de "${coleccion}" falló.`, error);
    }
  }
}

/**
 * Lee la colección y la devuelve como lista.
 * Una clave que todavía no existe da una lista vacía, así el resto del
 * código nunca trabaja con undefined. Un contenido inválido tampoco rompe
 * la página: se registra la causa, se devuelve la lista vacía y el texto
 * original queda intacto en localStorage hasta que algo escriba encima.
 */
function leer(coleccion) {
  const crudo = localStorage.getItem(coleccion);
  if (!crudo) {
    problemas.delete(coleccion);
    return [];
  }
  try {
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) throw new TypeError("el contenido no es una lista");
    problemas.delete(coleccion);
    return datos;
  } catch (error) {
    problemas.set(
      coleccion,
      `Los datos guardados de "${coleccion}" no se pudieron leer (${error.message}). ` +
      "Se trabaja con la colección vacía y el contenido anterior se conserva para recuperarlo."
    );
    return [];
  }
}

/** Copia el contenido dañado a su clave de respaldo antes de perderlo. */
function resguardar(coleccion) {
  const crudo = localStorage.getItem(coleccion);
  if (crudo == null) return;
  try {
    localStorage.setItem(`${coleccion}${SUFIJO_RESPALDO}`, crudo);
  } catch (error) {
    console.warn(`db: no se pudo respaldar "${coleccion}".`, error);
  }
}

/**
 * Guarda la lista y avisa a sus oyentes.
 * localStorage puede fallar (cuota llena, modo privado). El error se
 * propaga con una causa legible: quien llamó decide qué mostrar y no
 * informa éxito sobre algo que no se guardó.
 */
function escribir(coleccion, lista) {
  if (problemas.has(coleccion)) resguardar(coleccion);
  try {
    localStorage.setItem(coleccion, JSON.stringify(lista));
  } catch (error) {
    throw new Error(
      `No se pudo guardar "${coleccion}". Libera espacio del navegador e intenta de nuevo.`,
      { cause: error }
    );
  }
  problemas.delete(coleccion);
  notificar(coleccion);
}

export const db = {
  /** Devuelve todos los objetos de una colección. */
  getAll(coleccion) {
    return leer(coleccion);
  },

  /** Busca un objeto por su id. Devuelve undefined si no existe. */
  getById(coleccion, id) {
    return leer(coleccion).find(objeto => mismoId(objeto.id, id));
  },

  /**
   * Crea un objeto con id autogenerado y devuelve el objeto guardado.
   * El id va después del spread para que un "id" que venga dentro de
   * "objeto" no pise al generado.
   */
  create(coleccion, objeto) {
    const lista = leer(coleccion);
    const nuevo = { ...objeto, id: nuevoId() };
    lista.push(nuevo);
    escribir(coleccion, lista);
    return nuevo;
  },

  /**
   * Aplica "cambios" al objeto con ese id y devuelve el resultado.
   * El id original se conserva aunque "cambios" traiga otro.
   */
  update(coleccion, id, cambios) {
    let actualizado;
    const lista = leer(coleccion).map(objeto => {
      if (!mismoId(objeto.id, id)) return objeto;
      actualizado = { ...objeto, ...cambios, id: objeto.id };
      return actualizado;
    });
    escribir(coleccion, lista);
    return actualizado;
  },

  /** Elimina el objeto con ese id. Devuelve true si existía. */
  remove(coleccion, id) {
    const lista = leer(coleccion);
    const restantes = lista.filter(objeto => !mismoId(objeto.id, id));
    escribir(coleccion, restantes);
    return restantes.length !== lista.length;
  },

  /**
   * Siembra datos iniciales solo si la colección está vacía.
   * Sembrar dos veces deja el mismo resultado: la segunda no hace nada.
   * A los objetos sin id se les asigna uno, para que getById, update y
   * remove funcionen también con los datos de prueba.
   */
  seed(coleccion, datos) {
    if (leer(coleccion).length > 0) return false;
    escribir(coleccion, datos.map(objeto => (objeto.id != null ? objeto : { ...objeto, id: nuevoId() })));
    return true;
  },

  /**
   * Avisa a "oyente" cuando una escritura de esa colección termina bien.
   * Devuelve la función que cancela la suscripción.
   */
  suscribir(coleccion, oyente) {
    if (!oyentes.has(coleccion)) oyentes.set(coleccion, new Set());
    oyentes.get(coleccion).add(oyente);
    return () => {
      const grupo = oyentes.get(coleccion);
      grupo?.delete(oyente);
      if (grupo && grupo.size === 0) oyentes.delete(coleccion);
    };
  },

  /**
   * Ejecuta una operación que toca varias colecciones.
   * Si algo falla, cada colección vuelve a su contenido anterior antes de
   * propagar el error: así no queda un inventario descontado sin su merma.
   * Los avisos a las vistas salen una sola vez, al final.
   */
  enLote(colecciones, operacion) {
    const respaldo = colecciones.map(coleccion => [coleccion, localStorage.getItem(coleccion)]);
    lotesAbiertos += 1;
    try {
      return operacion();
    } catch (error) {
      for (const [coleccion, crudo] of respaldo) {
        if (crudo === null) localStorage.removeItem(coleccion);
        else localStorage.setItem(coleccion, crudo);
      }
      colecciones.forEach(coleccion => avisosPendientes.add(coleccion));
      throw error;
    } finally {
      lotesAbiertos -= 1;
      if (lotesAbiertos === 0) {
        const avisos = [...avisosPendientes];
        avisosPendientes.clear();
        avisos.forEach(notificar);
      }
    }
  },

  /** Causa de la última lectura inválida de esa colección, o "". */
  problema(coleccion) {
    leer(coleccion);
    return problemas.get(coleccion) ?? "";
  },

  /** Clave donde quedó el contenido dañado de esa colección. */
  claveRespaldo(coleccion) {
    return `${coleccion}${SUFIJO_RESPALDO}`;
  },

  /** Expuesto para los módulos que necesitan comparar ids de la misma forma. */
  mismoId
};

export default db;
