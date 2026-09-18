/**
 * DB — capa de datos de la app.
 *
 * Envuelve localStorage con una interfaz cómoda de colecciones.
 * Cada colección se guarda como un arreglo JSON bajo su propia
 * clave en localStorage. Ejemplo: la colección "usuarios" vive
 * bajo la clave "usuarios" como un string JSON.
 *
 * Se llama DB y no Storage porque "Storage" ya existe en el
 * navegador (es el tipo de localStorage); declararlo de nuevo
 * lo taparía en toda la página.
 *
 * Uso típico:
 *   DB.create("usuarios", { nombre: "Diego", rol: "admin" });
 *   DB.getAll("usuarios");
 */
const DB = {

  // ----- Helpers internos (prefijo _ por convención "privado") -----

  /**
   * Lee la colección desde localStorage y la devuelve como arreglo.
   * Si la clave no existe todavía, devuelve un arreglo vacío
   * (así el resto del código nunca se rompe con "undefined").
   *
   * El try/catch cubre el caso de datos dañados (texto que no es
   * JSON válido, o algo que no es un arreglo): en vez de romper
   * toda la página, avisa en consola y arranca con la colección vacía.
   */
  _read(coleccion) {
    const raw = localStorage.getItem(coleccion);
    if (!raw) return [];
    try {
      const datos = JSON.parse(raw);
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      console.warn(`DB: la colección "${coleccion}" tiene datos inválidos, se usa vacía.`, error);
      return [];
    }
  },

  /**
   * Guarda un arreglo en localStorage bajo la clave de la colección.
   * Convierte el arreglo a string JSON antes de guardar.
   */
  _write(coleccion, arreglo) {
    localStorage.setItem(coleccion, JSON.stringify(arreglo));
  },

  /**
   * Genera un id único como string.
   * crypto.randomUUID() da un UUID que no se repite aunque se creen
   * muchos objetos en el mismo milisegundo (Date.now() sí se repetía).
   * Si el navegador no lo ofrece (páginas servidas por http sin
   * https), se arma uno con la hora + un número aleatorio.
   */
  _newId() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  },

  /**
   * Compara ids como texto, para que 1 y "1" cuenten como el mismo.
   * Los ids que llegan de formularios o de la URL siempre son strings.
   */
  _sameId(a, b) {
    return String(a) === String(b);
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
    return this._read(coleccion).find(obj => this._sameId(obj.id, id));
  },

  /**
   * Crea un objeto nuevo con id autogenerado y lo guarda.
   * Devuelve el objeto ya con su id asignado.
   *
   * El id va DESPUÉS del spread para que un "id" que venga
   * dentro de "objeto" no pise al generado.
   */
  create(coleccion, objeto) {
    const arreglo = this._read(coleccion);
    const nuevo = { ...objeto, id: this._newId() };
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
   * El id original se conserva aunque "cambios" traiga otro.
   */
  update(coleccion, id, cambios) {
    const arreglo = this._read(coleccion).map(obj =>
      this._sameId(obj.id, id) ? { ...obj, ...cambios, id: obj.id } : obj
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
    const arreglo = this._read(coleccion).filter(obj => !this._sameId(obj.id, id));
    this._write(coleccion, arreglo);
  },

  /**
   * "Siembra" datos iniciales en una colección SI está vacía.
   * Útil para arrancar la app con usuarios de prueba sin borrar
   * lo que el usuario ya haya creado.
   * A los objetos que no traen id se les asigna uno, para que
   * getById/update/remove funcionen también con los datos de prueba.
   */
  seed(coleccion, datos) {
    if (this._read(coleccion).length === 0) {
      const conIds = datos.map(obj => (obj.id != null ? obj : { ...obj, id: this._newId() }));
      this._write(coleccion, conIds);
    }
  }
};
