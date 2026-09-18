/**
 * Storage — capa de datos de la app.
 * 
 * Envuelve localStorage con una interfaz cómoda de colecciones.
 * Cada colección se guarda como un arreglo JSON bajo su propia
 * clave en localStorage. Ejemplo: la colección "usuarios" vive
 * bajo la clave "usuarios" como un string JSON.
 * 
 * Uso típico:
 *   Storage.create("usuarios", { nombre: "Diego", rol: "admin" });
 *   Storage.getAll("usuarios");
 */
const Storage = {

  // ----- Helpers internos (prefijo _ por convención "privado") -----

  /**
   * Lee la colección desde localStorage y la devuelve como arreglo.
   * Si la clave no existe todavía, devuelve un arreglo vacío
   * (así el resto del código nunca se rompe con "undefined").
   */
  _read(coleccion) {
    const raw = localStorage.getItem(coleccion);
    return raw ? JSON.parse(raw) : [];
  },

  /**
   * Guarda un arreglo en localStorage bajo la clave de la colección.
   * Convierte el arreglo a string JSON antes de guardar.
   */
  _write(coleccion, arreglo) {
    localStorage.setItem(coleccion, JSON.stringify(arreglo));
  },

  // ----- API pública -----

  /**
   * Devuelve todos los objetos de una colección.
   */
  getAll(coleccion) {
    return this._read(coleccion);
  },

  /**
   * Busca un objeto por su id dentro de la colección.
   * .find() recorre el arreglo y devuelve el primer elemento
   * que cumple la condición, o undefined si no encuentra nada.
   */
  getById(coleccion, id) {
    return this._read(coleccion).find(obj => obj.id === id);
  },

  /**
   * Crea un objeto nuevo con id autogenerado y lo guarda.
   * Devuelve el objeto ya con su id asignado.
   * 
   * Date.now() da los milisegundos desde 1970 — sirve como id
   * único y ordenado por fecha de creación. No es la mejor
   * técnica en el mundo real (UUID sería), pero para esta app
   * simulada alcanza y sobra.
   */
  create(coleccion, objeto) {
    const arreglo = this._read(coleccion);
    const nuevo = { id: Date.now(), ...objeto };
    arreglo.push(nuevo);
    this._write(coleccion, arreglo);
    return nuevo;
  },

  /**
   * Actualiza un objeto existente aplicándole "cambios".
   * Usa .map() para recorrer el arreglo y reemplazar solo
   * el que coincide con el id. El spread ...obj, ...cambios
   * mezcla las propiedades: si "cambios" trae { nombre: "X" },
   * solo sobreescribe "nombre" y deja el resto intacto.
   */
  update(coleccion, id, cambios) {
    const arreglo = this._read(coleccion).map(obj =>
      obj.id === id ? { ...obj, ...cambios } : obj
    );
    this._write(coleccion, arreglo);
  },

  /**
   * Elimina el objeto con ese id.
   * .filter() devuelve un arreglo nuevo que contiene solo
   * los que cumplen la condición. Al pedir "distinto al id",
   * el elemento buscado queda afuera.
   */
  remove(coleccion, id) {
    const arreglo = this._read(coleccion).filter(obj => obj.id !== id);
    this._write(coleccion, arreglo);
  },

  /**
   * "Siembra" datos iniciales en una colección SI está vacía.
   * Útil para arrancar la app con usuarios de prueba sin borrar
   * lo que el usuario ya haya creado.
   */
  seed(coleccion, datos) {
    if (this._read(coleccion).length === 0) {
      this._write(coleccion, datos);
    }
  }
};