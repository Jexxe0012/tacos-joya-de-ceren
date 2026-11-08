/**
 * inventarioService — catálogos, estados y operaciones del inventario.
 *
 * Trabaja con dos colecciones, con las mismas claves de siempre:
 *   - "inventario":  los productos con su existencia, mínimo y costo.
 *   - "movimientos": el historial de entradas, salidas y ajustes.
 *
 * Cada cambio de existencia pasa por aplicarMovimiento, que guarda el
 * producto y su movimiento en un solo lote: si una de las dos escrituras
 * falla, ninguna queda hecha. Así no se descuenta una existencia sin su
 * registro en el historial.
 */

import { db } from "../../services/storage.js";
import { aTextoLocal, enDias, fechaHoyLocal } from "../../utils/fechas.js";

export const COLECCION = "inventario";
export const COLECCION_MOVIMIENTOS = "movimientos";

/** Secciones del inventario. Alimentan el select del formulario y los chips. */
export const CATEGORIAS = [
  "Carnes",
  "Verduras y frutas",
  "Lácteos",
  "Abarrotes",
  "Salsas y especias",
  "Bebidas",
  "Desechables"
];

/** Unidades de medida típicas de una cocina. */
export const UNIDADES = ["kg", "lb", "g", "L", "ml", "unidad", "docena", "caja", "bolsa"];

/** Unidades que se cuentan por pieza: no aceptan decimales. */
export const UNIDADES_ENTERAS = ["unidad", "docena", "caja", "bolsa"];

/** Motivos posibles según el tipo de movimiento. */
export const MOTIVOS = {
  entrada: ["Compra a proveedor", "Devolución de cocina", "Traslado desde otra sucursal"],
  salida: ["Consumo en cocina", "Merma o desperdicio", "Cortesía", "Traslado a otra sucursal"],
  ajuste: ["Conteo físico", "Corrección de registro"]
};

export const ETIQUETAS_ESTADO = {
  agotado: "Agotado",
  critico: "Bajo el mínimo",
  bajo: "Por reponer",
  ok: "Suficiente"
};

export const ETIQUETAS_MOVIMIENTO = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" };
export const SIGNOS_MOVIMIENTO = { entrada: "+", salida: "−", ajuste: "=" };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Margen sobre el mínimo para avisar "se va a acabar pronto" antes de
 * llegar al mínimo real. 1.25 = 25 % por encima del mínimo.
 */
export const MARGEN_AVISO = 1.25;

/** Días de anticipación con los que se avisa una caducidad próxima. */
export const DIAS_AVISO_CADUCIDAD = 7;

// ---------- Formato ----------

/** Cantidad sin decimales inútiles: 18 en vez de 18.00, pero 2.5 se conserva. */
export function formatoCantidad(valor) {
  return String(Number(Number(valor).toFixed(2)));
}

export function formatoDinero(valor) {
  return `$${Number(valor).toFixed(2)}`;
}

