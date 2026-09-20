/**
 * inventario.js — Lógica del módulo Inventario (vista de administrador).
 * Requiere: storage.js (DB), guard.js (Guard) y main.js cargados antes.
 *
 * Guarda el inventario en la colección "inventario" de localStorage.
 *
 * La vista de empleado (solo consultar y buscar) se agrega más adelante:
 * reutilizará esta misma colección sin tocar el modelo de datos.
 */

/* ============================================
   Setup de la plantilla compartida
   ============================================ */

const sesion = Guard.getSesion();

// Guard.requireRole('admin') en el <head> ya rebotó a quien no sea admin,
// pero por defensa cortamos si esto se ejecutara sin sesión.
if (!sesion) {
  throw new Error('No hay sesión activa.');
}

// main.js ya creó la navegación y el cierre de sesión comunes.
document.getElementById('rol-menu').textContent = `${sesion.nombre} · Dueño / Admin`;

/* ============================================
   Catálogos del inventario
   ============================================ */

// Secciones del inventario. Son la única fuente: más adelante alimentan
// tanto el formulario como los filtros, así no se desincronizan.
const CATEGORIAS = [
  'Carnes',
  'Verduras y frutas',
  'Lácteos',
  'Abarrotes',
  'Salsas y especias',
  'Bebidas',
  'Desechables'
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ============================================
   Datos de prueba
   ============================================ */

/**
 * Siembra productos de ejemplo la primera vez que se abre el módulo.
 * DB.seed() es idempotente: si ya hay productos, no duplica nada.
 */
function seedInventarioDePrueba() {
  DB.seed('inventario', [
    { nombre: 'Carne de res para asar', categoria: 'Carnes', unidad: 'kg', cantidad: 18, stockMinimo: 10, costoUnitario: 6.75, proveedor: 'Carnicería El Novillo', ubicacion: 'Congelador 1', caducidad: fechaRelativaISO(5) },
    { nombre: 'Carne de cerdo adobada', categoria: 'Carnes', unidad: 'kg', cantidad: 6, stockMinimo: 8, costoUnitario: 5.4, proveedor: 'Carnicería El Novillo', ubicacion: 'Congelador 1', caducidad: fechaRelativaISO(3) },
    { nombre: 'Pollo deshuesado', categoria: 'Carnes', unidad: 'kg', cantidad: 12, stockMinimo: 8, costoUnitario: 4.2, proveedor: 'Avícola San Juan', ubicacion: 'Congelador 2', caducidad: fechaRelativaISO(4) },
    { nombre: 'Tortilla de maíz', categoria: 'Abarrotes', unidad: 'docena', cantidad: 40, stockMinimo: 25, costoUnitario: 0.9, proveedor: 'Tortillería La Esperanza', ubicacion: 'Estante A', caducidad: fechaRelativaISO(2) },
    { nombre: 'Cebolla blanca', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 22, stockMinimo: 10, costoUnitario: 0.65, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: '' },
    { nombre: 'Tomate', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 9, stockMinimo: 12, costoUnitario: 0.8, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: fechaRelativaISO(6) },
    { nombre: 'Cilantro', categoria: 'Verduras y frutas', unidad: 'bolsa', cantidad: 0, stockMinimo: 4, costoUnitario: 1.1, proveedor: 'Mercado central', ubicacion: 'Refrigerador', caducidad: '' },
    { nombre: 'Limón', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 15, stockMinimo: 6, costoUnitario: 0.7, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: '' },
    { nombre: 'Queso duro rallado', categoria: 'Lácteos', unidad: 'kg', cantidad: 4, stockMinimo: 3, costoUnitario: 7.2, proveedor: 'Lácteos La Vaquita', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(12) },
    { nombre: 'Crema', categoria: 'Lácteos', unidad: 'L', cantidad: 5, stockMinimo: 4, costoUnitario: 3.5, proveedor: 'Lácteos La Vaquita', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(-1) },
    { nombre: 'Salsa roja casera', categoria: 'Salsas y especias', unidad: 'L', cantidad: 7, stockMinimo: 5, costoUnitario: 2.25, proveedor: 'Preparación propia', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(8) },
    { nombre: 'Aceite vegetal', categoria: 'Abarrotes', unidad: 'L', cantidad: 14, stockMinimo: 6, costoUnitario: 2.95, proveedor: 'Distribuidora Rivas', ubicacion: 'Estante A', caducidad: '' },
    { nombre: 'Refresco en lata', categoria: 'Bebidas', unidad: 'caja', cantidad: 8, stockMinimo: 5, costoUnitario: 9.5, proveedor: 'Distribuidora Rivas', ubicacion: 'Bodega', caducidad: '' },
    { nombre: 'Vaso desechable 12 oz', categoria: 'Desechables', unidad: 'bolsa', cantidad: 3, stockMinimo: 5, costoUnitario: 2.4, proveedor: 'Distribuidora Rivas', ubicacion: 'Bodega', caducidad: '' }
  ]);
}

/**
 * Devuelve la fecha ISO de hoy desplazada N días.
 * Sirve para que los datos de prueba siempre tengan caducidades
 * coherentes con el día en que se abre la página.
 */
function fechaRelativaISO(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatDateISO(d);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ============================================
   Helpers de formato
   ============================================ */

/**
 * Muestra la cantidad sin decimales inútiles: 18 en vez de 18.00,
 * pero 2.5 se conserva.
 */
function formatCantidad(n) {
  return String(Number(Number(n).toFixed(2)));
}

function formatDinero(n) {
  return `$${Number(n).toFixed(2)}`;
}

/**
 * Fecha corta legible. Ej: "24 sep".
 */
function formatFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** Valor en dinero de lo que hay de ese producto en bodega. */
function valorProducto(producto) {
  return Number(producto.cantidad) * Number(producto.costoUnitario);
}

/* ============================================
   Listado de productos
   ============================================ */

function renderLista() {
  const lista = document.getElementById('inv-lista');
  const contador = document.getElementById('inv-contador');
  lista.innerHTML = '';

  // Se ordena por el orden del catálogo de categorías y luego por nombre.
  const productos = DB.getAll('inventario')
    .slice()
    .sort((a, b) =>
      CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria) ||
      a.nombre.localeCompare(b.nombre)
    );

  contador.textContent = `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`;

  if (productos.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'inv-vacio';
    vacio.textContent = 'Todavía no hay productos registrados en el inventario.';
    lista.appendChild(vacio);
    return;
  }

  productos.forEach(producto => lista.appendChild(buildProductoFila(producto)));
}

function buildProductoFila(producto) {
  const fila = document.createElement('article');
  fila.className = 'inv-fila';

  const info = document.createElement('div');
  info.className = 'inv-fila-info';

  const nombre = document.createElement('p');
  nombre.className = 'inv-fila-nombre';
  nombre.textContent = producto.nombre;
  info.appendChild(nombre);

  const detalle = document.createElement('p');
  detalle.className = 'inv-fila-detalle';
  const partes = [producto.categoria, producto.proveedor, producto.ubicacion].filter(Boolean);
  if (producto.caducidad) partes.push(`vence el ${formatFechaCorta(producto.caducidad)}`);
  detalle.textContent = partes.join(' · ');
  info.appendChild(detalle);

  fila.appendChild(info);

  const meta = document.createElement('div');
  meta.className = 'inv-fila-meta';

  const cantidad = document.createElement('p');
  cantidad.className = 'inv-fila-cantidad';
  cantidad.textContent = `${formatCantidad(producto.cantidad)} ${producto.unidad}`;
  meta.appendChild(cantidad);

  const valor = document.createElement('p');
  valor.className = 'inv-fila-valor';
  valor.textContent = `${formatDinero(valorProducto(producto))} · mínimo ${formatCantidad(producto.stockMinimo)} ${producto.unidad}`;
  meta.appendChild(valor);

  fila.appendChild(meta);
  return fila;
}

/* ============================================
   Arranque del módulo
   ============================================ */

seedInventarioDePrueba();
renderLista();