/** Fecha corta legible. Por ejemplo: "24 sep". */
export function formatoFechaCorta(texto) {
  if (!texto) return "";
  const fecha = new Date(`${texto}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
}

/** Fecha y hora de un movimiento. Por ejemplo: "24 sep · 15:40". */
export function formatoFechaHora(iso) {
  const fecha = new Date(iso);
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${fecha.getHours()}:${minutos}`;
}

/** Fecha de hoy desplazada N días, en el formato que guardan los productos. */
export function fechaRelativa(dias) {
  return dias >= 0 ? enDias(dias) : aTextoLocal(desplazar(dias));
}

function desplazar(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

// ---------- Estados ----------

/** Días que faltan para la caducidad. Negativo si venció, null si no tiene fecha. */
export function diasParaVencer(producto) {
  if (!producto.caducidad) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${producto.caducidad}T00:00:00`);
  return Math.round((fecha - hoy) / 86400000);
}

/**
 * Estado de existencias:
 *   agotado — no queda nada
 *   critico — igual o por debajo del mínimo: hay que comprar ya
 *   bajo    — cerca del mínimo: conviene comprar pronto
 *   ok      — existencia suficiente
 */
export function estadoStock(producto) {
  const cantidad = Number(producto.cantidad);
  const minimo = Number(producto.stockMinimo);
  if (cantidad <= 0) return "agotado";
  if (cantidad <= minimo) return "critico";
  if (cantidad <= minimo * MARGEN_AVISO) return "bajo";
  return "ok";
}

/** Estado de caducidad: "vencido", "porVencer" o null. */
export function estadoCaducidad(producto) {
  const dias = diasParaVencer(producto);
  if (dias === null) return null;
  if (dias < 0) return "vencido";
  if (dias <= DIAS_AVISO_CADUCIDAD) return "porVencer";
  return null;
}

/**
 * Número de urgencia para ordenar: mientras más bajo, más urgente.
 * Combina existencias y caducidad para que lo vencido no quede al final.
 */
export function prioridad(producto) {
  const stock = { agotado: 0, critico: 1, bajo: 2, ok: 4 }[estadoStock(producto)];
  const caducidad = { vencido: 0, porVencer: 3 }[estadoCaducidad(producto)] ?? 5;
  return Math.min(stock, caducidad);
}

/** Valor en dinero de lo que hay de ese producto en bodega. */
export function valorProducto(producto) {
  return Number(producto.cantidad) * Number(producto.costoUnitario);
}

/** Frase de la alerta: "Quedan 6 kg, el mínimo es 8 · Vence en 3 días". */
export function textoAlerta(producto) {
  const stock = estadoStock(producto);
  const caducidad = estadoCaducidad(producto);
  const partes = [];

  if (stock === "agotado") {
    partes.push(`Sin existencias. El mínimo es ${formatoCantidad(producto.stockMinimo)} ${producto.unidad}`);
  } else if (stock === "critico" || stock === "bajo") {
    partes.push(
      `Quedan ${formatoCantidad(producto.cantidad)} ${producto.unidad}, `
      + `el mínimo es ${formatoCantidad(producto.stockMinimo)}`
    );
  }

  const dias = diasParaVencer(producto);
  if (caducidad === "vencido") {
    partes.push(`Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`);
  } else if (caducidad === "porVencer") {
    partes.push(dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`);
  }

  return partes.join(" · ");
}

// ---------- Consultas ----------

export function listarProductos() {
  return db.getAll(COLECCION);
}

export function obtenerProducto(id) {
  return db.getById(COLECCION, id);
}

export function listarMovimientos() {
  return db.getAll(COLECCION_MOVIMIENTOS);
}

/** Productos que necesitan atención, de lo más urgente a lo menos. */
export function productosConAlerta(productos) {
  return productos
    .filter(producto => estadoStock(producto) !== "ok" || estadoCaducidad(producto) !== null)
    .sort((a, b) => prioridad(a) - prioridad(b));
}

const ORDENES = {
  alerta: (a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre),
  nombre: (a, b) => a.nombre.localeCompare(b.nombre),
  categoria: (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre),
  valor: (a, b) => valorProducto(b) - valorProducto(a),
  // Los productos sin caducidad se van al final: se les da una fecha lejana.
  caducidad: (a, b) => (a.caducidad || "9999-12-31").localeCompare(b.caducidad || "9999-12-31")
};

/** Buscador, categoría, estado y orden sobre los productos. */
export function filtrarProductos(productos, { texto = "", categoria = "todas", estado = "todos", orden = "alerta" } = {}) {
  const buscado = texto.trim().toLowerCase();

  const encontrados = productos.filter(producto => {
    if (categoria !== "todas" && producto.categoria !== categoria) return false;

    if (estado === "caducidad") {
      if (estadoCaducidad(producto) === null) return false;
    } else if (estado !== "todos" && estadoStock(producto) !== estado) {
      return false;
    }

    if (buscado) {
      const campos = [producto.nombre, producto.proveedor, producto.ubicacion, producto.categoria]
        .filter(Boolean).join(" ").toLowerCase();
      if (!campos.includes(buscado)) return false;
    }
    return true;
  });

  return [...encontrados].sort(ORDENES[orden] ?? ORDENES.alerta);
}

/**
 * El nombre es único en todo el inventario, porque Mermas agrupa por
 * nombre. localeCompare con "es" y sensitivity "base" compara como una
 * persona: "Limón" = "LIMON", pero "Piña" ≠ "Pina", porque la ñ es otra letra.
 */
export function productoConMismoNombre(nombre, idPropio = "") {
  const buscado = String(nombre).trim().replace(/\s+/g, " ");
  return listarProductos().find(producto =>
    String(producto.id) !== String(idPropio)
    && producto.nombre.localeCompare(buscado, "es", { sensitivity: "base" }) === 0
  );
}

// ---------- Operaciones ----------

/**
 * Calcula la existencia que deja un movimiento.
 * En un ajuste, la cantidad escrita es la existencia real contada.
 * Se redondea a dos decimales para que las sumas no arrastren colas binarias.
 */
export function existenciaResultante(anterior, tipo, cantidad) {
  if (tipo === "entrada") return Number((anterior + cantidad).toFixed(2));
  if (tipo === "salida") return Number((anterior - cantidad).toFixed(2));
  return Number(cantidad.toFixed(2));
}

/**
 * Registra un movimiento y deja la existencia del producto al día.
 *
 * Es la única puerta por la que cambia una existencia: Inventario,
 * Mermas y la merma rápida de Turnos pasan todos por aquí, así el
 * historial siempre cuadra con lo que hay en bodega.
 *
 * Las dos escrituras van en un lote: si la segunda falla, la primera se
 * deshace y el error se propaga sin informar un éxito que no ocurrió.
 */
export function aplicarMovimiento({ productoId, tipo, cantidad, motivo, nota = "", usuario, extra = {} }) {
  const producto = obtenerProducto(productoId);
  if (!producto) throw new Error("El producto ya no está en el inventario.");

  const numero = Number(cantidad);
  if (!Number.isFinite(numero) || numero < 0) throw new Error("La cantidad del movimiento no es válida.");
  if (tipo === "salida" && numero > Number(producto.cantidad)) {
    throw new Error(
      `Solo hay ${formatoCantidad(producto.cantidad)} ${producto.unidad} de ${producto.nombre}: no puedes sacar más.`
    );
  }

  const existenciaAnterior = Number(producto.cantidad);
  const existenciaNueva = existenciaResultante(existenciaAnterior, tipo, numero);

  return db.enLote([COLECCION, COLECCION_MOVIMIENTOS], () => {
    db.update(COLECCION, producto.id, {
      cantidad: existenciaNueva,
      actualizadoEn: new Date().toISOString()
    });

    const movimiento = db.create(COLECCION_MOVIMIENTOS, {
      productoId: producto.id,
      // El nombre y la unidad se copian: el producto puede eliminarse o
      // cambiar de unidad, y el historial debe seguir leyéndose igual.
      producto: producto.nombre,
      unidad: producto.unidad,
      tipo,
      cantidad: tipo === "ajuste" ? Math.abs(existenciaNueva - existenciaAnterior) : numero,
      existenciaAnterior,
      existenciaNueva,
      motivo,
      nota,
      usuario,
      fecha: new Date().toISOString(),
      ...extra
    });

    return { producto, existenciaAnterior, existenciaNueva, movimiento };
  });
}

/**
 * Crea un producto. Si nace con existencia, se registra como entrada
 * para que el historial cuadre desde el primer día.
 */
export function crearProducto({ datos, cantidad, usuario }) {
  const ahora = new Date().toISOString();
  return db.enLote([COLECCION, COLECCION_MOVIMIENTOS], () => {
    const creado = db.create(COLECCION, { ...datos, cantidad, creadoEn: ahora, actualizadoEn: ahora });
    if (cantidad > 0) {
      db.create(COLECCION_MOVIMIENTOS, {
        productoId: creado.id,
        producto: datos.nombre,
        unidad: datos.unidad,
        tipo: "entrada",
        cantidad,
        existenciaAnterior: 0,
        existenciaNueva: cantidad,
        motivo: "Compra a proveedor",
        nota: "Existencia inicial al crear el producto",
        usuario,
        fecha: ahora
      });
    }
    return creado;
  });
}

/** La existencia no se toca al editar: se cambia con un movimiento. */
export function actualizarProducto(id, datos) {
  return db.update(COLECCION, id, { ...datos, actualizadoEn: new Date().toISOString() });
}

/** Elimina el producto y sus movimientos, para no dejar historial huérfano. */
export function eliminarProducto(id) {
  return db.enLote([COLECCION, COLECCION_MOVIMIENTOS], () => {
    db.remove(COLECCION, id);
    db.getAll(COLECCION_MOVIMIENTOS)
      .filter(movimiento => String(movimiento.productoId) === String(id))
      .forEach(movimiento => db.remove(COLECCION_MOVIMIENTOS, movimiento.id));
  });
}

/** La fecha de hoy, para el mínimo del calendario de caducidad. */
export const hoy = fechaHoyLocal;
